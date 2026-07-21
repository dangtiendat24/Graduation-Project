from pydantic import BaseModel, Field


class ParsedCvExperience(BaseModel):
    title: str = Field(default="", description="Chức danh / vị trí công việc")
    company: str = Field(default="", description="Tên công ty")
    period: str = Field(default="", description="Thời gian làm việc, VD '2022 - 2024'")
    description: str = Field(default="", description="Mô tả ngắn gọn công việc đã làm")


class ParsedCvEducation(BaseModel):
    school: str = Field(default="", description="Tên trường")
    degree: str = Field(default="", description="Bằng cấp, VD 'Cử nhân', 'Thạc sĩ'")
    year: str = Field(default="", description="Năm tốt nghiệp hoặc niên khóa")


class ParsedCv(BaseModel):
    """Khớp với ParsedCvSchema trong packages/shared/schemas/parsed-cv.schema.ts"""

    name: str = Field(default="", description="Họ tên ứng viên")
    email: str | None = Field(default=None, description="Email liên hệ nếu có trong CV")
    phone: str | None = Field(default=None, description="Số điện thoại nếu có trong CV")
    summary: str = Field(
        default="",
        description=(
            "Tóm tắt về ứng viên — luôn viết bằng tiếng Việt dù CV gốc là ngôn ngữ nào. "
            "Định dạng: 3-4 gạch đầu dòng ngắn gọn, mỗi dòng bắt đầu bằng '• ' và cách nhau "
            "bằng ký tự xuống dòng (\\n) — KHÔNG viết thành 1 đoạn văn dài liền mạch. "
            "Mỗi dòng nêu đúng 1 ý: học vấn/trình độ hiện tại, kỹ năng nổi bật, "
            "kinh nghiệm/dự án đáng chú ý (nếu có), mục tiêu nghề nghiệp (nếu có)."
        ),
    )
    skills: list[str] = Field(default_factory=list, description="Danh sách kỹ năng")
    experience: list[ParsedCvExperience] = Field(default_factory=list)
    education: list[ParsedCvEducation] = Field(default_factory=list)
