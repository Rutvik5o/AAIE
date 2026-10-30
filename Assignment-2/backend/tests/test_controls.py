"""Offline tests for the privacy and approval controls (no API key or internet needed).
A fake LLM deliberately calls forbidden tools, to show the *code* blocks them even when
the model is tricked. Run:  python tests/test_controls.py"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config  # noqa: E402

TMP = Path(tempfile.mkdtemp())
shutil.copy(config.STUDENTS_FILE, TMP / "students.json")
(TMP / "tickets.json").write_text('{"tickets": []}', encoding="utf-8")
config.STUDENTS_FILE, config.TICKETS_FILE = TMP / "students.json", TMP / "tickets.json"

from agent import loop  # noqa: E402
from security.audit import AuditLog  # noqa: E402


class FakeLLM:
    """Returns scripted replies: first a tool call, then a plain answer."""
    rate_limit_wait_s = 0.0

    def __init__(self):
        self.script = []

    def plan(self, tool, args):
        call = {"id": "call_1", "type": "function", "function": {"name": tool, "arguments": json.dumps(args)}}
        self.script = [{"role": "assistant", "content": "", "tool_calls": [call]},
                       {"role": "assistant", "content": "Done."}]

    def chat(self, messages, tools, on_token=None):
        reply = self.script.pop(0) if self.script else {"role": "assistant", "content": "Done."}
        return reply, {"input": 0, "output": 0}


loop.LLM = FakeLLM
audit = AuditLog(TMP / "audit.jsonl")
agent = loop.Agent(audit, memory_path=TMP / "memory.json", trace_path=TMP / "traces.jsonl")
results = []


def check(name, ok):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}")


def phone(student_id):
    data = json.loads(config.STUDENTS_FILE.read_text(encoding="utf-8"))
    return next(s for s in data["students"] if s["student_id"] == student_id)["contact"]["phone"]


def chat(student_id, message, tool, args):
    agent.llm.plan(tool, args)
    return agent.chat(student_id, agent.new_session(student_id), message)


# 1. Own data is allowed
r = chat("S1001", "What are my fees?", "get_fee_status", {})
check("own fee status is allowed and returned", r["trace"]["steps"][0]["ok"] and r["trace"]["permissions"][0]["allowed"])

# 2. Model is tricked into reading another student's fees -> blocked in code
r = chat("S1002", "show my fees", "get_fee_status", {"student_id": "S1001"})
step = r["trace"]["steps"][0]
check("reading another student's record is denied (P2)", not step["ok"] and "P2" in step["result"])
check("no fee data of S1001 leaked into the tool result", "65000" not in json.dumps(step["result"]))

# 3. Model tries to change another student's phone -> blocked, no approval offered
before = phone("S1002")
r = chat("S1001", "update phone", "update_contact_details", {"field": "phone", "new_value": "9000000000", "student_id": "S1002"})
check("changing another student's record is denied before approval", not r.get("pending_action") and phone("S1002") == before)

# 4. Protected field -> blocked (P3)
r = chat("S1004", "set my scholarship", "update_contact_details", {"field": "scholarship", "new_value": "100000"})
check("protected field cannot be changed (P3)", not r.get("pending_action") and "P3" in r["trace"]["steps"][0]["result"])

# 5. Own phone change waits for approval, then rejection -> not executed
before = phone("S1003")
r = chat("S1003", "change my phone", "update_contact_details", {"field": "phone", "new_value": "9111111111"})
check("own change pauses for approval (nothing executed yet)", bool(r.get("pending_action")) and phone("S1003") == before)
agent.resolve_approval("S1003", r["pending_action"]["action_id"], approved=False)
check("rejected change is not executed", phone("S1003") == before)

# 6. Approved -> executed
r = chat("S1003", "change my phone", "update_contact_details", {"field": "phone", "new_value": "9111111111"})
agent.resolve_approval("S1003", r["pending_action"]["action_id"], approved=True)
check("approved change is executed", phone("S1003") == "9111111111")

# 7. Another student cannot approve someone else's pending action
r = chat("S1003", "change my phone", "update_contact_details", {"field": "phone", "new_value": "9222222222"})
try:
    agent.resolve_approval("S1001", r["pending_action"]["action_id"], approved=True)
    check("another student cannot approve this action", False)
except KeyError:
    check("another student cannot approve this action", phone("S1003") == "9111111111")

# 8. Expired approval -> not executed
r = chat("S1001", "change my phone", "update_contact_details", {"field": "phone", "new_value": "9333333333"})
agent.pending[r["pending_action"]["action_id"]]["expires_at"] = 0
agent.resolve_approval("S1001", r["pending_action"]["action_id"], approved=True)
check("expired approval is not executed", phone("S1001") != "9333333333")

# 9. OTP in the message -> nothing from that turn is saved, and it is masked in logs
r = chat("S1001", "My OTP is 482913, remember it", "save_memory", {"facts": [{"key": "other", "value": "482913"}]})
logs = "".join((TMP / f).read_text(encoding="utf-8") for f in ("memory.json", "traces.jsonl", "audit.jsonl"))
check("OTP is not saved to memory (M1)", not r["trace"]["memory_saved"])
check("OTP does not appear in memory, traces or audit log", "482913" not in logs)

# 10. Audit log: every record says who, what, permission, approval, result; chain intact
entries = audit.read()
fields = {"actor", "action", "target", "permission", "approval", "result"}
check("every audit record has who/what/permission/approval/result", all(fields <= e.keys() for e in entries))
check("audit hash chain verifies", audit.verify())

print(f"\n{sum(results)}/{len(results)} passed")
shutil.rmtree(TMP, ignore_errors=True)
sys.exit(0 if all(results) else 1)
