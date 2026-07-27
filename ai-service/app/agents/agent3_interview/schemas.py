from typing import Literal

from pydantic import BaseModel, Field

QuestionCategory = Literal["technical", "situational", "behavioral"]
QuestionDifficulty = Literal["easy", "medium", "hard"]


class GeneratedQuestionItem(BaseModel):
    """1 câu hỏi phỏng vấn do LLM sinh — id được gán sau ở graph.py, LLM không tự sinh id"""

    question: str = Field(description="Nội dung câu hỏi, phải bám sát CV ứng viên và JD cụ thể")
    category: QuestionCategory
    difficulty: QuestionDifficulty


class GeneratedQuestions(BaseModel):
    """LLM structured output — 5-7 câu hỏi, bắt buộc đủ cả 3 nhóm category (xem SYSTEM_PROMPT trong graph.py)"""

    questions: list[GeneratedQuestionItem] = Field(min_length=5, max_length=7)
