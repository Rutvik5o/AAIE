"""Append-only audit log. Each entry stores the hash of the previous entry,
so editing or deleting any past line breaks the chain and is detected.

Every entry answers the same questions:
  who (actor) · what (action, target) · was it allowed (permission, rule)
  · was it approved (approval) · what happened (result)"""
import hashlib
import json
from datetime import datetime

from agent.memory import redact_all

GENESIS = "0" * 64


def _hash(entry: dict) -> str:
    body = {k: v for k, v in entry.items() if k != "hash"}
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


class AuditLog:
    def __init__(self, path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.touch(exist_ok=True)

    def read(self) -> list[dict]:
        lines = self.path.read_text(encoding="utf-8").splitlines()
        return [json.loads(line) for line in lines if line.strip()]

    def record(self, actor: str, action: str, *, target: str | None = None, permission: str = "allowed",
               rule: str | None = None, approval: str = "not_required", result: str = "success",
               details: dict | None = None) -> dict:
        """permission: allowed | denied   approval: not_required | pending | approved | rejected | expired
        result: success | failed | blocked | waiting | not_executed"""
        events = self.read()
        entry = {
            "seq": len(events) + 1,
            "ts": datetime.now().isoformat(timespec="seconds"),
            "actor": actor,
            "action": action,
            "target": target or actor,
            "permission": permission,
            "rule": rule,
            "approval": approval,
            "result": result,
            "details": redact_all(details or {}),
            "prev_hash": events[-1]["hash"] if events else GENESIS,
        }
        entry["hash"] = _hash(entry)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
        return entry

    def verify(self) -> bool:
        prev = GENESIS
        for entry in self.read():
            if entry["prev_hash"] != prev or _hash(entry) != entry["hash"]:
                return False
            prev = entry["hash"]
        return True
