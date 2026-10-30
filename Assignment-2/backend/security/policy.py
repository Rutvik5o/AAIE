"""Permission layer: every tool call is checked here, in code, before it runs.
The LLM can only *ask* for a tool; this module decides whether it is allowed."""
from dataclasses import asdict, dataclass

READ_TOOLS = {"get_student_record", "get_fee_status", "get_scholarship_status"}
WRITE_TOOLS = {"update_contact_details", "create_support_ticket"}
MEMORY_TOOLS = {"save_memory"}

# The only fields a student may change through chat
EDITABLE_FIELDS = {"phone", "personal_email", "address", "emergency_contact"}

RULES = {
    "P1": "Identity comes from the login token, never from the chat message",
    "P2": "A student can only read or change their own record",
    "P3": "Only contact details can be changed; fees, scholarship, programme, status and name are protected",
    "P4": "Changing a record or creating a ticket needs the student's approval first",
    "P5": "Tools that are not on the allowed list are blocked",
    "M1": "Passwords, OTPs, card numbers, health details and temporary feelings are never saved to memory",
}


@dataclass
class Decision:
    allowed: bool
    needs_approval: bool
    rule: str
    reason: str
    actor: str
    target: str

    def to_dict(self) -> dict:
        return asdict(self)


def authorize(actor: str, tool: str, args: dict) -> Decision:
    """actor = the signed-in student (from the token). target = whose data the call touches."""
    target = str(args.get("student_id") or actor).strip().upper()

    def decide(allowed, rule, reason, needs_approval=False):
        return Decision(allowed, needs_approval, rule, reason, actor, target)

    if tool not in READ_TOOLS | WRITE_TOOLS | MEMORY_TOOLS:
        return decide(False, "P5", f"'{tool}' is not an allowed tool")
    if target != actor:
        return decide(False, "P2", f"{actor} is not allowed to access {target}'s record")
    if tool == "update_contact_details" and args.get("field") not in EDITABLE_FIELDS:
        return decide(False, "P3", f"'{args.get('field')}' is a protected field and cannot be changed in chat")
    if tool in WRITE_TOOLS:
        return decide(True, "P4", "Own record; waits for the student's approval", needs_approval=True)
    return decide(True, "P2", "Own record")
