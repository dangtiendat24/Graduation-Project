from unittest.mock import AsyncMock, patch

import pytest

from app.agents.agent3_interview.graph import score_answers_node
from app.agents.agent3_interview.schemas import AnswerScoreItem

QUESTIONS = [
    {"id": "q1", "question": "Bạn dùng FastAPI trong dự án nào?", "category": "technical", "difficulty": "medium"},
    {"id": "q2", "question": "Kể một tình huống khó khăn bạn từng gặp.", "category": "behavioral", "difficulty": "medium"},
]


def _base_state(answers: list[dict]) -> dict:
    return {
        "session_id": "session-1",
        "questions": QUESTIONS,
        "answers": answers,
        "scored_answers": None,
        "overall_score": None,
        "transcript": None,
        "error": None,
    }


@pytest.mark.asyncio
async def test_score_answers_node_applies_formula_b1_avg_not_divided_by_4():
    answers = [
        {"question_id": "q1", "answer_text": "Tôi dùng FastAPI ở dự án Acme Corp"},
        {"question_id": "q2", "answer_text": "Có lần production down lúc nửa đêm"},
    ]

    # Regression check theo scoring.constants.ts: {22, 20, 18, 23} -> total=83
    scores = [
        AnswerScoreItem(relevance=22, clarity=20, depth=18, correctness=23, comment="Tốt"),
        AnswerScoreItem(relevance=25, clarity=25, depth=25, correctness=25, comment="Xuất sắc"),
    ]
    fake_llm = AsyncMock()
    fake_llm.ainvoke.side_effect = scores

    with patch("app.agents.agent3_interview.graph._build_llm", return_value=fake_llm):
        result = await score_answers_node(_base_state(answers))

    assert result["error"] is None
    assert result["scored_answers"] is not None
    assert [a["total"] for a in result["scored_answers"]] == [83, 100]
    # AVG(83, 100) = 91.5, KHÔNG chia thêm cho 4
    assert result["overall_score"] == 91.5
    assert "Q: Bạn dùng FastAPI trong dự án nào?" in result["transcript"]
    assert "A: Tôi dùng FastAPI ở dự án Acme Corp" in result["transcript"]


@pytest.mark.asyncio
async def test_score_answers_node_empty_answer_text_returns_error():
    answers = [{"question_id": "q1", "answer_text": "   "}]

    with patch("app.agents.agent3_interview.graph._build_llm"):
        result = await score_answers_node(_base_state(answers))

    assert result["scored_answers"] is None
    assert result["error"] is not None
    assert "answer_text" in result["error"]


@pytest.mark.asyncio
async def test_score_answers_node_unknown_question_id_returns_error():
    answers = [{"question_id": "q999", "answer_text": "Câu trả lời bất kỳ"}]

    with patch("app.agents.agent3_interview.graph._build_llm"):
        result = await score_answers_node(_base_state(answers))

    assert result["scored_answers"] is None
    assert result["error"] is not None
    assert "q999" in result["error"]
    assert "không khớp" in result["error"]


@pytest.mark.asyncio
async def test_score_answers_node_llm_exception_returns_error_not_raised():
    answers = [{"question_id": "q1", "answer_text": "Câu trả lời"}]
    fake_llm = AsyncMock()
    fake_llm.ainvoke.side_effect = RuntimeError("Groq API timeout")

    with patch("app.agents.agent3_interview.graph._build_llm", return_value=fake_llm):
        result = await score_answers_node(_base_state(answers))

    assert result["scored_answers"] is None
    assert result["error"] == "Groq API timeout"
