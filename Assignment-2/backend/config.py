import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

DATA_DIR = BASE_DIR / "data"
LOG_DIR = BASE_DIR / "logs"
RESULTS_DIR = BASE_DIR / "results"

HANDBOOK_FILE = DATA_DIR / "student_handbook.md"
STUDENTS_FILE = DATA_DIR / "students.json"
TICKETS_FILE = DATA_DIR / "tickets.json"
AUTH_FILE = DATA_DIR / "auth.json"
MEMORY_FILE = BASE_DIR / "memory" / "memory.json"
TRACE_FILE = LOG_DIR / "traces.jsonl"
AUDIT_FILE = LOG_DIR / "audit.jsonl"

MAX_AGENT_STEPS = 5       # max LLM calls per question
TOP_K_CHUNKS = 3          # policy chunks sent to the model
MIN_CHUNK_SCORE = 0.08    # ignore chunks below this similarity
HISTORY_TURNS = 6         # recent chat messages kept in a session
TOKEN_TTL_MINUTES = 60
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 5

# Tools that change data must be approved by the student before they run
TOOLS_NEEDING_APPROVAL = {"create_support_ticket"}
