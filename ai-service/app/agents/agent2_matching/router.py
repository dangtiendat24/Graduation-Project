from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.vectorstore import get_vector, search_similar, upsert_vector
from app.services.embeddings import create_embedding
from .graph import matching_graph
from .schemas import MatchCriteria, MatchRequest, MatchResponse

router = APIRouter(prefix="/api/ai/matching", tags=["Agent 2 — CV-JD Matching"])

_EMPTY_CRITERIA = MatchCriteria(skills=0, experience=0, education=0)


@router.post("/match", response_model=MatchResponse)
async def match_cv_jd(body: MatchRequest):
    """
    Agent 2: Qdrant cosine similarity + LLM scoring
    → Trả kết quả → NestJS lưu matching_results + transition application sang 'matched'/'rejected'
    """
    if not body.cv_text.strip() or not body.job_text.strip():
        return MatchResponse(
            application_id=body.application_id,
            overall_score=0,
            criteria=_EMPTY_CRITERIA,
            qdrant_similarity=None,
            explanation="",
            recommendation="poor_match",
            success=False,
            error="cv_text hoặc job_text rỗng, không thể chấm điểm",
        )

    result = await matching_graph.ainvoke(
        {
            "profile_id": body.profile_id,
            "job_id": body.job_id,
            "cv_text": body.cv_text,
            "job_text": body.job_text,
            "qdrant_similarity": None,
            "criteria": None,
            "overall_score": None,
            "recommendation": None,
            "explanation": None,
            "error": None,
        }
    )

    if result.get("error") or result.get("criteria") is None:
        return MatchResponse(
            application_id=body.application_id,
            overall_score=0,
            criteria=_EMPTY_CRITERIA,
            qdrant_similarity=result.get("qdrant_similarity"),
            explanation="",
            recommendation="poor_match",
            success=False,
            error=result.get("error") or "Không thể chấm điểm CV-JD",
        )

    return MatchResponse(
        application_id=body.application_id,
        overall_score=result["overall_score"],
        criteria=result["criteria"],
        qdrant_similarity=result["qdrant_similarity"],
        explanation=result["explanation"],
        recommendation=result["recommendation"],
        success=True,
        error=None,
    )


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


class SimilarJobHit(BaseModel):
    job_id: str | None
    score: float


class SimilarJobsResponse(BaseModel):
    profile_id: str
    matches: list[SimilarJobHit]


@router.get("/similar-jobs/{profile_id}", response_model=SimilarJobsResponse)
async def similar_jobs(profile_id: str, top_k: int = 5):
    """
    Similarity search: tìm top-k JD có vector Qdrant gần nhất với CV của profile_id
    (cosine similarity, dùng CV embedding đã upsert qua POST /embeddings/cv).
    """
    cv_vector = await get_vector("cvs", profile_id)
    if cv_vector is None:
        raise HTTPException(status_code=404, detail=f"Chưa có CV embedding cho profile_id={profile_id}")

    hits = await search_similar("jobs", cv_vector, top_k=top_k)
    return SimilarJobsResponse(
        profile_id=profile_id,
        matches=[
            SimilarJobHit(job_id=(hit.payload or {}).get("job_id"), score=hit.score)
            for hit in hits
        ],
    )


@router.get("/health")
async def health():
    return {"agent": "cv_jd_matching", "status": "ok"}
