from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai/interview", tags=["Agent 3 — AI Interviewer"])


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
    answers: list[dict]  # [{question_id, answer_text, audio_url?}]


class ScoreAnswersResponse(BaseModel):
    session_id: str
    scored_answers: list[dict]   # [{question_id, scores, total}]
    overall_score: float         # AVG(answers[*].total)
    transcript: str
    success: bool
    error: str | None = None


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(body: GenerateQuestionsRequest):
    """
    Agent 3 Step 1: Sinh câu hỏi phỏng vấn dựa trên CV và JD
    """
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 3 generate-questions not yet implemented")


@router.post("/score-answers", response_model=ScoreAnswersResponse)
async def score_answers(body: ScoreAnswersRequest):
    """
    Agent 3 Step 2: Chấm điểm câu trả lời (relevance + clarity + depth + correctness)
    Công thức B1: overall = AVG(answers[*].total), KHÔNG chia 4
    """
    # TODO: implement graph.ainvoke()
    raise HTTPException(status_code=501, detail="Agent 3 score-answers not yet implemented")


@router.get("/health")
async def health():
    return {"agent": "ai_interviewer", "status": "ok"}
