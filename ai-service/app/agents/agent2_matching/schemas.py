from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    application_id: str  # applications.id (UUID)
    profile_id: str       # candidate_profiles.id — để lấy Qdrant vector CV
    job_id: str            # jobs.id — để lấy Qdrant vector JD
    cv_text: str            # Text CV (tóm tắt/kỹ năng/kinh nghiệm) — NestJS build từ candidate_resumes
    job_text: str           # Text JD (title/description/requirements) — NestJS build từ jobs


class MatchCriteria(BaseModel):
    """Khớp với MatchingCriteriaSchema trong packages/shared/schemas/parsed-cv.schema.ts"""

    skills: float = Field(ge=0, le=100)
    experience: float = Field(ge=0, le=100)
    education: float = Field(ge=0, le=100)


class MatchAnalysis(BaseModel):
    """LLM structured output — phân tích chuyên sâu độ phù hợp CV-JD"""

    skills_score: float = Field(ge=0, le=100, description="Điểm phù hợp kỹ năng chuyên môn, 0-100")
    experience_score: float = Field(ge=0, le=100, description="Điểm phù hợp kinh nghiệm làm việc, 0-100")
    education_score: float = Field(ge=0, le=100, description="Điểm phù hợp học vấn/bằng cấp, 0-100")
    explanation: str = Field(
        description=(
            "Giải thích chi tiết bằng tiếng Việt: breakdown điểm theo kỹ năng/kinh nghiệm/học vấn, "
            "điểm mạnh của ứng viên, điểm còn thiếu sót so với JD"
        )
    )


class MatchResponse(BaseModel):
    application_id: str
    overall_score: float          # 0-100, = skills*0.45 + experience*0.35 + education*0.20
    criteria: MatchCriteria       # {skills, experience, education: 0-100}
    qdrant_similarity: float | None  # cosine similarity CV↔JD quy đổi sang thang 0-100
    explanation: str
    recommendation: str           # strong_match / good_match / partial_match / poor_match
    success: bool
    error: str | None = None
