"""Tools the agent can call. The logged-in student's ID is always injected by
the server, so the model can never read another student's data."""
import json
from datetime import datetime

import config

SLA = {"finance": "2 working days", "academic": "3 working days", "it": "1 working day", "other": "3 working days"}


class ToolError(Exception):
    pass


def _students() -> dict:
    data = json.loads(config.STUDENTS_FILE.read_text(encoding="utf-8"))
    return {s["student_id"]: s for s in data["students"]}


def get_student(student_id: str) -> dict:
    student = _students().get(student_id)
    if not student:
        raise ToolError(f"No record found for student {student_id}")
    return student


def get_student_record(student_id: str) -> dict:
    s = get_student(student_id)
    keys = ["student_id", "name", "programme", "year", "email", "status", "courses"]
    return {k: s.get(k) for k in keys}


def get_fee_status(student_id: str) -> dict:
    fees = get_student(student_id)["fees"]
    if fees.get("system_unavailable"):
        raise ToolError("Fee system is temporarily unavailable. Please try again later.")
    return {k: v for k, v in fees.items() if k != "system_unavailable"}


def get_scholarship_status(student_id: str) -> dict:
    return get_student(student_id)["scholarship"]


def create_support_ticket(student_id: str, category: str, subject: str, description: str, priority="normal") -> dict:
    data = json.loads(config.TICKETS_FILE.read_text(encoding="utf-8"))
    ticket = {
        "ticket_id": f"TKT-{len(data['tickets']) + 1:04d}",
        "student_id": student_id,
        "category": category,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "open",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "expected_response": "4 hours" if priority == "urgent" else SLA.get(category, SLA["other"]),
    }
    data["tickets"].append(ticket)
    config.TICKETS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return ticket


DATA_TOOLS = {
    "get_student_record": get_student_record,
    "get_fee_status": get_fee_status,
    "get_scholarship_status": get_scholarship_status,
    "create_support_ticket": create_support_ticket,
}


def run_tool(name: str, args: dict, student_id: str) -> dict:
    """Run a data tool for the logged-in student. Returns {"ok", "result"|"error"}."""
    requested = args.pop("student_id", None)
    if requested and requested.upper() != student_id:
        return {"ok": False, "error": "Access denied: you can only view your own records.", "denied": True}
    if name not in DATA_TOOLS:
        return {"ok": False, "error": f"Unknown tool '{name}'"}
    try:
        return {"ok": True, "result": DATA_TOOLS[name](student_id, **args)}
    except ToolError as e:
        return {"ok": False, "error": str(e)}
    except TypeError as e:
        return {"ok": False, "error": f"Bad arguments: {e}"}


def _schema(name, description, properties=None, required=None):
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties or {}, "required": required or []},
        },
    }


_optional_id = {"student_id": {"type": "string", "description": "Only if the student names an ID explicitly"}}

TOOL_SCHEMAS = [
    _schema("get_student_record", "Get the logged-in student's profile: programme, year, email, enrolled courses.", _optional_id),
    _schema("get_fee_status", "Get the logged-in student's fee status: total, paid, amount due, due date, late fee.", _optional_id),
    _schema("get_scholarship_status", "Get the logged-in student's scholarship name, status and amount.", _optional_id),
    _schema(
        "create_support_ticket",
        "Create a support request for the student. Needs the student's approval before it runs.",
        {
            "category": {"type": "string", "enum": ["finance", "academic", "it", "other"]},
            "subject": {"type": "string", "description": "Short title"},
            "description": {"type": "string", "description": "What the problem is"},
            "priority": {"type": "string", "enum": ["normal", "urgent"]},
        },
        ["category", "subject", "description"],
    ),
    _schema(
        "save_memory",
        "Remember a useful long-term fact about the student for future sessions (programme, contact "
        "preference, topic of interest). Never use for passwords, card numbers, OTPs, health or temporary feelings.",
        {
            "facts": {
                "type": "array",
                "description": "One item per fact",
                "items": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string", "enum": ["programme", "contact_preference", "preference", "topic_of_interest", "other"]},
                        "value": {"type": "string", "description": "The fact in a few words"},
                    },
                    "required": ["key", "value"],
                },
            }
        },
        ["facts"],
    ),
]
