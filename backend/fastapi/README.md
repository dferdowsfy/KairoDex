# AgentHub FastAPI microservice

Minimal service to back Agent-first actions. Uses Supabase for storage. Next.js remains the AI and Sheets integration layer.

Endpoints:
- POST /followup { client_id, channel, instruction }
- POST /amend { client_id, description }
- POST /task { client_id?, title, due_at? }
- POST /reminder { client_id, cadence_days }

Run locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE=...
uvicorn app.main:app --reload --port 8001
```

Notes:
- The Next.js app already has endpoints for AI follow-up and contract amend; this service is optional if you want to move logic out of Next.js.
- For tasks, the current app writes to Google Sheets; this service logs an event instead.
