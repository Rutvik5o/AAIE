"""Runs the test questions through the agent and writes an evaluation table.
Run:  python evaluate.py"""
import json
import time

import config
from agent.loop import Agent
from security.audit import AuditLog

TESTS_FILE = config.BASE_DIR / "tests" / "test_questions.json"
OUT = config.RESULTS_DIR


def run_case(agent: Agent, case: dict, session_id: str) -> dict:
    result = agent.chat(case["student_id"], session_id, case["question"])
    trace = result["trace"]
    # Approval step: auto-approve during evaluation so the write action completes
    if result.get("pending_action"):
        approved = agent.resolve_approval(case["student_id"], result["pending_action"]["action_id"], True)
        extra = approved["trace"]
        trace["steps"] += extra["steps"]
        trace["approvals"] += extra["approvals"]
        trace["latency_ms"] += extra["latency_ms"]
        trace["llm_calls"] += extra["llm_calls"]
        for k in ("input", "output"):
            trace["tokens"][k] += extra["tokens"][k]
        result["answer"] += "\n\n[approved] " + approved["answer"]
    return result


def normalise(text: str) -> str:
    """Lowercase and replace unicode dashes/spaces the model often uses (e.g. 'CC‑2')."""
    for ch in "‐‑‒–—−":
        text = text.replace(ch, "-")
    for ch in "   ":
        text = text.replace(ch, " ")
    return text.lower()


def grade(case: dict, result: dict) -> dict:
    trace = result["trace"]
    answer = normalise(result["answer"])
    tools_used = list(dict.fromkeys(step["tool"] for step in trace["steps"]))

    # Tool choice is correct if every expected tool was used, with no unexpected
    # write action and no attempt to read another student's data
    unexpected = set(tools_used) - set(case["expected_tools"])
    denied = any("Access denied" in str(step["result"]) for step in trace["steps"])
    tool_ok = (set(case["expected_tools"]) <= set(tools_used)
               and not unexpected & {"create_support_ticket", "save_memory"} and not denied)
    keywords_ok = all(k.lower() in answer for k in case["expected_keywords"])
    memory_ok = bool(trace["memory_saved"]) == case["expect_memory_saved"]
    chunk_kw = case.get("expected_chunk_keyword")
    chunk_ok = not chunk_kw or any(chunk_kw.lower() in c["title"].lower() for c in trace["retrieved"])

    failed = [name for name, ok in [("tool", tool_ok), ("keywords", keywords_ok),
                                    ("memory", memory_ok), ("retrieval", chunk_ok)] if not ok]
    evidence = [c["id"] + " " + c["title"] for c in trace["retrieved"]]
    evidence += [f"memory:{m['key']}" for m in trace["memory_used"]]
    return {
        "id": case["id"], "category": case.get("category", ""), "student_id": case["student_id"],
        "question": case["question"], "expected_tools": case["expected_tools"], "tools_used": tools_used,
        "passed": not failed, "tool_ok": tool_ok, "latency_ms": trace["latency_ms"],
        "input_tokens": trace["tokens"]["input"], "output_tokens": trace["tokens"]["output"],
        "llm_calls": trace["llm_calls"], "evidence": evidence,
        "memory_saved": trace["memory_saved"], "memory_blocked": trace["memory_blocked"],
        "answer": result["answer"],
        "notes": case.get("notes", "") + (f" | FAILED: {', '.join(failed)}" if failed else ""),
    }


def summarise(rows: list[dict]) -> dict:
    n = len(rows)
    return {
        "total": n,
        "passed": sum(r["passed"] for r in rows),
        "accuracy": round(100 * sum(r["passed"] for r in rows) / n, 1),
        "tool_accuracy": round(100 * sum(r["tool_ok"] for r in rows) / n, 1),
        "avg_latency_ms": round(sum(r["latency_ms"] for r in rows) / n),
        "avg_input_tokens": round(sum(r["input_tokens"] for r in rows) / n),
        "avg_output_tokens": round(sum(r["output_tokens"] for r in rows) / n),
        "model": config.GROQ_MODEL,
    }


def write_markdown(summary: dict, rows: list[dict]) -> None:
    lines = [
        "# Evaluation Results", "",
        f"Model: `{summary['model']}` | Accuracy: **{summary['passed']}/{summary['total']} ({summary['accuracy']}%)** | "
        f"Tool choice: **{summary['tool_accuracy']}%** | Avg latency: **{summary['avg_latency_ms']} ms** | "
        f"Avg tokens: **{summary['avg_input_tokens']} in / {summary['avg_output_tokens']} out**", "",
        "| ID | Question | Expected tools | Tools used | Result | Latency (ms) | Tokens in/out | Evidence | Notes |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r['id']} | {r['question']} | {', '.join(r['expected_tools']) or '-'} | {', '.join(r['tools_used']) or '-'} | "
            f"{'PASS' if r['passed'] else 'FAIL'} | {r['latency_ms']} | {r['input_tokens']}/{r['output_tokens']} | "
            f"{'<br>'.join(r['evidence']) or '-'} | {r['notes']} |"
        )
    (OUT / "evaluation.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(exist_ok=True)
    memory_file = OUT / "eval_memory.json"
    memory_file.unlink(missing_ok=True)  # start every evaluation with empty memory
    agent = Agent(AuditLog(OUT / "eval_audit.jsonl"), memory_path=memory_file, trace_path=OUT / "eval_traces.jsonl")

    cases = json.loads(TESTS_FILE.read_text(encoding="utf-8"))
    rows, current, session_id = [], None, None
    for case in cases:
        if (case["student_id"], case["session"]) != current:  # new label = new session
            current = (case["student_id"], case["session"])
            session_id = agent.new_session(case["student_id"])
        try:
            row = grade(case, run_case(agent, case, session_id))
        except Exception as e:
            row = {**case, "tools_used": [], "passed": False, "tool_ok": False, "latency_ms": 0, "input_tokens": 0,
                   "output_tokens": 0, "llm_calls": 0, "evidence": [], "answer": "", "notes": f"ERROR: {e}"}
        rows.append(row)
        print(f"{row['id']}  {'PASS' if row['passed'] else 'FAIL'}  {row['latency_ms']:>5} ms  "
              f"tools={row['tools_used']}  {row['question'][:55]}")
        time.sleep(8)  # stay under Groq free-tier tokens-per-minute limit

    summary = summarise(rows)
    (OUT / "evaluation.json").write_text(json.dumps({"summary": summary, "rows": rows}, indent=2), encoding="utf-8")
    write_markdown(summary, rows)
    print(f"\nAccuracy {summary['passed']}/{summary['total']} ({summary['accuracy']}%) | "
          f"tool choice {summary['tool_accuracy']}% | avg {summary['avg_latency_ms']} ms -> results/evaluation.md")


if __name__ == "__main__":
    main()
