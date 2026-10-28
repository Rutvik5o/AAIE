"""Generates the architecture / workflow diagrams as SVG.
Run from the project root:  python architecture/make_diagrams.py architecture backend/results/evaluation.json
PNG versions were rendered from the SVGs with headless Chrome (--screenshot)."""
import html
import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
EVAL = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
OUT.mkdir(parents=True, exist_ok=True)

INK, MUTED, LINE = "#1e2340", "#5b6380", "#8a93b0"
THEMES = {  # fill, stroke, title colour
    "ui": ("#f4f1ff", "#7c5cff", "#4c35c9"),
    "api": ("#e9fbfd", "#0891b2", "#0b6a80"),
    "sec": ("#fff1f3", "#e11d48", "#a3102f"),
    "agent": ("#eef1ff", "#4f46e5", "#3730a3"),
    "llm": ("#fcf2ff", "#c026d3", "#86198f"),
    "tool": ("#fff8eb", "#d97706", "#92400e"),
    "data": ("#f2f4f8", "#64748b", "#334155"),
    "ok": ("#ecfdf5", "#059669", "#065f46"),
    "eval": ("#effcfa", "#0d9488", "#115e59"),
    "bad": ("#fff1f2", "#e11d48", "#9f1239"),
}
FONT = "Segoe UI, Inter, Arial, sans-serif"
MONO = "Consolas, JetBrains Mono, monospace"


def esc(s):
    return html.escape(str(s))


class SVG:
    def __init__(self, w, h, title, subtitle):
        self.w, self.h, self.parts = w, h, []
        self.rect(0, 0, w, h, "#ffffff", "none", r=0)
        self.parts.append(f'<rect x="0" y="0" width="{w}" height="6" fill="url(#brand)"/>')
        self.text(40, 50, title, 26, 700)
        self.text(40, 76, subtitle, 14, 400, MUTED)
        self.text(w - 40, h - 18, "Campus Assist · AI Student Support Agent · AAIE Assignment 1", 11, 400, LINE, "end")

    def rect(self, x, y, w, h, fill, stroke, r=14, dash=None, sw=1.6):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" '
                          f'stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def text(self, x, y, t, size=13, weight=400, fill=INK, anchor="start", mono=False):
        fam = MONO if mono else FONT
        self.parts.append(f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" font-weight="{weight}" '
                          f'fill="{fill}" text-anchor="{anchor}" style="white-space:pre">{esc(t)}</text>')

    def box(self, x, y, w, h, title, lines=(), theme="agent", center=False, dash=None, tag=None):
        fill, stroke, tcol = THEMES[theme]
        self.rect(x + 3, y + 4, w, h, "#1e234014", "none")  # soft shadow
        self.rect(x, y, w, h, fill, stroke, dash=dash)
        self.parts.append(f'<rect x="{x}" y="{y + 12}" width="4" height="{h - 24}" rx="2" fill="{stroke}"/>')
        cx = x + w / 2 if center else x + 18
        anchor = "middle" if center else "start"
        self.text(cx, y + 27, title, 15, 700, tcol, anchor)
        for i, line in enumerate(lines):
            mono = line.startswith("`")
            self.text(cx, y + 49 + i * 19, line.strip("`"), 12.5, 400, INK if not mono else tcol, anchor, mono)
        if tag:
            tw = len(tag) * 6.6 + 16
            self.rect(x + w - tw - 10, y + 10, tw, 20, "#ffffff", stroke, r=10, sw=1)
            self.text(x + w - tw / 2 - 10, y + 24, tag, 10.5, 600, tcol, "middle")

    def chip(self, x, y, label, theme="ui"):
        _, stroke, tcol = THEMES[theme]
        w = len(label) * 7 + 20
        self.rect(x, y, w, 26, "#ffffff", stroke, r=13, sw=1)
        self.text(x + w / 2, y + 17.5, label, 12, 600, tcol, "middle")
        return x + w + 10

    def diamond(self, cx, cy, hw, hh, title, sub=None, theme="tool"):
        fill, stroke, tcol = THEMES[theme]
        pts = f"{cx},{cy - hh} {cx + hw},{cy} {cx},{cy + hh} {cx - hw},{cy}"
        self.parts.append(f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>')
        self.text(cx, cy + (0 if sub else 5), title, 14, 700, tcol, "middle")
        if sub:
            self.text(cx, cy + 18, sub, 11, 400, MUTED, "middle")

    def arrow(self, pts, label=None, at=None, dashed=False, color=LINE, lcolor=MUTED):
        d = " ".join(f"{x},{y}" for x, y in pts)
        dash = ' stroke-dasharray="6 5"' if dashed else ""
        self.parts.append(f'<polyline points="{d}" fill="none" stroke="{color}" stroke-width="1.8"{dash} '
                          f'stroke-linejoin="round" marker-end="url(#arrow)"/>')
        if label:
            lx, ly = at or ((pts[0][0] + pts[-1][0]) / 2, (pts[0][1] + pts[-1][1]) / 2)
            w = len(label) * 6.4 + 14
            self.rect(lx - w / 2, ly - 11, w, 20, "#ffffff", "#e3e6ef", r=10, sw=1)
            self.text(lx, ly + 3.5, label, 11, 600, lcolor, "middle")

    def save(self, name):
        defs = ('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" '
                f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{LINE}"/></marker>'
                '<linearGradient id="brand" x1="0" x2="1"><stop offset="0" stop-color="#7c5cff"/>'
                '<stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>')
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
               f'viewBox="0 0 {self.w} {self.h}">{defs}{"".join(self.parts)}</svg>')
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")


# ---------------------------------------------------------------- 1. System architecture
s = SVG(1400, 1000, "1 · System Architecture",
        "How the React UI, FastAPI backend, agent modules, Groq LLM and data files fit together")
s.box(40, 105, 200, 110, "Student", ["uses the web app", "logs in with ID + PIN"], "ui", center=True)
s.box(300, 105, 1060, 110, "Frontend · React + Vite + Tailwind + Framer Motion   (frontend/src)", [], "ui")
x = 318
for c in ["Login.jsx", "ChatView / Message.jsx", "ApprovalCard.jsx", "TracePanel.jsx", "EvalView.jsx",
          "AuditView.jsx", "api.js (fetch + SSE)"]:
    x = s.chip(x, 150, c)
s.text(318, 199, "Light / dark theme · animated background · streamed answers with live tool status", 12, 400, MUTED)
s.arrow([(240, 160), (298, 160)])

s.arrow([(640, 215), (640, 278)], "REST + Server-Sent Events · Bearer token · Vite proxy :5174 → :8000", (700, 247))

s.box(40, 280, 240, 140, "Evaluation", ["`backend/evaluate.py", "13 test cases from", "`tests/test_questions.json", "→ results/evaluation.md"],
      "eval")
s.box(320, 280, 640, 140, "Backend API · FastAPI   (backend/main.py)",
      ["`/api/login  /api/logout  /api/session/new", "`/api/chat/stream  /api/approve/stream   (SSE)",
       "`/api/memory  /api/audit  /api/eval", "student_id always comes from the token (current_student)"], "api")
s.box(1000, 280, 360, 140, "Security   (backend/security)",
      ["auth.py  · PBKDF2 PIN hashes, 60-min tokens,", "             lockout after 5 failed logins",
       "audit.py · append-only log, SHA-256 hash chain", "`data/auth.json · logs/audit.jsonl"], "sec")
s.arrow([(960, 350), (998, 350)])

s.box(320, 465, 640, 150, "Agent loop   (backend/agent/loop.py)",
      ["1  safety check · redact card numbers / OTPs", "2  context selection: memory + top-3 chunks + history",
       "3  LLM ↔ tools loop (max 5 steps)", "4  pause for approval on write actions",
       "5  final answer streamed + trace saved"], "agent")
s.arrow([(640, 420), (640, 463)], "Agent.chat()", (700, 442))
s.arrow([(160, 420), (160, 490), (318, 490)], "runs the agent directly", (215, 470), dashed=True)
s.box(40, 525, 240, 95, "Prompts", ["`agent/prompts.py", "system prompt built only", "from the selected context"], "agent")
s.arrow([(280, 572), (318, 572)])
s.box(1000, 465, 360, 150, "LLM client   (agent/llm.py)",
      ["Groq API · openai/gpt-oss-120b", "OpenAI-style tool calling", "token streaming (on_token callback)",
       "retry on rate limits (retry-after header)", "→ messages + tools   ← reply / tool calls"], "llm")
s.arrow([(960, 530), (998, 530)])
s.arrow([(998, 565), (962, 565)])

cols = [(40, "Tools", "tool", ["`agent/tools.py", "get_student_record", "get_fee_status", "get_scholarship_status",
                               "create_support_ticket  (approval)", "save_memory"]),
        (380, "Retriever", "agent", ["`agent/retriever.py", "split handbook on '## ' sections", "TF-IDF (1–2 grams) + cosine",
                                     "top-3 chunks, score ≥ 0.08"]),
        (720, "Memory", "ok", ["`agent/memory.py", "long-term facts per student", "blocks sensitive / temporary info",
                               "redact() for logs + LLM input"]),
        (1060, "Tracer", "eval", ["`agent/tracer.py", "tools · chunks · memory", "tokens · LLM calls",
                                  "latency · first-token time"])]
s.parts.append(f'<polyline points="640,615 640,655" fill="none" stroke="{LINE}" stroke-width="1.8"/>')
s.parts.append(f'<polyline points="190,655 1210,655" fill="none" stroke="{LINE}" stroke-width="1.8"/>')
stores = ["data/students.json · data/tickets.json", "data/student_handbook.md (22 sections)",
          "memory/memory.json", "logs/traces.jsonl"]
for (cx, title, theme, lines), store in zip(cols, stores):
    s.arrow([(cx + 150, 655), (cx + 150, 688)])
    s.box(cx, 690, 300, 160, title, lines, theme)
    s.arrow([(cx + 150, 850), (cx + 150, 888)])
    s.box(cx, 890, 300, 52, store, [], "data", center=True, dash="5 4")
s.save("01_system_architecture")

# ---------------------------------------------------------------- 2. Agent flow
s = SVG(1400, 1110, "2 · Agent Flow (one chat turn)",
        "What happens from the moment a student sends a message until the answer and trace appear")
CX, W = 480, 440
L = CX - W / 2
s.box(L, 100, W, 60, "①  Student sends a message", ["ChatView → POST /api/chat/stream"], "ui", center=True)
s.arrow([(CX, 160), (CX, 183)])
s.box(L, 185, W, 66, "②  Authenticate   (main.py · auth.py)", ["Bearer token → student_id  (the model never picks the ID)"],
      "sec", center=True)
s.arrow([(CX, 251), (CX, 273)])
s.box(L, 275, W, 104, "③  Safety check   (memory.py)",
      ["sensitive / temporary text → memory_blocked + audit", "redact() masks card numbers & OTPs before the LLM",
       "another student's ID mentioned → access_denied audit"], "ok", center=True)
s.arrow([(CX, 379), (CX, 401)])
s.box(L, 403, W, 124, "④  Context selection   (loop.py · prompts.py)",
      ["remembered facts for this student", "top-3 handbook chunks (TF-IDF, score ≥ 0.08)",
       "last 6 messages + student profile + today's date", "→ build_system_prompt()"], "agent", center=True)
s.arrow([(CX, 527), (CX, 549)])
s.box(L, 551, W, 66, "⑤  LLM call   (llm.py → Groq gpt-oss-120b)", ["with tool schemas · streams tokens to the UI"],
      "llm", center=True)
s.arrow([(CX, 617), (CX, 652)])
s.diamond(CX, 700, 115, 46, "Tool call?")
s.arrow([(CX, 746), (CX, 793)], "No", (CX + 24, 770))
s.box(L, 795, W, 66, "⑥  Final answer", ["streamed token-by-token (SSE token events)"], "ui", center=True)
s.arrow([(CX, 861), (CX, 888)])
s.box(L, 890, W, 66, "⑦  Save trace & audit   (tracer.py · audit.py)", ["logs/traces.jsonl · logs/audit.jsonl"],
      "eval", center=True)
s.arrow([(CX, 956), (CX, 983)])
s.box(L, 985, W, 60, "Answer + trace badges shown in the UI", ["tools · latency · first token · tokens in/out"],
      "ui", center=True)

s.arrow([(CX + 115, 700), (758, 700)], "Yes", (690, 700))
s.diamond(880, 700, 120, 46, "Needs approval?", "create_support_ticket")
s.arrow([(1000, 700), (1068, 700)], "No", (1034, 700))
s.box(1070, 650, 300, 100, "Run tool   (tools.py)",
      ["student_id injected by the server", "other student → 'Access denied'", "errors → {ok: false, error}"], "tool")
s.arrow([(1220, 650), (1220, 584), (692, 584)], "tool result / error → back to the LLM (max 5 steps)", (950, 584))
s.arrow([(880, 746), (880, 798)], "Yes", (904, 772))
s.box(745, 800, 270, 112, "Pause for approval",
      ["ApprovalCard: Approve / Reject", "POST /api/approve/stream", "audit: approval_requested /", "granted / rejected"], "tool")
s.arrow([(1015, 840), (1220, 840), (1220, 752)], "Approve", (1120, 840))
s.arrow([(880, 912), (880, 1000), (1385, 1000), (1385, 584), (1222, 584)], "Reject → the model is told", (1130, 1000),
        dashed=True)
s.save("02_agent_flow")

# ---------------------------------------------------------------- 3. Memory, retrieval, context
s = SVG(1400, 880, "3 · Memory, Retrieval & Context Selection",
        "Only what is relevant goes into the prompt; sensitive data and other students' data never do")
s.box(40, 105, 600, 230, "Long-term memory   (agent/memory.py → memory/memory.json)", [], "ok")
s.box(60, 150, 165, 60, "save_memory tool", ["facts: [{key, value}]"], "tool", center=True)
s.arrow([(225, 180), (253, 180)])
s.box(255, 150, 150, 60, "check() filter", ["sensitive? temporary?"], "sec", center=True)
s.arrow([(405, 180), (433, 180)], )
s.box(435, 150, 185, 60, "memory.json", ["per student, survives restart"], "data", center=True)
s.text(62, 240, "✓ stored:   programme = MBA · contact_preference = email", 12.5, 600, THEMES["ok"][2])
s.text(62, 264, "✗ blocked:  card numbers, ID numbers, password / PIN / OTP / CVV,", 12.5, 600, THEMES["bad"][2])
s.text(62, 283, "                 bank details, health information", 12.5, 600, THEMES["bad"][2])
s.text(62, 307, "✗ blocked:  temporary context: today, right now, feeling, stressed …", 12.5, 600, THEMES["bad"][2])

s.box(40, 355, 600, 250, "Retrieval   (agent/retriever.py)", [], "agent")
steps = [("handbook.md", "22 sections · ≈4.9k tok"), ("split on '## '", "chunk-01 … 22"),
         ("TF-IDF", "1–2 grams, title ×2"), ("cosine", "top-3, score ≥ 0.08")]
for i, (t, sub) in enumerate(steps):
    bx = 60 + i * 145
    s.box(bx, 400, 130, 66, t, [sub], "data", center=True)
    if i < 3:
        s.arrow([(bx + 130, 433), (bx + 143, 433)])
s.text(62, 500, "Example:  \"The payment portal failed, can I pay on the next working day?\"", 12.5, 400, INK)
s.text(62, 522, "→ chunk-05 Payment Portal Failures (0.26) · chunk-06 Late Payment Fees (0.16) · chunk-20 (0.10)", 12.5, 600,
       THEMES["agent"][2])
s.text(62, 552, "Only the top-k chunks are sent (≈210 tokens each), never the whole handbook.", 12.5, 400, MUTED)
s.text(62, 574, "Not in the handbook (e.g. pet policy) → weak matches → agent says it doesn't know.", 12.5,
       400, MUTED)

s.box(40, 625, 600, 150, "Short-term context (session)", ["last 6 messages of this session  (HISTORY_TURNS = 6)",
                                                          "New session → empty history, but memory is still loaded",
                                                          "+ student profile (name, programme) from students.json",
                                                          "+ today's date (for due-date questions)"], "ui")

s.box(720, 250, 300, 330, "build_system_prompt()", ["`agent/prompts.py", "", "1  Rules", "    · tools for live data", "    · policy only from excerpts",
                                                     "    · say \"I don't know\" + offer ticket", "    · refuse other students' data",
                                                     "    · never save sensitive info", "2  Student profile", "3  Remembered facts",
                                                     "4  Policy excerpts (top-3)", "5  Today's date",
                                                     "+ history + redacted message"], "agent")
for y in (220, 480, 700):
    s.arrow([(640, y), (680, y), (680, 415), (718, 415)])
s.arrow([(1020, 415), (1078, 415)])
s.box(1080, 330, 280, 170, "LLM (Groq)", ["openai/gpt-oss-120b", "", "≈1,680 input tokens / request", "(prompt + tool schemas)",
                                           "vs ≈4,900 tokens for the", "handbook alone"], "llm")
s.box(720, 620, 640, 155, "Kept OUT of the prompt", ["Fee and scholarship data → fetched only through tools when needed",
                                                     "Other students' records → run_tool() returns 'Access denied' + audit",
                                                     "Card numbers / OTPs → redacted before the LLM and the logs",
                                                     "Old turns beyond the last 6 → dropped"], "bad")
s.save("03_memory_retrieval_context")

# ---------------------------------------------------------------- 4. Tracing & evaluation
sm = EVAL["summary"]
s = SVG(1400, 900, "4 · Tracing & Evaluation",
        "Every turn produces a trace; evaluate.py replays 13 test cases and grades them automatically")
s.box(40, 105, 400, 300, "Trace object   (agent/tracer.py)",
      ["`steps        tool, args, result per call", "`retrieved    chunk id, title, score", "`memory_used  facts put in the prompt",
       "`memory_saved / memory_blocked", "`approvals    pending / approved / rejected", "`tokens       input / output",
       "`llm_calls    number of LLM round trips", "`latency_ms   end-to-end time", "`first_token_ms  streaming speed",
       "", "card numbers / OTPs redacted before saving"], "eval")
s.arrow([(440, 190), (518, 190)])
s.box(520, 150, 300, 80, "logs/traces.jsonl", ["one JSON line per turn"], "data", center=True)
s.arrow([(440, 300), (518, 300)])
s.box(520, 260, 300, 80, "TracePanel in the UI", ["sent in the SSE 'done' event"], "ui", center=True)
s.box(880, 105, 480, 300, "Audit log   (security/audit.py)",
      ["`logs/audit.jsonl  (append-only)", "events: login, login_failed, logout,", "  tool_call, tool_error, access_denied,",
       "  approval_requested / granted / rejected,", "  memory_saved, memory_blocked",
       "each entry stores prev_hash + SHA-256 hash", "→ editing any line breaks the chain",
       "/api/audit verifies it → \"chain verified\" badge"], "sec")

s.box(40, 440, 1320, 200, "Evaluation pipeline   (backend/evaluate.py)", [], "eval")
pipe = [("test_questions.json", ["13 cases: tool, policy,", "memory, safety, privacy,", "errors, unanswerable"], "data"),
        ("Run the agent", ["separate memory / audit /", "trace files · empty memory", "tickets auto-approved"], "agent"),
        ("grade()", ["✓ expected tools used", "✓ keywords in answer", "✓ memory save matches", "✓ right chunk retrieved"], "ok"),
        ("results/", ["evaluation.json", "evaluation.md", "→ Evaluation tab (/api/eval)"], "data")]
for i, (t, lines, th) in enumerate(pipe):
    bx = 70 + i * 325
    s.box(bx, 485, 280, 135, t, lines, th, center=True)
    if i < 3:
        s.arrow([(bx + 280, 552), (bx + 323, 552)])

tiles = [("Accuracy", f"{sm['passed']}/{sm['total']}", f"{sm['accuracy']}% of cases passed", "ok"),
         ("Tool choice", f"{sm['tool_accuracy']:.0f}%", "right tools, no unwanted writes", "agent"),
         ("Avg latency", f"{sm['avg_latency_ms'] / 1000:.2f} s", "end to end · first token ≈1 s", "api"),
         ("Avg tokens", f"{sm['avg_input_tokens']:,} / {sm['avg_output_tokens']}", "input / output per case", "llm")]
for i, (label, val, sub, th) in enumerate(tiles):
    bx = 40 + i * 337
    fill, stroke, tcol = THEMES[th]
    s.rect(bx, 670, 310, 150, fill, stroke)
    s.text(bx + 22, 702, label.upper(), 12, 700, tcol)
    s.text(bx + 22, 760, val, 40, 800, INK)
    s.text(bx + 22, 795, sub, 12.5, 400, MUTED)
s.text(40, 850, f"Model {sm['model']} on Groq · latest run of backend/tests/test_questions.json", 12, 400, MUTED)
s.save("04_tracing_evaluation")

# ---------------------------------------------------------------- 5. Evaluation results per test
rows = EVAL["rows"]
s = SVG(1400, 900, "5 · Evaluation Results per Test Case",
        f"Latency and token usage for each of the {len(rows)} cases (all passed) · tool cases need 2 LLM calls")


def bars(top, title, values, unit, color, color2=None, values2=None):
    left, width, height = 250, 1060, 300
    s.text(40, top - 14, title, 15, 700)
    vmax = max((a + (b or 0)) for a, b in zip(values, values2 or [0] * len(values)))
    vmax = (int(vmax / 1000) + 1) * 1000
    for g in range(0, vmax + 1, vmax // 4):
        gx = left + width * g / vmax
        s.parts.append(f'<line x1="{gx}" y1="{top}" x2="{gx}" y2="{top + height}" stroke="#eceef5"/>')
        s.text(gx, top + height + 18, f"{g:,}", 11, 400, LINE, "middle")
    bh = height / len(rows)
    for i, r in enumerate(rows):
        y = top + i * bh + 3
        tools = ", ".join(r["tools_used"]) or "direct answer"
        s.text(40, y + bh / 2 + 1, r["id"], 12, 700)
        s.text(78, y + bh / 2 + 1, tools[:24], 11, 400, MUTED)
        w1 = width * values[i] / vmax
        s.rect(left, y, w1, bh - 6, color, "none", r=4)
        end = left + w1
        if values2:
            w2 = width * values2[i] / vmax
            s.rect(end, y, w2, bh - 6, color2, "none", r=4)
            end += w2
        label = f"{values[i]:,}" + (f" / {values2[i]:,}" if values2 else "") + unit
        s.text(end + 8, y + bh / 2 + 1, label, 11, 600, MUTED)


bars(130, "Latency per case (ms)", [r["latency_ms"] for r in rows], " ms", "#7c5cff")
bars(530, "Tokens per case (input + output)", [r["input_tokens"] for r in rows], "", "#06b6d4", "#c026d3",
     [r["output_tokens"] for r in rows])
s.rect(1000, 500, 14, 14, "#06b6d4", "none", r=3)
s.text(1020, 512, "input tokens", 12, 400, MUTED)
s.rect(1120, 500, 14, 14, "#c026d3", "none", r=3)
s.text(1140, 512, "output tokens", 12, 400, MUTED)
s.save("05_evaluation_results")
print("ok")
