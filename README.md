# Campus Assist: AI Student Support Agent

A chat-based support agent for students. It answers questions on fees, scholarships, course changes and support requests. The agent decides for itself whether to **answer directly**, **call a tool**, **use retrieved policy text**, or **use remembered facts**. Every run is traced, and student identity, approvals and audit events are handled explicitly.

- **LLM:** Groq (`openai/gpt-oss-120b`, OpenAI-style tool calling)
- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + Tailwind + Framer Motion

---

## Architecture

```
React UI (login · chat · trace panel · evaluation · audit)
        │  Bearer token
        ▼
FastAPI  main.py ── security/auth.py   (PIN login, tokens, lockout)
        │        └─ security/audit.py  (hash-chained audit log)
        ▼
agent/loop.py   ── the agent loop
   1. check message: sensitive/temporary info is masked and never stored
   2. context selection: memory facts + top-3 policy chunks + last 6 messages
   3. call LLM with tool schemas
   4. tool call? → run it (student ID injected by server) → send result back → repeat (max 5 steps)
      write action? → pause and ask the student to approve
   5. final answer → trace saved to logs/traces.jsonl
        │
        ├─ agent/tools.py      get_student_record · get_fee_status · get_scholarship_status
        │                      create_support_ticket (needs approval) · save_memory
        ├─ agent/retriever.py  handbook split per "## " section → TF-IDF → top-k chunks
        ├─ agent/memory.py     long-term memory (JSON) + sensitive / temporary filter + redaction
        ├─ agent/prompts.py    system prompt built only from the selected context
        ├─ agent/tracer.py     tools, chunks, memory, tokens, latency per run
        └─ agent/llm.py        Groq client with retry on rate limits
```

### How each requirement is met

| Requirement | Implementation |
|---|---|
| Agent loop | `agent/loop.py` `_run()`: the LLM picks tools, results are fed back, and the loop repeats until a final answer |
| ≥ 2 tools | Student record, fee status, scholarship status, support ticket, save memory |
| Persistent memory | `memory/memory.json`, stored per student, survives new sessions and restarts |
| Not storing sensitive/temporary info | `memory.check()` blocks card numbers, ID numbers, passwords/OTP, bank and health details, and moods or "today" context. Card numbers are also redacted before they reach the LLM and the logs |
| Retrieval | `agent/retriever.py` returns only the top 3 relevant handbook sections (with a score threshold), never the whole document |
| Context selection | The prompt contains only the question, relevant chunks, the student's memory facts and recent history. Fee and scholarship data come only through tools |
| Error handling | Unknown student, fee system outage (S1005), malformed tool arguments, LLM rate limits, and questions outside the policy (the agent says so and offers a ticket) |
| Authentication | Student ID + PIN, stored as PBKDF2 salted hashes. Session tokens expire after 60 minutes. Login locks for 5 minutes after 5 failed attempts. The student ID always comes from the token, so tools can't read another student's data |
| Approval | `create_support_ticket` pauses the agent loop. The UI shows Approve/Reject, and the tool runs only after approval |
| Audit | `logs/audit.jsonl` is append-only and SHA-256 hash-chained. It records logins, failed logins, tool calls and errors, approvals, memory saves and blocks, and denied access. `/api/audit` checks the chain |
| Tracing and measurement | Each answer has a trace panel. `evaluate.py` produces `results/evaluation.md` and `.json` |

---

## Project structure

```
Assignment 1/
├── AAIE1/                    # Python virtual environment
├── README.md
├── backend/
│   ├── main.py               # API routes
│   ├── config.py             # paths and settings
│   ├── evaluate.py           # runs the test set → results/
│   ├── requirements.txt
│   ├── .env.example
│   ├── agent/                # loop, tools, retriever, memory, prompts, tracer, llm
│   ├── security/             # auth, audit
│   ├── data/                 # student_handbook.md, students.json, tickets.json, auth.json (generated)
│   ├── tests/test_questions.json
│   ├── memory/               # memory.json (generated)
│   ├── logs/                 # traces.jsonl, audit.jsonl (generated)
│   └── results/              # evaluation.md / .json (generated)
└── frontend/                 # React app
```

---

## How to run

### 1. Backend

```powershell
cd "Assignment 1"
python -m venv AAIE1                       # already created
.\AAIE1\Scripts\activate
pip install -r backend\requirements.txt

cd backend
copy .env.example .env                     # then paste your Groq key into .env
uvicorn main:app --reload --port 8000
```

Get a free key at https://console.groq.com/keys.

### 2. Frontend (in a second terminal)

```powershell
cd "Assignment 1\frontend"
npm install
npm run dev
```

Open http://localhost:5173.

**Demo logins:** the PIN is the last 4 digits of the student ID.

| Student | PIN | Scenario |
|---|---|---|
| S1001 Aarav Mehta (MBA) | 1001 | ₹65,000 due, merit scholarship approved |
| S1002 Priya Sharma (BBA) | 1002 | Fully paid, scholarship rejected |
| S1003 Rohan Iyer (B.Tech CSE) | 1003 | Overdue, late fee ₹5,500 |
| S1004 Ananya Reddy (M.Tech DS) | 1004 | Scholarship under review |
| S1005 Vikram Nair (PGDM) | 1005 | Fee system outage (tool error) |

### 3. Evaluation

```powershell
cd backend
python evaluate.py
```

This runs `tests/test_questions.json` with a separate, empty memory file and auto-approves ticket actions. It writes `results/evaluation.md`, which also appears in the **Evaluation** tab of the UI.

---

## Demo script

1. Log in as **S1001** and ask *"What is my current fee status?"*. The trace shows `get_fee_status`.
2. *"The payment portal failed. Can I pay on the next working day?"* The answer comes from the "Payment Portal Failures" chunk.
3. *"I'm in the MBA programme and I prefer updates by email"*. The fact is saved with `save_memory`, and the memory card updates.
4. Click **New session**, then ask *"What's my contact preference?"*. The agent answers from memory.
5. *"My card number is 4111 1111 1111 1111, I'm stressed today, remember it"*. The trace shows **memory blocked**, and the card number is redacted in the logs.
6. *"What is the hostel pet policy?"* The agent says it has no information and offers a ticket.
7. *"Raise a ticket, my hostel Wi-Fi is down"*. An approval card appears; click Approve and the ticket ID is returned.
8. Log in as **S1005** and ask about fees. The tool error is handled gracefully.
9. Open the **Audit** tab to see every event and the "hash chain verified" badge.

---

## Evaluation results

See `backend/results/evaluation.md` (generated by `evaluate.py`). Key observations are summarised there after a run.
