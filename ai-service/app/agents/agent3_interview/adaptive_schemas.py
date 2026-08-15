from typing import Literal

from pydantic import BaseModel, Field

QuestionCategory = Literal["technical", "situational", "behavioral"]
QuestionDifficulty = Literal["easy", "medium", "hard"]


class NextQuestionItem(BaseModel):
    """1 câu hỏi kế tiếp do LLM sinh trong luồng phỏng vấn thích ứng (adaptive) — dùng cho voice interview"""

    question: str = Field(description="Nội dung câu hỏi, phải bám sát CV ứng viên và JD cụ thể")
    category: QuestionCategory
    difficulty: QuestionDifficulty


class VoiceAnswerScore(BaseModel):
    """
    Điểm 1 câu trả lời phỏng vấn voice — 5 tiêu chí phụ, MỖI tiêu chí thang 0-20 (tổng tối đa 100).
    So với rubric text (4 tiêu chí x 0-25), voice interview có thêm "authenticity" để hỗ trợ phát
    hiện câu trả lời không phải do chính ứng viên tự nghĩ ra (đọc thuộc/tra cứu tại chỗ) — đây là
    schema RIÊNG cho voice, không đụng tới AnswerScoreItem của text interview.
    """

    relevance: int = Field(ge=0, le=20, description="Mức độ bám sát và trả lời đúng trọng tâm câu hỏi")
    clarity: int = Field(ge=0, le=20, description="Độ rõ ràng, mạch lạc, dễ hiểu của câu trả lời")
    depth: int = Field(ge=0, le=20, description="Độ sâu, chi tiết, ví dụ cụ thể của câu trả lời")
    correctness: int = Field(ge=0, le=20, description="Độ chính xác về mặt kỹ thuật/kiến thức")
    authenticity: int = Field(
        ge=0,
        le=20,
        description=(
            "Mức độ đáng tin là câu trả lời tự nhiên của chính ứng viên, dựa trên transcript kết hợp "
            "tín hiệu khách quan được cung cấp (số lần rời tab, độ trễ trước khi trả lời). "
            "CHỈ chấm thấp khi có tín hiệu khách quan hỗ trợ (rời tab nhiều lần, trả lời tức thì bất "
            "thường cho câu hỏi khó, văn phong đọc như đang đọc lại một đoạn văn bản đã chuẩn bị sẵn "
            "không tự nhiên) — KHÔNG được chấm thấp chỉ vì ứng viên trả lời trôi chảy/tự tin/có cấu "
            "trúc tốt, đó không phải dấu hiệu gian lận."
        ),
    )
    comment: str = Field(
        description=(
            "Nhận xét ngắn gọn 2-3 câu tiếng Việt, nêu RÕ điểm đã làm tốt và điểm chưa tốt của câu trả "
            "lời — nội dung này sẽ được đọc trực tiếp cho ứng viên nghe ngay sau khi họ trả lời."
        )
    )


class ScoreAndNextResult(BaseModel):
    """LLM structured output cho 1 lượt (turn) của luồng adaptive — luôn có score, next_question có thể null nếu là câu cuối"""

    score: VoiceAnswerScore
    next_question: NextQuestionItem | None = Field(
        default=None,
        description="Câu hỏi kế tiếp — để null nếu đây đã là câu hỏi cuối cùng của bài phỏng vấn",
    )
