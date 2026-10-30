<p align="center">
  <img src="Assignment-1/frontend/public/favicon.png" width="80" alt="Campus Assist logo" />
</p>

<h1 align="center">AAIE: Agentic AI Engineering</h1>

<p align="center">Campus Assist, an AI Student Support Agent for fees, scholarships, course changes and support requests.</p>

---

| Folder | What it is |
|---|---|
| [**Assignment-1**](Assignment-1/) | The original agent: agent loop, 5 tools, persistent memory, top-k retrieval, context selection, authentication, approval, audit, tracing and evaluation |
| [**Assignment-2**](Assignment-2/) | The same agent made safe for institutional use: permission rules enforced in code (own data only, protected fields), approval before sensitive changes (with reject and expiry), secrets kept out of memory and logs, a who/what/permission/approval/result audit trail, and a final evaluation compared with Assignment 1 |

Each folder has its own `README.md` with setup steps, architecture and evaluation results.

## Quick start

```powershell
python -m venv AAIE1                  # shared Python environment, at the repo root
.\AAIE1\Scripts\activate
pip install -r Assignment-2\backend\requirements.txt
```

Then follow the README in the assignment folder you want to run. Both use ports 8000 (backend) and 5173/5174 (frontend), so run one assignment at a time.
