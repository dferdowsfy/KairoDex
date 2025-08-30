from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client, Client

app = FastAPI(title="AgentHub FastAPI", version="0.1.0")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE") or os.getenv("SUPABASE_ANON_KEY")
_supabase: Optional[Client] = None


def supabase() -> Client:
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("Supabase env not configured")
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


class FollowUpPayload(BaseModel):
    client_id: str
    channel: str = "email"
    instruction: Optional[str] = None


class AmendPayload(BaseModel):
    client_id: str
    description: str


class TaskPayload(BaseModel):
    client_id: Optional[str] = None
    title: str
    due_at: Optional[str] = None


class ReminderPayload(BaseModel):
    client_id: str
    cadence_days: int


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/followup")
async def followup(p: FollowUpPayload):
    # Store a draft in messages as outbound email/sms (body is placeholder; AI generation is handled in Next.js)
    try:
        body = p.instruction or "Follow-up"
        s = supabase()
        data = {
            "client_id": p.client_id,
            "direction": "out",
            "channel": p.channel,
            "body": body,
        }
        s.table("messages").insert(data).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/amend")
async def amend(p: AmendPayload):
    try:
        s = supabase()
        doc = {
            "client_id": p.client_id,
            "title": "Contract Amendment",
            "status": "draft",
            "content": p.description,
        }
        res = s.table("documents").insert(doc).execute()
        return {"status": "ok", "document": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/task")
async def create_task(p: TaskPayload):
    try:
        s = supabase()
        task = {
            "client_id": p.client_id,
            "title": p.title,
            "due_at": p.due_at,
            "status": "open",
        }
        # If using a tasks table, insert here. Else rely on Google Sheets endpoint in Next app.
        # We'll store as events for a unified feed.
        s.table("events").insert({"client_id": p.client_id, "type": "task", "meta": task}).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reminder")
async def set_reminder(p: ReminderPayload):
    try:
        s = supabase()
        s.table("events").insert({
            "client_id": p.client_id,
            "type": "reminder",
            "meta": {"cadence_days": p.cadence_days},
        }).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
