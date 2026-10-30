"""Long-term memory per student, with a filter that refuses to store
sensitive or temporary information."""
import json
import re
from datetime import datetime

SENSITIVE = [
    (r"\b\d(?:[ -]?\d){12,18}\b", "sensitive: payment card number"),
    (r"\b\d{4}\s?\d{4}\s?\d{4}\b", "sensitive: ID number"),
    (r"\b(password|passcode|pin|otp|cvv)\b", "sensitive: credentials"),
    (r"\b(bank account|ifsc|account number)\b", "sensitive: bank details"),
    (r"\b(diagnos\w*|medication|illness|disease|therapy|depress\w*)\b", "sensitive: health information"),
]
TEMPORARY = [
    (r"\b(today|tonight|right now|this morning|at the moment)\b", "temporary: short-lived context"),
    (r"\b(feeling|stressed|anxious|tired|upset|angry|sad)\b", "temporary: emotional state"),
]

CARD = re.compile(SENSITIVE[0][0])
OTP = re.compile(r"\b(otp|pin|password|cvv)(\s*(?:is|:)\s*)(\S+)", re.IGNORECASE)


def check(text: str) -> str | None:
    """Return the reason a text must not be stored, or None if it is safe."""
    for pattern, reason in SENSITIVE + TEMPORARY:
        if re.search(pattern, text, re.IGNORECASE):
            return reason
    return None


def redact(text: str) -> str:
    """Mask card numbers and secrets before anything is written to logs."""
    text = CARD.sub("[REDACTED-NUMBER]", text)
    return OTP.sub(lambda m: m.group(1) + m.group(2) + "[REDACTED]", text)


def redact_all(value):
    """Redact every string inside a dict/list (used for logs)."""
    if isinstance(value, str):
        return redact(value)
    if isinstance(value, dict):
        return {k: redact_all(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_all(v) for v in value]
    return value


class MemoryStore:
    def __init__(self, path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("{}", encoding="utf-8")

    def _load(self) -> dict:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, data: dict) -> None:
        self.path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def get(self, student_id: str) -> list[dict]:
        return self._load().get(student_id, [])

    def save(self, student_id: str, key: str, value: str) -> tuple[bool, str]:
        reason = check(f"{key} {value}")
        if reason:
            return False, reason
        data = self._load()
        facts = [f for f in data.get(student_id, []) if f["key"] != key]
        facts.append({"key": key, "value": value, "saved_at": datetime.now().isoformat(timespec="seconds")})
        data[student_id] = facts
        self._write(data)
        return True, "saved"

    def clear(self, student_id: str) -> None:
        data = self._load()
        data.pop(student_id, None)
        self._write(data)
