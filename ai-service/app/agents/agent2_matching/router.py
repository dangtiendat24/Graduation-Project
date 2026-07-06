from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.vectorstore import upsert_vector
from app.services.embeddings import create_embedding

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


class EmbedCvRequest(BaseModel):
    profile_id: str  # candidate_profiles.id (UUID)
    cv_text: str


class EmbedJobRequest(BaseModel):
    job_id: str  # jobs.id (UUID)
    job_text: str


class EmbedResponse(BaseModel):
    success: bool
    error: str | None = None


@router.post("/embeddings/cv", response_model=EmbedResponse)
async def embed_cv(body: EmbedCvRequest):
    """Tạo embedding cho CV và upsert vào collection Qdrant `cvs` (gọi sau khi Agent 1 parse xong CV)."""
    if not body.cv_text.strip():
        return EmbedResponse(success=False, error="cv_text rỗng, không thể tạo embedding")

    try:
        vector = await create_embedding(body.cv_text)
        await upsert_vector("cvs", body.profile_id, vector, {"profile_id": body.profile_id})
        return EmbedResponse(success=True)
    except Exception as exc:  # noqa: BLE001 — muốn bắt mọi lỗi từ embedding/Qdrant để trả về success=False
        return EmbedResponse(success=False, error=str(exc))


@router.post("/embeddings/job", response_model=EmbedResponse)
async def embed_job(body: EmbedJobRequest):
    """Tạo embedding cho Job và upsert vào collection Qdrant `jobs` (gọi khi recruitment-be tạo/cập nhật job)."""
    if not body.job_text.strip():
        return EmbedResponse(success=False, error="job_text rỗng, không thể tạo embedding")

    try:
        vector = await create_embedding(body.job_text)
        await upsert_vector("jobs", body.job_id, vector, {"job_id": body.job_id})
        return EmbedResponse(success=True)
    except Exception as exc:  # noqa: BLE001
        return EmbedResponse(success=False, error=str(exc))


@router.get("/health")
async def health():
    return {"agent": "cv_jd_matching", "status": "ok"}
