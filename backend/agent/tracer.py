"""Collects everything that happened during one agent run and writes it to a JSONL log."""
import json
import time
from datetime import datetime

from agent.memory import redact_all


class Trace:
    def __init__(self, student_id: str, question: str):
        self.student_id = student_id
        self.question = question
        self.start = time.perf_counter()
        self.steps = []
        self.retrieved = []
        self.memory_used = []
        self.memory_saved = []
        self.memory_blocked = []
        self.approvals = []
        self.tokens = {"input": 0, "output": 0}
        self.llm_calls = 0
        self.first_token_ms = None

    def mark_first_token(self) -> None:
        if self.first_token_ms is None:
            self.first_token_ms = round((time.perf_counter() - self.start) * 1000)

    def add_usage(self, usage: dict) -> None:
        self.llm_calls += 1
        self.tokens["input"] += usage["input"]
        self.tokens["output"] += usage["output"]

    def add_step(self, tool: str, args: dict, outcome: dict) -> None:
        self.steps.append({"tool": tool, "args": args, "result": outcome.get("result", outcome.get("error")), "ok": outcome["ok"]})

    def to_dict(self) -> dict:
        return {
            "steps": self.steps,
            "retrieved": self.retrieved,
            "memory_used": self.memory_used,
            "memory_saved": self.memory_saved,
            "memory_blocked": self.memory_blocked,
            "approvals": self.approvals,
            "latency_ms": round((time.perf_counter() - self.start) * 1000),
            "first_token_ms": self.first_token_ms,
            "tokens": self.tokens,
            "llm_calls": self.llm_calls,
        }

    def save(self, path, answer: str) -> None:
        record = {"ts": datetime.now().isoformat(timespec="seconds"), "student_id": self.student_id,
                  "question": self.question, "answer": answer, **self.to_dict()}
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(redact_all(record)) + "\n")
