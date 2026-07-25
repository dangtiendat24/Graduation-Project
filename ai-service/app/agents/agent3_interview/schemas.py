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


class AnswerScoreItem(BaseModel):
    """
    LLM structured output — điểm 1 câu trả lời phỏng vấn.
    4 tiêu chí phụ theo PRD v3.1 Section 8, MỖI tiêu chí trên thang 0-25 (không phải 0-10).
    total (0-100) và overall_score (công thức B1) được tính ở graph.py, LLM không tự cộng tổng.
    """

    relevance: int = Field(ge=0, le=25, description="Mức độ bám sát và trả lời đúng trọng tâm câu hỏi")
    clarity: int = Field(ge=0, le=25, description="Độ rõ ràng, mạch lạc, dễ hiểu của câu trả lời")
    depth: int = Field(ge=0, le=25, description="Độ sâu, chi tiết, ví dụ cụ thể của câu trả lời")
    correctness: int = Field(ge=0, le=25, description="Độ chính xác về mặt kỹ thuật/kiến thức")
    comment: str = Field(description="Nhận xét ngắn gọn (1-2 câu, tiếng Việt) cho câu trả lời này")
