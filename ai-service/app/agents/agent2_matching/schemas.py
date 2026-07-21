from pydantic import BaseModel, Field


class MatchingWeights(BaseModel):
    """
    Trọng số tính overall_score. Nguồn chân lý là packages/shared/scoring.constants.ts
    (MATCHING_WEIGHTS mặc định, hoặc Job.scoringWeights nếu recruiter cấu hình riêng) —
    NestJS resolve rồi gửi kèm request, ai-service không tự giữ bản hardcode nào (P4).
    """

    skills: float = Field(ge=0, le=1)
    experience: float = Field(ge=0, le=1)
    education: float = Field(ge=0, le=1)


class MatchRequest(BaseModel):
    application_id: str  # applications.id (UUID)
    profile_id: str       # candidate_profiles.id — để lấy Qdrant vector CV
    job_id: str            # jobs.id — để lấy Qdrant vector JD
    cv_text: str            # Text CV (tóm tắt/kỹ năng/kinh nghiệm) — NestJS build từ candidate_resumes
    job_text: str           # Text JD (title/description/requirements) — NestJS build từ jobs
    cv_skills: list[str] = Field(default_factory=list, description="application.parsedSkills")
    job_skills: list[str] = Field(default_factory=list, description="job.requiredSkills")
    weights: MatchingWeights | None = Field(
        default=None, description="Resolved bởi NestJS từ MATCHING_WEIGHTS hoặc Job.scoringWeights"
    )


class SkillBreakdown(BaseModel):
    """3 tầng điểm kỹ năng độc lập — cho phép truy vết lại skills_score (explainability)"""

    keyword: float = Field(ge=0, le=100, description="Matched skills ÷ total required skills")
    tfidf: float = Field(ge=0, le=100, description="TF-IDF cosine similarity giữa cv_text và job_text")
    semantic: float = Field(ge=0, le=100, description="Qdrant embedding cosine similarity CV↔JD")


class MatchCriteria(BaseModel):
    """Khớp với MatchingCriteriaSchema trong packages/shared/schemas/parsed-cv.schema.ts"""

    skills: float = Field(ge=0, le=100)
    experience: float = Field(ge=0, le=100)
    education: float = Field(ge=0, le=100)
    skill_breakdown: SkillBreakdown | None = None


class MatchAnalysis(BaseModel):
    """LLM structured output — chỉ chấm experience/education; skills_score do thuật toán tính (xem SkillBreakdown)"""

    experience_score: float = Field(ge=0, le=100, description="Điểm phù hợp kinh nghiệm làm việc, 0-100")
    education_score: float = Field(ge=0, le=100, description="Điểm phù hợp học vấn/bằng cấp, 0-100")
    explanation: str = Field(
        description=(
            "Giải thích chi tiết bằng tiếng Việt: breakdown điểm theo kỹ năng/kinh nghiệm/học vấn "
            "(kỹ năng đã được chấm sẵn bằng thuật toán), điểm mạnh của ứng viên, điểm còn thiếu sót so với JD"
        )
    )


class MatchResponse(BaseModel):
    application_id: str
    overall_score: float          # 0-100, = Σ(criteria[i] × weights[i]) — xem MatchRequest.weights
    criteria: MatchCriteria       # {skills, experience, education: 0-100}
    qdrant_similarity: float | None  # cosine similarity CV↔JD quy đổi sang thang 0-100
    explanation: str
    recommendation: str           # strong_match / good_match / partial_match / poor_match
    success: bool
    error: str | None = None
