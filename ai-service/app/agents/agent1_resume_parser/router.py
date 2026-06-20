from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 1 not yet implemented")


@router.get("/health")
async def health():
    return {"agent": "resume_parser", "status": "ok"}
