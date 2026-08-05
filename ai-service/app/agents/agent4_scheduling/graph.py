import json
from datetime import date, datetime, time, timedelta
from typing import Optional, TypedDict
from zoneinfo import ZoneInfo

from google.auth.exceptions import RefreshError
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials as OAuthCredentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from langgraph.graph import END, StateGraph

from app.core.config import settings
from .schemas import TimeSlot

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
UTC_TZ = ZoneInfo("UTC")
WORK_START_HOUR = 9
WORK_END_HOUR = 17
CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
MAX_SLOTS = 5


class SchedulingState(TypedDict):
    hr_email: str
    start_date: date
    end_date: date
    duration_minutes: int
    access_token: Optional[str]
    credentials: Optional[service_account.Credentials | OAuthCredentials]
    calendar_id: Optional[str]
    busy_periods: Optional[list[tuple[datetime, datetime]]]
    slots: Optional[list[TimeSlot]]
    error: Optional[str]


def _build_service_account_credentials(hr_email: str) -> service_account.Credentials:
    if not settings.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON:
        raise ValueError(
            "Google Calendar chưa được cấu hình cho hệ thống (thiếu "
            "GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON) — liên hệ quản trị viên để thiết lập."
        )
    info = json.loads(settings.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON)
    base_credentials = service_account.Credentials.from_service_account_info(
        info, scopes=CALENDAR_SCOPES
    )
    # Domain-wide delegation: impersonate hr_email để đọc đúng lịch rảnh/bận của người đó
    # mà không cần hr_email tự thực hiện OAuth thủ công. Chỉ hoạt động với Google Workspace.
    return base_credentials.with_subject(hr_email)


async def auth_check_node(state: SchedulingState) -> SchedulingState:
    try:
        access_token = state.get("access_token")
        if access_token:
            # OAuth per-HR (BE quản lý refresh, luôn truyền access_token còn hạn) — hoạt động
            # với mọi tài khoản Google, không cần Workspace. "primary" = calendar của chính
            # chủ token, không cần biết hr_email để impersonate.
            credentials = OAuthCredentials(token=access_token, scopes=CALENDAR_SCOPES)
            calendar_id = "primary"
        else:
            credentials = _build_service_account_credentials(state["hr_email"])
            calendar_id = state["hr_email"]
        return {
            **state,
            "credentials": credentials,
            "calendar_id": calendar_id,
            "error": None,
        }
    except (ValueError, json.JSONDecodeError, KeyError) as exc:
        return {**state, "error": str(exc)}


def _to_rfc3339_utc(dt: datetime) -> str:
    return dt.astimezone(UTC_TZ).isoformat().replace("+00:00", "Z")


def _parse_google_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(VN_TZ)


def _access_hint(state: SchedulingState) -> str:
    """Gợi ý khắc phục phù hợp với chế độ auth đang dùng (OAuth per-HR hay service account)."""
    if state.get("access_token"):
        return (
            "Có thể do: Google Calendar API chưa được bật cho project, hoặc HR chưa cấp đủ "
            "quyền — vui lòng kết nối lại Google Calendar."
        )
    return (
        "HR có thể chưa cấp quyền/chưa nằm trong domain được ủy quyền domain-wide delegation "
        "— vui lòng liên hệ quản trị viên."
    )


async def fetch_busy_node(state: SchedulingState) -> SchedulingState:
    hr_email = state["hr_email"]
    calendar_id = state["calendar_id"]
    time_min = datetime.combine(state["start_date"], time.min, tzinfo=VN_TZ)
    time_max = datetime.combine(state["end_date"] + timedelta(days=1), time.min, tzinfo=VN_TZ)

    try:
        service = build("calendar", "v3", credentials=state["credentials"], cache_discovery=False)
        response = (
            service.freebusy()
            .query(
                body={
                    "timeMin": _to_rfc3339_utc(time_min),
                    "timeMax": _to_rfc3339_utc(time_max),
                    "timeZone": "UTC",
                    "items": [{"id": calendar_id}],
                }
            )
            .execute()
        )

        calendar_result = response.get("calendars", {}).get(calendar_id, {})
        api_errors = calendar_result.get("errors")
        if api_errors:
            reason = api_errors[0].get("reason", "unknown")
            return {
                **state,
                "error": (
                    f"Không thể đọc lịch Google Calendar của {hr_email} (lý do: {reason}). "
                    f"{_access_hint(state)}"
                ),
            }

        busy_periods = [
            (_parse_google_datetime(b["start"]), _parse_google_datetime(b["end"]))
            for b in calendar_result.get("busy", [])
        ]
        return {**state, "busy_periods": busy_periods, "error": None}

    except (HttpError, RefreshError) as exc:
        return {
            **state,
            "error": (
                f"Google Calendar từ chối truy cập lịch của {hr_email}: {exc}. "
                f"{_access_hint(state)}"
            ),
        }
    except Exception as exc:  # noqa: BLE001 — không để lộ 500 mập mờ, luôn trả success=False rõ ràng
        return {**state, "error": str(exc)}


def _day_working_window(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(WORK_START_HOUR, 0), tzinfo=VN_TZ)
    end = datetime.combine(day, time(WORK_END_HOUR, 0), tzinfo=VN_TZ)
    return start, end


def _subtract_busy(
    window_start: datetime,
    window_end: datetime,
    busy_periods: list[tuple[datetime, datetime]],
) -> list[tuple[datetime, datetime]]:
    """Trừ các khoảng busy giao với [window_start, window_end), trả về các khoảng free còn lại."""
    free = [(window_start, window_end)]
    for busy_start, busy_end in busy_periods:
        next_free = []
        for free_start, free_end in free:
            if busy_end <= free_start or busy_start >= free_end:
                next_free.append((free_start, free_end))
                continue
            if busy_start > free_start:
                next_free.append((free_start, busy_start))
            if busy_end < free_end:
                next_free.append((busy_end, free_end))
        free = next_free
    return free


async def compute_slots_node(state: SchedulingState) -> SchedulingState:
    """Thuần toán học (không gọi LLM) — chia các khoảng free trong giờ hành chính thành slot cố định."""
    duration = timedelta(minutes=state["duration_minutes"])
    busy_periods = state.get("busy_periods") or []
    slots: list[TimeSlot] = []

    day = state["start_date"]
    while day <= state["end_date"] and len(slots) < MAX_SLOTS:
        if day.weekday() < 5:  # Thứ 2 (0) - Thứ 6 (4), giờ Việt Nam
            window_start, window_end = _day_working_window(day)
            day_busy = [b for b in busy_periods if b[1] > window_start and b[0] < window_end]
            for free_start, free_end in _subtract_busy(window_start, window_end, day_busy):
                cursor = free_start
                while cursor + duration <= free_end and len(slots) < MAX_SLOTS:
                    slots.append(TimeSlot(start=cursor, end=cursor + duration))
                    cursor += duration
        day += timedelta(days=1)

    return {**state, "slots": slots, "error": None}


def _route_after(state: SchedulingState) -> str:
    return "continue" if not state.get("error") else "end"


def _build_graph():
    graph = StateGraph(SchedulingState)
    graph.add_node("auth_check", auth_check_node)
    graph.add_node("fetch_busy", fetch_busy_node)
    graph.add_node("compute_slots", compute_slots_node)
    graph.set_entry_point("auth_check")
    graph.add_conditional_edges("auth_check", _route_after, {"continue": "fetch_busy", "end": END})
    graph.add_conditional_edges("fetch_busy", _route_after, {"continue": "compute_slots", "end": END})
    graph.add_edge("compute_slots", END)
    return graph.compile()


scheduling_graph = _build_graph()
