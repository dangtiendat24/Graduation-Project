from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai/matching", tags=["Agent 2 — CV-JD Matching"])


class MatchRequest(BaseModel):
    application_id: str  # applications.id (UUID)
    profile_id: str      # candidate_profiles.id — để lấy Qdrant vector
    job_id: str          # jobs.id — để lấy Qdrant vector


class MatchResponse(BaseModel):
    application_id: str
    overall_score: float          # 0-100
    criteria: dict                # {skills, experience, education: 0-100}
    qdrant_similarity: float | None
    explanation: str
    recommendation: str           # strong_match / good_match / partial_match / poor_match
    success: bool
    error: str | None = None


@router.post("/match", response_model=MatchResponse)
async def match_cv_jd(body: MatchRequest):
    """
    Agent 2: Qdrant cosine similarity + LLM scoring
    → Trả kết quả → NestJS lưu matching_results + transition application sang 'matched'/'rejected'
    """
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 2 not yet implemented")


@router.get("/health")
async def health():
    return {"agent": "cv_jd_matching", "status": "ok"}
