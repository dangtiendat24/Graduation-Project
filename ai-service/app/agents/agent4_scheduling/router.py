from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai/scheduling", tags=["Agent 4 — Scheduling"])


class SuggestSlotsRequest(BaseModel):
    application_id: str
    recruiter_id: str
    candidate_name: str
    job_title: str


class SuggestSlotsResponse(BaseModel):
    application_id: str
    suggested_slots: list[dict]  # [{start_time, end_time}] — 3-5 slots, 45 phút/slot, +07:00
    success: bool
    error: str | None = None


@router.post("/suggest-slots", response_model=SuggestSlotsResponse)
async def suggest_slots(body: SuggestSlotsRequest):
    """
    Agent 4: Đọc Google Calendar của Recruiter → tìm 3-5 slot trống → trả về danh sách
    → NestJS lưu schedules.suggested_slots + gửi email cho Candidate
    Slots luôn: 45 phút, timezone +07:00 (Asia/Ho_Chi_Minh)
    """
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 4 not yet implemented")


@router.get("/health")
async def health():
    return {"agent": "scheduling", "status": "ok"}
