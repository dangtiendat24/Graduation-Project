from fastapi import APIRouter, Depends, File, Form, Response, UploadFile

from app.services.stt import transcribe_audio_with_signals
from app.services.tts import synthesize_speech
from .adaptive_graph import first_question_graph, turn_graph
from .router import verify_internal_secret
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/ai/interview/adaptive",
    tags=["Agent 3 — AI Interviewer (voice, adaptive)"],
    dependencies=[Depends(verify_internal_secret)],
)


class FirstQuestionRequest(BaseModel):
    session_id: str
    parsed_data: dict
    job_requirements: str


class FirstQuestionResponse(BaseModel):
    session_id: str
    question: dict | None
    success: bool
    error: str | None = None


class TurnRequest(BaseModel):
    session_id: str
    parsed_data: dict
    job_requirements: str
    turn_index: int
    total_questions: int = 7
    history: list[dict] = []
    pending_question: dict
    pending_answer_text: str
    cheating_signals: dict | None = None


class TurnResponse(BaseModel):
    session_id: str
    score: dict | None
    next_question: dict | None
    is_complete: bool
    success: bool
    error: str | None = None


@router.post("/first-question", response_model=FirstQuestionResponse)
async def first_question(body: FirstQuestionRequest):
    """Sinh câu hỏi mở đầu (câu 1) cho voice interview — không cần history vì chưa có lượt nào."""
    if not body.parsed_data or not body.job_requirements.strip():
        return FirstQuestionResponse(
            session_id=body.session_id,
            question=None,
            success=False,
            error="parsed_data hoặc job_requirements rỗng, không thể sinh câu hỏi",
        )

    result = await first_question_graph.ainvoke(
        {
            "parsed_data": body.parsed_data,
            "job_requirements": body.job_requirements,
            "question": None,
            "error": None,
        }
    )

    if result.get("error") or result.get("question") is None:
        return FirstQuestionResponse(
            session_id=body.session_id,
            question=None,
            success=False,
            error=result.get("error") or "Không thể sinh câu hỏi mở đầu",
        )

    return FirstQuestionResponse(session_id=body.session_id, question=result["question"], success=True)


@router.post("/turn", response_model=TurnResponse)
async def turn(body: TurnRequest):
    """
    Mỗi lượt: chấm điểm câu trả lời cho pending_question + sinh câu hỏi kế tiếp (trừ khi
    turn_index == total_questions, khi đó next_question = null và is_complete = true).
    """
    if not body.pending_answer_text.strip():
        return TurnResponse(
            session_id=body.session_id,
            score=None,
            next_question=None,
            is_complete=False,
            success=False,
            error="pending_answer_text rỗng, không có câu trả lời nào để chấm điểm",
        )

    result = await turn_graph.ainvoke(
        {
            "parsed_data": body.parsed_data,
            "job_requirements": body.job_requirements,
            "turn_index": body.turn_index,
            "total_questions": body.total_questions,
            "history": body.history,
            "pending_question": body.pending_question,
            "pending_answer_text": body.pending_answer_text,
            "cheating_signals": body.cheating_signals,
            "score": None,
            "next_question": None,
            "error": None,
        }
    )

    if result.get("error") or result.get("score") is None:
        return TurnResponse(
            session_id=body.session_id,
            score=None,
            next_question=None,
            is_complete=False,
            success=False,
            error=result.get("error") or "Không thể chấm điểm câu trả lời",
        )

    return TurnResponse(
        session_id=body.session_id,
        score=result["score"],
        next_question=result.get("next_question"),
        is_complete=body.turn_index >= body.total_questions,
        success=True,
    )


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """STT — chuyển audio câu trả lời thành transcript qua Groq Whisper, kèm pause_ratio_percent
    (tín hiệu khách quan phụ trợ cho tiêu chí authenticity, xem app/services/stt.py)."""
    audio_bytes = await audio.read()
    result = await transcribe_audio_with_signals(audio_bytes, audio.filename or "answer.webm")
    return {"text": result.text, "pause_ratio_percent": result.pause_ratio_percent}


@router.post("/speak")
async def speak(text: str = Form(...)):
    """TTS — đọc câu hỏi/feedback thành audio (mp3) qua OpenAI TTS."""
    audio_bytes = await synthesize_speech(text)
    return Response(content=audio_bytes, media_type="audio/mpeg")
