from fastapi import APIRouter

from .graph import scheduling_graph
from .schemas import SuggestSlotsRequest, SuggestSlotsResponse

router = APIRouter(prefix="/api/ai/scheduling", tags=["Agent 4 — AI Scheduler"])


@router.post("/suggest-slots", response_model=SuggestSlotsResponse)
async def suggest_slots(body: SuggestSlotsRequest):
    """
    Agent 4: Đọc Google Calendar (freebusy) của HR → tính slot trống trong khung 9h-17h,
    Thứ 2 - Thứ 6 (giờ Việt Nam) → trả về top 3-5 slot gần nhất (sort thời gian tăng dần).
    """
    if body.date_range.end_date < body.date_range.start_date:
        return SuggestSlotsResponse(success=False, error="date_range.end_date phải >= start_date")

    try:
        result = await scheduling_graph.ainvoke(
            {
                "hr_email": body.hr_email,
                "start_date": body.date_range.start_date,
                "end_date": body.date_range.end_date,
                "duration_minutes": body.duration_minutes,
                "access_token": body.access_token,
                "credentials": None,
                "calendar_id": None,
                "busy_periods": None,
                "slots": None,
                "error": None,
            }
        )
    except Exception as exc:  # noqa: BLE001 — muốn luôn trả success=False rõ ràng, không để lộ 500 mập mờ
        return SuggestSlotsResponse(success=False, error=str(exc))

    if result.get("error"):
        return SuggestSlotsResponse(success=False, error=result["error"])

    return SuggestSlotsResponse(success=True, slots=result.get("slots") or [])


@router.get("/health")
async def health():
    return {"agent": "scheduling", "status": "ok"}
