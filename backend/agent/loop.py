"""The agent loop: select context -> call LLM -> run tools -> repeat -> answer.
Write actions pause the loop until the student approves them."""
import json
import re
import secrets
from datetime import date

import config
from agent import tools
from agent.llm import LLM
from agent.memory import MemoryStore, check, redact
from agent.prompts import build_system_prompt
from agent.retriever import Retriever
from agent.tracer import Trace


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
            trace.memory_blocked.append({"text": redact(message)[:100], "reason": reason})
            self.audit.log(student_id, "memory_blocked", {"reason": reason})
        safe_message = redact(message)

        # Authorisation: requests that name another student's ID are recorded for audit
        other_ids = {i.upper() for i in re.findall(r"\bS\d{4}\b", message, re.IGNORECASE)} - {student_id}
        if other_ids:
            self.audit.log(student_id, "access_denied", {"requested": sorted(other_ids)})

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

        trace = Trace(student_id, f"[approval {action_id}: {'approved' if approved else 'rejected'}]")
        call, args = paused["call"], paused["args"]
        if approved:
            if emit:
                emit("status", {"text": f"Running {call['function']['name']}", "tool": call["function"]["name"]})
            outcome = tools.run_tool(call["function"]["name"], dict(args), student_id)
            trace.add_step(call["function"]["name"], args, outcome)
            self.audit.log(student_id, "approval_granted", {"action_id": action_id, "tool": call["function"]["name"]})
            self.audit.log(student_id, "tool_call" if outcome["ok"] else "tool_error",
                           {"tool": call["function"]["name"], "ok": outcome["ok"]})
        else:
            outcome = {"ok": False, "error": "The student rejected this action. Do not retry it."}
            self.audit.log(student_id, "approval_rejected", {"action_id": action_id, "tool": call["function"]["name"]})
        trace.approvals.append({"action_id": action_id, "tool": call["function"]["name"],
                                "decision": "approved" if approved else "rejected"})

        messages = paused["messages"] + [{"role": "tool", "tool_call_id": call["id"], "content": json.dumps(outcome)}]
        return self._run(messages, student_id, paused["session_id"], trace, emit)

    def _run(self, messages: list[dict], student_id: str, session_id: str, trace: Trace, emit=None) -> dict:
        def on_token(text):
            trace.mark_first_token()
            emit("token", {"text": text})

        for _ in range(config.MAX_AGENT_STEPS):
            if emit:
                emit("status", {"text": "Thinking"})
            reply, usage = self.llm.chat(messages, tools.TOOL_SCHEMAS, on_token if emit else None)
            trace.add_usage(usage)
            messages.append(reply)

            if not reply.get("tool_calls"):
                return self._finish(reply["content"], messages, student_id, session_id, trace)
            if emit and reply["content"]:
                emit("reset", {})  # text streamed before a tool call is not the final answer

            # Run safe tools first; a tool needing approval pauses the loop
            calls = sorted(reply["tool_calls"], key=lambda c: c["function"]["name"] in config.TOOLS_NEEDING_APPROVAL)
            for i, call in enumerate(calls):
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"]["arguments"] or "{}")
                except json.JSONDecodeError:
                    args = {}

                if name in config.TOOLS_NEEDING_APPROVAL:
                    for extra in calls[i + 1:]:  # only one approval at a time
                        skipped = {"ok": False, "error": "Skipped: only one action can be approved at a time."}
                        messages.append({"role": "tool", "tool_call_id": extra["id"], "content": json.dumps(skipped)})
                    return self._request_approval(call, args, messages, student_id, session_id, trace)

                if emit:
                    emit("status", {"text": f"Calling {name}", "tool": name})
                outcome = self._execute(name, args, student_id, trace)
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(outcome)})

        answer = "Sorry, I couldn't complete that request. Please try rephrasing or raise a support ticket."
        return self._finish(answer, messages, student_id, session_id, trace)

    def _execute(self, name: str, args: dict, student_id: str, trace: Trace) -> dict:
        if name == "save_memory":
            results = []
            for fact in args.get("facts", []):
                key, value = fact.get("key", "other"), fact.get("value", "")
                saved, reason = self.memory.save(student_id, key, value)
                results.append({"key": key, "stored": saved, "reason": reason})
                if saved:
                    trace.memory_saved.append({"key": key, "value": value})
                else:
                    trace.memory_blocked.append({"text": redact(value), "reason": reason})
                self.audit.log(student_id, "memory_saved" if saved else "memory_blocked", {"key": key, "reason": reason})
            outcome = {"ok": any(r["stored"] for r in results), "result": results}
        else:
            outcome = tools.run_tool(name, dict(args), student_id)
            event = "access_denied" if outcome.get("denied") else "tool_call" if outcome["ok"] else "tool_error"
            self.audit.log(student_id, event, {"tool": name, "args": args, "error": outcome.get("error")})
        trace.add_step(name, args, outcome)
        return outcome

    def _request_approval(self, call, args, messages, student_id, session_id, trace) -> dict:
        action_id = secrets.token_hex(4)
        self.pending[action_id] = {"student_id": student_id, "session_id": session_id,
                                   "call": call, "args": args, "messages": messages}
        trace.approvals.append({"action_id": action_id, "tool": call["function"]["name"], "decision": "pending"})
        self.audit.log(student_id, "approval_requested", {"action_id": action_id, "tool": call["function"]["name"], "args": args})

        summary = f"Create a support ticket ({args.get('category', 'other')}): \"{args.get('subject', 'Support request')}\""
        answer = f"I'd like to **{summary[0].lower() + summary[1:]}**. Please approve or reject this action below."
        result = self._finish(answer, messages, student_id, session_id, trace, keep_history=False)
        result["pending_action"] = {"action_id": action_id, "tool": call["function"]["name"], "args": args, "summary": summary}
        return result

    def _finish(self, answer, messages, student_id, session_id, trace, keep_history=True) -> dict:
        if keep_history:
            question = next(m["content"] for m in reversed(messages) if m["role"] == "user")
            history = self.sessions[session_id]["history"]
            history += [{"role": "user", "content": question}, {"role": "assistant", "content": answer}]
        trace.save(self.trace_path, answer)
        return {"answer": answer, "session_id": session_id, "trace": trace.to_dict()}
