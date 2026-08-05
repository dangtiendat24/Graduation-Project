from datetime import date, datetime

from pydantic import BaseModel, Field


class DateRange(BaseModel):
    start_date: date
    end_date: date


class SuggestSlotsRequest(BaseModel):
    hr_email: str
    date_range: DateRange
    duration_minutes: int = Field(
        default=45, ge=15, le=240, description="Độ dài mỗi slot phỏng vấn được đề xuất (phút)"
    )
    access_token: str | None = Field(
        default=None,
        description=(
            "OAuth access_token còn hạn của hr_email (BE quản lý refresh) — nếu có, dùng "
            "credentials OAuth thay vì service account domain-wide delegation. Là cách duy nhất "
            "hoạt động khi không có Google Workspace."
        ),
    )


class TimeSlot(BaseModel):
    start: datetime  # tz-aware, +07:00 (Asia/Ho_Chi_Minh)
    end: datetime


class SuggestSlotsResponse(BaseModel):
    slots: list[TimeSlot] = Field(default_factory=list)  # top 3-5 slot, sort thời gian gần nhất trước
    success: bool
    error: str | None = None
