from unittest.mock import AsyncMock, patch

import pytest

from app.agents.agent3_interview.graph import generate_questions_node
from app.agents.agent3_interview.schemas import GeneratedQuestionItem, GeneratedQuestions

PARSED_DATA = {
    "name": "Nguyen Van A",
    "summary": "Backend engineer 3 năm kinh nghiệm",
    "skills": ["Python", "FastAPI", "PostgreSQL"],
    "experience": [
        {
            "title": "Backend Engineer",
            "company": "Acme Corp",
            "period": "2022 - 2024",
            "description": "Xây dựng API microservices bằng FastAPI",
        }
    ],
    "education": [{"school": "Đại học Bách Khoa", "degree": "Cử nhân", "year": "2021"}],
}

JOB_REQUIREMENTS = "Tuyển Backend Engineer, ưu tiên FastAPI, PostgreSQL, microservices"


def _fake_questions(categories: list[str]) -> GeneratedQuestions:
    return GeneratedQuestions(
        questions=[
            GeneratedQuestionItem(question=f"Câu hỏi {i}", category=cat, difficulty="medium")
            for i, cat in enumerate(categories)
        ]
    )


def _base_state() -> dict:
    return {
        "parsed_data": PARSED_DATA,
        "job_requirements": JOB_REQUIREMENTS,
        "questions": None,
        "error": None,
    }


@pytest.mark.asyncio
async def test_generate_questions_node_success():
    fake_llm = AsyncMock()
    fake_llm.ainvoke.return_value = _fake_questions(
        ["technical", "technical", "situational", "behavioral", "technical"]
    )

    with patch("app.agents.agent3_interview.graph._build_llm", return_value=fake_llm):
        result = await generate_questions_node(_base_state())

    assert result["error"] is None
    assert result["questions"] is not None
    assert len(result["questions"]) == 5
    assert {q["category"] for q in result["questions"]} == {"technical", "situational", "behavioral"}
    assert [q["id"] for q in result["questions"]] == ["q1", "q2", "q3", "q4", "q5"]


@pytest.mark.asyncio
async def test_generate_questions_node_missing_category_returns_error():
    fake_llm = AsyncMock()
    # Chỉ sinh toàn nhóm "technical" — vi phạm yêu cầu phải đủ cả 3 nhóm
    fake_llm.ainvoke.return_value = _fake_questions(["technical"] * 5)

    with patch("app.agents.agent3_interview.graph._build_llm", return_value=fake_llm):
        result = await generate_questions_node(_base_state())

    assert result["questions"] is None
    assert result["error"] is not None
    assert "situational" in result["error"]
    assert "behavioral" in result["error"]


@pytest.mark.asyncio
async def test_generate_questions_node_llm_exception_returns_error_not_raised():
    fake_llm = AsyncMock()
    fake_llm.ainvoke.side_effect = RuntimeError("Groq API timeout")

    with patch("app.agents.agent3_interview.graph._build_llm", return_value=fake_llm):
        result = await generate_questions_node(_base_state())

    assert result["questions"] is None
    assert result["error"] == "Groq API timeout"
