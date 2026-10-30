"""The agent loop: select context -> call LLM -> check permission -> run tools -> repeat -> answer.
Every tool call is authorised by security/policy.py. Write actions pause the loop
until the student approves them; a rejected or expired action is never executed."""
import json
import re
import secrets
import time
from datetime import date, datetime, timedelta

import config
from agent import tools
from agent.llm import LLM
from agent.memory import MemoryStore, check, redact
from agent.prompts import build_system_prompt
from agent.retriever import Retriever
from agent.tracer import Trace
from security import policy

FIELD_LABELS = {"phone": "phone number", "personal_email": "personal email", "address": "address",
                "emergency_contact": "emergency contact"}


class Agent:
    def __init__(self, audit, memory_path=config.MEMORY_FILE, trace_path=config.TRACE_FILE):
        self.llm = LLM()
        self.retriever = Retriever()
        self.memory = MemoryStore(memory_path)
        self.audit = audit
        self.trace_path = trace_path
        self.sessions = {}   # session_id -> {"student_id", "history"}
        self.pending = {}    # action_id -> paused run waiting for approval

    def new_session(self, student_id: str) -> str:
        session_id = secrets.token_hex(6)
        self.sessions[session_id] = {"student_id": student_id, "history": []}
        return session_id

    def chat(self, student_id: str, session_id: str, message: str, emit=None) -> dict:
        """emit(event, data) is optional; when given, progress and answer tokens are streamed through it."""
        session = self.sessions.get(session_id)
        if not session or session["student_id"] != student_id:
            session_id = self.new_session(student_id)
            session = self.sessions[session_id]

        message = message.strip()
        trace = Trace(student_id, redact(message))

        # Sensitive or temporary statements are never stored, and are masked before reaching the model
        reason = check(message)
        if reason:
            trace.sensitive_turn = reason  # nothing from this turn may be saved to memory
            trace.memory_blocked.append({"text": redact(message)[:100], "reason": reason})
            self.audit.record(student_id, "save_memory", permission="denied", rule="M1", result="blocked",
                              details={"reason": reason})
        safe_message = redact(message)

        # Requests that name another student's ID are denied and audited even if the model never calls a tool
        for other in sorted({i.upper() for i in re.findall(r"\bS\d{4}\b", message, re.IGNORECASE)} - {student_id}):
            decision = policy.Decision(False, False, "P2", f"{student_id} is not allowed to access {other}'s record",
                                       student_id, other)
            trace.permissions.append({"tool": "(chat request)", **decision.to_dict()})
            self.audit.record(student_id, "read_other_student_record", target=other, permission="denied",
                              rule="P2", result="blocked", details={"message": safe_message[:120]})

        # Context selection: only relevant memory + top-k policy chunks + recent history
        if emit:
            emit("status", {"text": "Searching the student handbook"})
        trace.memory_used = self.memory.get(student_id)
        trace.retrieved = self.retriever.search(safe_message)
        student = tools.get_student(student_id)
        system = build_system_prompt(student, trace.memory_used, trace.retrieved, date.today().strftime("%d %b %Y"))

        messages = [{"role": "system", "content": system}]
        messages += session["history"][-config.HISTORY_TURNS:]
        messages.append({"role": "user", "content": safe_message})
        return self._run(messages, student_id, session_id, trace, emit)

    def resolve_approval(self, student_id: str, action_id: str, approved: bool, emit=None) -> dict:
        paused = self.pending.pop(action_id, None)
        if not paused or paused["student_id"] != student_id:
            raise KeyError("Unknown or expired action")

        call, args = paused["call"], paused["args"]
        name = call["function"]["name"]
        expired = time.time() > paused["expires_at"]
        decision = "expired" if expired else "approved" if approved else "rejected"
        trace = Trace(student_id, f"[approval {action_id}: {decision}]")

        allowed = True
        if decision == "approved":
            # Check permission again at the moment of execution (defence in depth)
            permission = policy.authorize(student_id, name, args)
            trace.permissions.append({"tool": name, **permission.to_dict()})
            allowed = permission.allowed
            if not allowed:
                outcome = {"ok": False, "error": f"Permission denied ({permission.rule}): {permission.reason}"}
                result = "blocked"
            else:
                if emit:
                    emit("status", {"text": f"Running {name}", "tool": name})
                outcome = tools.run_tool(name, dict(args), student_id)
                trace.add_step(name, args, outcome)
                result = "success" if outcome["ok"] else "failed"
        else:
            # Rejected or expired: the tool is NOT executed
            why = "rejected this action" if decision == "rejected" else "did not approve in time; the request expired"
            outcome = {"ok": False, "error": f"The student {why}. It was not executed. Do not retry it."}
            result = "not_executed"

        self.audit.record(student_id, name, permission="allowed" if allowed else "denied", rule="P4",
                          approval=decision, result=result,
                          details={"action_id": action_id, "args": args,
                                   "outcome": outcome.get("result") if outcome["ok"] else outcome.get("error")})
        trace.approvals.append({"action_id": action_id, "tool": name, "decision": decision, "result": result})

        messages = paused["messages"] + [{"role": "tool", "tool_call_id": call["id"], "content": json.dumps(outcome)}]
        return self._run(messages, student_id, paused["session_id"], trace, emit)

    def _run(self, messages: list[dict], student_id: str, session_id: str, trace: Trace, emit=None) -> dict:
        def on_token(text):
            trace.mark_first_token()
            emit("token", {"text": text})

        for _ in range(config.MAX_AGENT_STEPS):
            if emit:
                emit("status", {"text": "Thinking"})
            waited = self.llm.rate_limit_wait_s
            reply, usage = self.llm.chat(messages, tools.TOOL_SCHEMAS, on_token if emit else None)
            trace.add_usage(usage)
            trace.rate_limit_wait_ms += round((self.llm.rate_limit_wait_s - waited) * 1000)
            messages.append(reply)

            if not reply.get("tool_calls"):
                return self._finish(reply["content"], messages, student_id, session_id, trace)
            if emit and reply["content"]:
                emit("reset", {})  # text streamed before a tool call is not the final answer

            # Run read tools first; a write action that needs approval pauses the loop
            calls = sorted(reply["tool_calls"], key=lambda c: c["function"]["name"] in policy.WRITE_TOOLS)
            for i, call in enumerate(calls):
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"]["arguments"] or "{}")
                except json.JSONDecodeError:
                    args = {}

                # Permission check in code: the model's request is only a request
                permission = policy.authorize(student_id, name, args)
                trace.permissions.append({"tool": name, **permission.to_dict()})
                if not permission.allowed:
                    outcome = self._deny(name, args, permission, student_id, trace)
                elif permission.needs_approval:
                    for extra in calls[i + 1:]:  # only one approval at a time
                        skipped = {"ok": False, "error": "Skipped: only one action can be approved at a time."}
                        messages.append({"role": "tool", "tool_call_id": extra["id"], "content": json.dumps(skipped)})
                    return self._request_approval(call, args, messages, student_id, session_id, trace)
                else:
                    if emit:
                        emit("status", {"text": f"Calling {name}", "tool": name})
                    outcome = self._execute(name, args, student_id, trace)
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(outcome)})

        answer = "Sorry, I couldn't complete that request. Please try rephrasing or raise a support ticket."
        return self._finish(answer, messages, student_id, session_id, trace)

    def _deny(self, name, args, permission, student_id, trace) -> dict:
        outcome = {"ok": False, "denied": True, "error": f"Permission denied ({permission.rule}): {permission.reason}"}
        trace.add_step(name, args, outcome)
        self.audit.record(student_id, name, target=permission.target, permission="denied", rule=permission.rule,
                          result="blocked", details={"args": args, "reason": permission.reason})
        return outcome

    def _execute(self, name: str, args: dict, student_id: str, trace: Trace) -> dict:
        if name == "save_memory":
            results, logged_facts = [], []
            for fact in args.get("facts", []):
                key, value = fact.get("key", "other"), fact.get("value", "")
                saved, reason = (False, trace.sensitive_turn) if trace.sensitive_turn else self.memory.save(student_id, key, value)
                results.append({"key": key, "stored": saved, "reason": reason})
                # A blocked fact is sensitive by definition, so its value is never written to any log
                logged_facts.append({"key": key, "value": value if saved else "[WITHHELD]"})
                if saved:
                    trace.memory_saved.append({"key": key, "value": value})
                else:
                    trace.memory_blocked.append({"text": f"{key}: [WITHHELD]", "reason": reason})
                self.audit.record(student_id, "save_memory", permission="allowed" if saved else "denied",
                                  rule=None if saved else "M1", result="success" if saved else "blocked",
                                  details={"key": key, "reason": reason})
            outcome = {"ok": any(r["stored"] for r in results), "result": results}
            args = {"facts": logged_facts}
        else:
            outcome = tools.run_tool(name, dict(args), student_id)
            self.audit.record(student_id, name, rule="P2", result="success" if outcome["ok"] else "failed",
                              details={"args": args, "error": outcome.get("error")})
        trace.add_step(name, args, outcome)
        return outcome

    def _request_approval(self, call, args, messages, student_id, session_id, trace) -> dict:
        action_id = secrets.token_hex(4)
        name = call["function"]["name"]
        expires = datetime.now() + timedelta(minutes=config.APPROVAL_TTL_MINUTES)
        self.pending[action_id] = {"student_id": student_id, "session_id": session_id, "call": call, "args": args,
                                   "messages": messages, "expires_at": expires.timestamp()}
        trace.approvals.append({"action_id": action_id, "tool": name, "decision": "pending", "result": "waiting"})
        self.audit.record(student_id, name, rule="P4", approval="pending", result="waiting",
                          details={"action_id": action_id, "args": args})

        change = None
        if name == "update_contact_details":
            field = args.get("field", "")
            change = {"field": field, "label": FIELD_LABELS.get(field, field),
                      "old_value": tools.get_student(student_id)["contact"].get(field), "new_value": args.get("new_value", "")}
            summary = f"Change your {change['label']} to \"{change['new_value']}\""
        else:
            summary = f"Create a support ticket ({args.get('category', 'other')}): \"{args.get('subject', 'Support request')}\""
        answer = f"I'd like to **{summary[0].lower() + summary[1:]}**. This changes your record, so it needs your approval below."
        result = self._finish(answer, messages, student_id, session_id, trace, keep_history=False)
        result["pending_action"] = {"action_id": action_id, "tool": name, "args": args, "summary": summary, "change": change,
                                    "rule": "P4", "rule_text": policy.RULES["P4"],
                                    "expires_at": expires.isoformat(timespec="seconds")}
        return result

    def _finish(self, answer, messages, student_id, session_id, trace, keep_history=True) -> dict:
        if keep_history:
            question = next(m["content"] for m in reversed(messages) if m["role"] == "user")
            history = self.sessions[session_id]["history"]
            history += [{"role": "user", "content": question}, {"role": "assistant", "content": answer}]
        trace.save(self.trace_path, answer)
        return {"answer": answer, "session_id": session_id, "trace": trace.to_dict()}
