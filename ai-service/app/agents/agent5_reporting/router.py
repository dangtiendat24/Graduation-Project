from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai/reporting", tags=["Agent 5 — Report Generator"])


class GenerateReportRequest(BaseModel):
    application_id: str
    match_score: float | None
    match_criteria: dict | None     # {skills, experience, education}
    interview_score: float | None   # None nếu nhánh auto-reject
    overall_score: float | None
    parsed_data: dict               # CV data
    job_title: str
    job_requirements: str


class GenerateReportResponse(BaseModel):
    application_id: str
    summary: str
    strengths: list[str]    # 2-5 phần tử, tiếng Việt
    weaknesses: list[str]   # 2-5 phần tử, tiếng Việt
    recommendation: str     # pass / fail / review
    success: bool
    error: str | None = None


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(body: GenerateReportRequest):
    """
    Agent 5: Tổng hợp kết quả matching + interview → sinh báo cáo đánh giá ứng viên
    → NestJS lưu candidate_reports + render PDF bằng Puppeteer
    Lưu ý: agent vẫn chạy kể cả nhánh auto-reject (interview_score=None)
    """
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 5 not yet implemented")


@router.get("/health")
async def health():
    return {"agent": "report_generator", "status": "ok"}
