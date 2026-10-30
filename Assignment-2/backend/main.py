"""FastAPI server for the Student Support Agent.
Run:  uvicorn main:app --reload --port 8000"""
import json
import queue
import threading

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import config
from agent.loop import Agent
from security.audit import AuditLog
from security.auth import AuthError, AuthManager
from security.policy import EDITABLE_FIELDS, RULES

students = json.loads(config.STUDENTS_FILE.read_text(encoding="utf-8"))["students"]
audit = AuditLog(config.AUDIT_FILE)
auth = AuthManager(students)
agent = Agent(audit)

app = FastAPI(title="Student Support Agent")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])


class LoginRequest(BaseModel):
    student_id: str
    pin: str


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str


class ApprovalRequest(BaseModel):
    action_id: str
    approved: bool


def _token(authorization: str = Header(default="")) -> str:
    return authorization.removeprefix("Bearer ").strip()


def current_student(token: str = Depends(_token)) -> str:
    """Every protected route gets the student ID from the token, never from the request body."""
    try:
        return auth.verify(token)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))


def _profile(student_id: str) -> dict:
    s = next(s for s in students if s["student_id"] == student_id)
    return {"student_id": s["student_id"], "name": s["name"], "programme": s["programme"]}


@app.get("/api/students")
def list_students():
    return [_profile(s["student_id"]) for s in students]


@app.post("/api/login")
def login(req: LoginRequest):
    student_id = req.student_id.strip().upper()
    try:
        session = auth.login(student_id, req.pin.strip())
    except AuthError as e:
        audit.record(student_id or "unknown", "login", permission="denied", rule="P1", result="failed", details={"reason": str(e)})
        raise HTTPException(status_code=401, detail=str(e))
    audit.record(student_id, "login", rule="P1")
    return {**session, "student": _profile(student_id)}


@app.post("/api/logout")
def logout(token: str = Depends(_token), student_id: str = Depends(current_student)):
    auth.logout(token)
    audit.record(student_id, "logout")
    return {"ok": True}


@app.post("/api/session/new")
def new_session(student_id: str = Depends(current_student)):
    return {"session_id": agent.new_session(student_id)}


@app.post("/api/chat")
def chat(req: ChatRequest, student_id: str = Depends(current_student)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    try:
        return agent.chat(student_id, req.session_id or "", req.message)
    except Exception as e:
        audit.record(student_id, "chat", result="failed", details={"error": str(e)})
        raise HTTPException(status_code=502, detail=f"The assistant is unavailable right now: {e}")


@app.post("/api/approve")
def approve(req: ApprovalRequest, student_id: str = Depends(current_student)):
    try:
        return agent.resolve_approval(student_id, req.action_id, req.approved)
    except KeyError:
        raise HTTPException(status_code=404, detail="This action has expired or does not exist")


def stream_events(student_id: str, run) -> StreamingResponse:
    """Runs the agent in a thread and streams its events as Server-Sent Events:
    status (what the agent is doing), token (answer text), reset, done (answer + trace), error."""
    events = queue.Queue()

    def worker():
        try:
            events.put(("done", run(lambda event, data: events.put((event, data)))))
        except Exception as e:
            audit.record(student_id, "chat", result="failed", details={"error": str(e)})
            events.put(("error", {"detail": f"The assistant is unavailable right now: {e}"}))
        events.put(None)

    def generate():
        while (item := events.get()) is not None:
            event, data = item
            yield f"event: {event}\ndata: {json.dumps(data)}\n\n"

    threading.Thread(target=worker, daemon=True).start()
    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest, student_id: str = Depends(current_student)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")
    return stream_events(student_id, lambda emit: agent.chat(student_id, req.session_id or "", req.message, emit))


@app.post("/api/approve/stream")
def approve_stream(req: ApprovalRequest, student_id: str = Depends(current_student)):
    if req.action_id not in agent.pending:
        raise HTTPException(status_code=404, detail="This action has expired or does not exist")
    return stream_events(student_id, lambda emit: agent.resolve_approval(student_id, req.action_id, req.approved, emit))


@app.get("/api/memory")
def get_memory(student_id: str = Depends(current_student)):
    return {"facts": agent.memory.get(student_id)}


@app.delete("/api/memory")
def clear_memory(student_id: str = Depends(current_student)):
    agent.memory.clear(student_id)
    audit.record(student_id, "clear_memory")
    return {"ok": True}


@app.get("/api/audit")
def get_audit(student_id: str = Depends(current_student)):
    events = [e for e in audit.read() if e["actor"] == student_id]
    return {"events": events[::-1], "chain_valid": audit.verify()}


@app.get("/api/policy")
def get_policy():
    """The permission rules, shown in the UI so they can be explained during the demo."""
    return {"rules": RULES, "editable_fields": sorted(EDITABLE_FIELDS)}


@app.get("/api/eval")
def get_eval():
    path = config.RESULTS_DIR / "evaluation.json"
    if not path.exists():
        return {"summary": None, "rows": []}
    return json.loads(path.read_text(encoding="utf-8"))
