"""The agent loop: select context -> call LLM -> run tools -> repeat -> answer.
Write actions pause the loop until the student approves them."""
import json
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

    def chat(self, student_id: str, session_id: str, message: str) -> dict:
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

        # Context selection: only relevant memory + top-k policy chunks + recent history
        trace.memory_used = self.memory.get(student_id)
        trace.retrieved = self.retriever.search(safe_message)
        student = tools.get_student(student_id)
        system = build_system_prompt(student, trace.memory_used, trace.retrieved, date.today().strftime("%d %b %Y"))

        messages = [{"role": "system", "content": system}]
        messages += session["history"][-config.HISTORY_TURNS:]
        messages.append({"role": "user", "content": safe_message})
        return self._run(messages, student_id, session_id, trace)

    def resolve_approval(self, student_id: str, action_id: str, approved: bool) -> dict:
        paused = self.pending.pop(action_id, None)
        if not paused or paused["student_id"] != student_id:
            raise KeyError("Unknown or expired action")

        trace = Trace(student_id, f"[approval {action_id}: {'approved' if approved else 'rejected'}]")
        call, args = paused["call"], paused["args"]
        if approved:
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
        return self._run(messages, student_id, paused["session_id"], trace)

    def _run(self, messages: list[dict], student_id: str, session_id: str, trace: Trace) -> dict:
        for _ in range(config.MAX_AGENT_STEPS):
            reply, usage = self.llm.chat(messages, tools.TOOL_SCHEMAS)
            trace.add_usage(usage)
            messages.append(reply)

            if not reply.get("tool_calls"):
                return self._finish(reply["content"], messages, student_id, session_id, trace)

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

                outcome = self._execute(name, args, student_id, trace)
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(outcome)})

        answer = "Sorry, I couldn't complete that request. Please try rephrasing or raise a support ticket."
        return self._finish(answer, messages, student_id, session_id, trace)

    def _execute(self, name: str, args: dict, student_id: str, trace: Trace) -> dict:
        if name == "save_memory":
            saved, reason = self.memory.save(student_id, args.get("key", "other"), args.get("value", ""))
            outcome = {"ok": saved, "result": reason} if saved else {"ok": False, "error": f"Not stored ({reason})"}
            (trace.memory_saved if saved else trace.memory_blocked).append(
                {"key": args.get("key"), "value": args.get("value")} if saved else {"text": redact(args.get("value", "")), "reason": reason})
            self.audit.log(student_id, "memory_saved" if saved else "memory_blocked", {"key": args.get("key"), "reason": reason})
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

        summary = f"Create a {args.get('category', 'support')} ticket: \"{args.get('subject', 'Support request')}\""
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
