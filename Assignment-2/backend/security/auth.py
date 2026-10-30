"""Student login with hashed PINs, expiring session tokens and lockout."""
import hashlib
import json
import secrets
from datetime import datetime, timedelta

import config


def _hash_pin(pin: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000).hex()


def create_demo_credentials(students: list[dict]) -> None:
    """Demo PIN = last 4 digits of the student ID. Only the salted hash is stored."""
    if config.AUTH_FILE.exists():
        return
    users = {}
    for s in students:
        salt = secrets.token_hex(8)
        users[s["student_id"]] = {"salt": salt, "pin_hash": _hash_pin(s["student_id"][-4:], salt)}
    config.AUTH_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")


class AuthError(Exception):
    pass


class AuthManager:
    def __init__(self, students: list[dict]):
        create_demo_credentials(students)
        self.users = json.loads(config.AUTH_FILE.read_text(encoding="utf-8"))
        self.tokens = {}     # token -> {"student_id", "expires_at"}
        self.failures = {}   # student_id -> {"count", "locked_until"}

    def login(self, student_id: str, pin: str) -> dict:
        record = self.failures.get(student_id, {"count": 0, "locked_until": None})
        if record["locked_until"] and datetime.now() < record["locked_until"]:
            raise AuthError("Too many failed attempts. Try again in a few minutes.")

        user = self.users.get(student_id)
        if not user or not secrets.compare_digest(_hash_pin(pin, user["salt"]), user["pin_hash"]):
            record["count"] += 1
            if record["count"] >= config.MAX_LOGIN_ATTEMPTS:
                record = {"count": 0, "locked_until": datetime.now() + timedelta(minutes=config.LOCKOUT_MINUTES)}
            self.failures[student_id] = record
            raise AuthError("Invalid student ID or PIN")

        self.failures.pop(student_id, None)
        token = secrets.token_urlsafe(32)
        expires = datetime.now() + timedelta(minutes=config.TOKEN_TTL_MINUTES)
        self.tokens[token] = {"student_id": student_id, "expires_at": expires}
        return {"token": token, "expires_at": expires.isoformat(timespec="seconds")}

    def verify(self, token: str) -> str:
        session = self.tokens.get(token)
        if not session or datetime.now() > session["expires_at"]:
            self.tokens.pop(token, None)
            raise AuthError("Session expired or invalid. Please log in again.")
        return session["student_id"]

    def logout(self, token: str) -> None:
        self.tokens.pop(token, None)
