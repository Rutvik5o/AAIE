"""FastAPI server for the Student Support Agent.
Run:  uvicorn main:app --reload --port 8000"""
import json

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from agent.loop import Agent
from security.audit import AuditLog
from security.auth import AuthError, AuthManager

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
        audit.log(student_id or "unknown", "login_failed", {"reason": str(e)})
        raise HTTPException(status_code=401, detail=str(e))
    audit.log(student_id, "login_success")
    return {**session, "student": _profile(student_id)}


@app.post("/api/logout")
def logout(token: str = Depends(_token), student_id: str = Depends(current_student)):
    auth.logout(token)
    audit.log(student_id, "logout")
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
        audit.log(student_id, "agent_error", {"error": str(e)})
        raise HTTPException(status_code=502, detail=f"The assistant is unavailable right now: {e}")


@app.post("/api/approve")
def approve(req: ApprovalRequest, student_id: str = Depends(current_student)):
    try:
        return agent.resolve_approval(student_id, req.action_id, req.approved)
    except KeyError:
        raise HTTPException(status_code=404, detail="This action has expired or does not exist")


@app.get("/api/memory")
def get_memory(student_id: str = Depends(current_student)):
    return {"facts": agent.memory.get(student_id)}


@app.delete("/api/memory")
def clear_memory(student_id: str = Depends(current_student)):
    agent.memory.clear(student_id)
    audit.log(student_id, "memory_cleared")
    return {"ok": True}


@app.get("/api/audit")
def get_audit(student_id: str = Depends(current_student)):
    events = [e for e in audit.read() if e["actor"] == student_id]
    return {"events": events[::-1], "chain_valid": audit.verify()}


@app.get("/api/eval")
def get_eval():
    path = config.RESULTS_DIR / "evaluation.json"
    if not path.exists():
        return {"summary": None, "rows": []}
    return json.loads(path.read_text(encoding="utf-8"))
