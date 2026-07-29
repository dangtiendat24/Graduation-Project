import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from .graph import interview_graph, score_answers_graph

router = APIRouter(prefix="/api/ai/interview", tags=["Agent 3 — AI Interviewer"])


def verify_internal_secret(x_internal_secret: str = Header(default="")) -> None:
    """
    Chỉ NestJS BE mới được gọi 2 endpoint sinh câu hỏi / chấm điểm (tốn phí Groq API).
    So sánh bằng secrets.compare_digest để tránh timing attack.
    """
    if not settings.BE_INTERNAL_SECRET or not secrets.compare_digest(
        x_internal_secret, settings.BE_INTERNAL_SECRET
    ):
        raise HTTPException(status_code=403, detail="Thiếu hoặc sai X-Internal-Secret")


class GenerateQuestionsRequest(BaseModel):
    session_id: str      # interview_sessions.id (UUID)
    application_id: str
    parsed_data: dict    # candidate_profiles.parsed_data
    job_requirements: str


class GenerateQuestionsResponse(BaseModel):
    session_id: str
    questions: list[dict]  # [{id, question, category, difficulty}]
    success: bool
    error: str | None = None


class ScoreAnswersRequest(BaseModel):
    session_id: str
    questions: list[dict]  # [{id, question, category, difficulty, expected_keywords?}] — bộ câu hỏi đã sinh ở /generate-questions cho session này, dùng để lấy nội dung câu hỏi và validate question_id
    answers: list[dict]    # [{question_id, answer_text, audio_url?}]


class ScoreAnswersResponse(BaseModel):
    session_id: str
    scored_answers: list[dict]   # [{question_id, question, answer_text, scores: {relevance, clarity, depth, correctness}, total, comment}]
    overall_score: float         # Công thức B1: AVG(answers[*].total), mỗi total = tổng 4 tiêu chí thang 0-25 (0-100), KHÔNG chia 4
    transcript: str
    success: bool
    error: str | None = None


@router.post(
    "/generate-questions",
    response_model=GenerateQuestionsResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def generate_questions(body: GenerateQuestionsRequest):
    """
    Agent 3 Step 1: Sinh câu hỏi phỏng vấn dựa trên CV và JD
    """
    if not body.parsed_data or not body.job_requirements.strip():
        return GenerateQuestionsResponse(
            session_id=body.session_id,
            questions=[],
            success=False,
            error="parsed_data hoặc job_requirements rỗng, không thể sinh câu hỏi",
        )

    result = await interview_graph.ainvoke(
        {
            "parsed_data": body.parsed_data,
            "job_requirements": body.job_requirements,
            "questions": None,
            "error": None,
        }
    )

    if result.get("error") or result.get("questions") is None:
        return GenerateQuestionsResponse(
            session_id=body.session_id,
            questions=[],
            success=False,
            error=result.get("error") or "Không thể sinh câu hỏi phỏng vấn",
        )

    return GenerateQuestionsResponse(
        session_id=body.session_id,
        questions=result["questions"],
        success=True,
        error=None,
    )


@router.post(
    "/score-answers",
    response_model=ScoreAnswersResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def score_answers(body: ScoreAnswersRequest):
    """
    Agent 3 Step 2: Chấm điểm câu trả lời phỏng vấn.
    Mỗi câu chấm theo 4 tiêu chí phụ (relevance, clarity, depth, correctness), MỖI tiêu chí
    thang điểm 0-25 (PRD v3.1 Section 8) → total/câu = tổng 4 tiêu chí (thang 0-100).
    Công thức B1 (đã chốt): overall_score = AVG(answers[*].total), KHÔNG chia 4.
    """
    if not body.answers:
        return ScoreAnswersResponse(
            session_id=body.session_id,
            scored_answers=[],
            overall_score=0,
            transcript="",
            success=False,
            error="answers rỗng, không có câu trả lời nào để chấm điểm",
        )

    result = await score_answers_graph.ainvoke(
        {
            "session_id": body.session_id,
            "questions": body.questions,
            "answers": body.answers,
            "scored_answers": None,
            "overall_score": None,
            "transcript": None,
            "error": None,
        }
    )

    if result.get("error") or result.get("scored_answers") is None:
        return ScoreAnswersResponse(
            session_id=body.session_id,
            scored_answers=[],
            overall_score=0,
            transcript="",
            success=False,
            error=result.get("error") or "Không thể chấm điểm câu trả lời phỏng vấn",
        )

    return ScoreAnswersResponse(
        session_id=body.session_id,
        scored_answers=result["scored_answers"],
        overall_score=result["overall_score"],
        transcript=result["transcript"] or "",
        success=True,
        error=None,
    )


@router.get("/health")
async def health():
    return {"agent": "ai_interviewer", "status": "ok"}
