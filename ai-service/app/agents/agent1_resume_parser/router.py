from fastapi import APIRouter
from pydantic import BaseModel

from .graph import resume_parser_graph

router = APIRouter(prefix="/api/ai/resume-parser", tags=["Agent 1 — Resume Parser"])


class ParseResumeRequest(BaseModel):
    profile_id: str   # candidate_profiles.id (UUID)
    cv_raw_text: str  # Text đã extract từ PDF/DOCX ở NestJS


class ParseResumeResponse(BaseModel):
    profile_id: str
    parsed_data: dict
    success: bool
    error: str | None = None


@router.post("/parse", response_model=ParseResumeResponse)
async def parse_resume(body: ParseResumeRequest):
    """
    Agent 1: Nhận raw text từ CV → LangGraph graph extract structured data
    → Trả về parsed_data JSON → NestJS lưu vào candidate_profiles.parsed_data
    """
    if not body.cv_raw_text.strip():
        return ParseResumeResponse(
            profile_id=body.profile_id,
            parsed_data={},
            success=False,
            error="cv_raw_text rỗng, không thể trích xuất",
        )

    result = await resume_parser_graph.ainvoke(
        {"cv_raw_text": body.cv_raw_text, "parsed_data": None, "error": None}
    )

    if result.get("error") or result.get("parsed_data") is None:
        return ParseResumeResponse(
            profile_id=body.profile_id,
            parsed_data={},
            success=False,
            error=result.get("error") or "Không trích xuất được dữ liệu từ CV",
        )

    return ParseResumeResponse(
        profile_id=body.profile_id,
        parsed_data=result["parsed_data"].model_dump(),
        success=True,
        error=None,
    )


@router.get("/health")
async def health():
    return {"agent": "resume_parser", "status": "ok"}
