import asyncio
from typing import Optional, TypedDict, cast

from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import SecretStr

from app.core.config import settings
from .schemas import AnswerScoreItem, GeneratedQuestions

REQUIRED_CATEGORIES = {"technical", "situational", "behavioral"}

SYSTEM_PROMPT = (
    "Bạn là chuyên gia phỏng vấn kỹ thuật (technical interviewer) giàu kinh nghiệm. "
    "Nhiệm vụ: dựa vào CV ứng viên (đã trích xuất) và mô tả công việc (JD) bên dưới, "
    "soạn 5-7 câu hỏi phỏng vấn.\n\n"
    "YÊU CẦU BẮT BUỘC:\n"
    "1. Danh sách trả về PHẢI có đủ cả 3 nhóm category, không được chỉ tập trung 1 nhóm:\n"
    "   - technical: kiểm tra kiến thức/kỹ năng chuyên môn nêu trong CV và JD\n"
    "   - situational: đặt ứng viên vào một tình huống giả định liên quan công việc để xem cách xử lý\n"
    "   - behavioral: khai thác kinh nghiệm/hành vi thực tế đã xảy ra trong quá khứ (dự án, công ty cụ thể trong CV)\n"
    "2. Câu hỏi phải bám sát nội dung THẬT trong CV (kỹ năng, dự án, công ty, chức danh cụ thể) và JD — "
    "KHÔNG được sinh câu hỏi chung chung, hỏi ứng viên nào cũng được.\n"
    "   ĐÚNG: 'CV có ghi bạn dùng React và Node.js trong dự án tại công ty X — bạn đã giải quyết vấn đề gì "
    "khó khăn nhất khi triển khai dự án đó?'\n"
    "   SAI: 'Bạn hãy giới thiệu về bản thân.' (chung chung, không gắn với CV/JD cụ thể)\n"
    "3. difficulty phải phản ánh đúng độ khó: easy (kiến thức cơ bản), medium (áp dụng thực tế/kinh nghiệm), "
    "hard (chuyên sâu/phân tích/thiết kế hệ thống).\n"
    "4. Không đặt 2 câu hỏi trùng ý nhau."
)


class InterviewState(TypedDict):
    parsed_data: dict
    job_requirements: str
    questions: Optional[list[dict]]
    error: Optional[str]


def _build_llm(output_schema):
    """Tạo ChatGroq client với structured output theo `output_schema` — dùng chung cho mọi node của agent3."""
    return ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=SecretStr(settings.GROQ_API_KEY),
        temperature=0.3,
    ).with_structured_output(output_schema, method="json_schema")


def _format_parsed_data(parsed_data: dict) -> str:
    """Chuyển candidate_profiles.parsed_data (khớp ParsedCv ở agent1) thành text đọc được cho prompt"""
    lines = [f"Họ tên: {parsed_data.get('name') or 'N/A'}"]

    summary = parsed_data.get("summary")
    if summary:
        lines.append(f"Tóm tắt: {summary}")

    skills = parsed_data.get("skills") or []
    if skills:
        lines.append(f"Kỹ năng: {', '.join(str(s) for s in skills)}")

    experience = parsed_data.get("experience") or []
    if experience:
        lines.append("Kinh nghiệm làm việc:")
        for exp in experience:
            if not isinstance(exp, dict):
                continue
            title = exp.get("title", "")
            company = exp.get("company", "")
            period = exp.get("period", "")
            description = exp.get("description", "")
            lines.append(f"  - {title} tại {company} ({period}): {description}")

    education = parsed_data.get("education") or []
    if education:
        lines.append("Học vấn:")
        for edu in education:
            if not isinstance(edu, dict):
                continue
            degree = edu.get("degree", "")
            school = edu.get("school", "")
            year = edu.get("year", "")
            lines.append(f"  - {degree}, {school} ({year})")

    return "\n".join(lines)


async def generate_questions_node(state: InterviewState) -> InterviewState:
    try:
        llm = _build_llm(GeneratedQuestions)
        human_message = (
            f"--- Hồ sơ ứng viên (CV đã trích xuất) ---\n{_format_parsed_data(state['parsed_data'])}\n\n"
            f"--- Mô tả công việc (JD) ---\n{state['job_requirements']}"
        )
        result = cast(
            GeneratedQuestions,
            await llm.ainvoke([("system", SYSTEM_PROMPT), ("human", human_message)]),
        )

        categories = {q.category for q in result.questions}
        missing = REQUIRED_CATEGORIES - categories
        if missing:
            return {
                **state,
                "error": f"LLM không sinh đủ cả 3 nhóm câu hỏi, thiếu: {', '.join(sorted(missing))}",
            }

        questions = [
            {
                "id": f"q{idx + 1}",
                "question": q.question,
                "category": q.category,
                "difficulty": q.difficulty,
            }
            for idx, q in enumerate(result.questions)
        ]
        return {**state, "questions": questions, "error": None}
    except Exception as exc:  # noqa: BLE001 — muốn bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "error": str(exc)}


def _build_graph():
    graph = StateGraph(InterviewState)
    graph.add_node("generate_questions", generate_questions_node)
    graph.set_entry_point("generate_questions")
    graph.add_edge("generate_questions", END)
    return graph.compile()


interview_graph = _build_graph()


# =============================================================
# Scoring flow (Agent 3 Step 2) — PRD v3.1 Section 8:
#   - Mỗi câu trả lời chấm theo 4 tiêu chí phụ: relevance, clarity, depth, correctness
#   - MỖI tiêu chí trên thang 0-25 (không phải 0-10) → total/câu tối đa 100
#   - Công thức B1 (đã chốt): overall_score = AVG(answers[*].total), KHÔNG chia 4
# =============================================================

SCORE_COMPONENTS = ("relevance", "clarity", "depth", "correctness")

SCORING_SYSTEM_PROMPT = (
    "Bạn là chuyên gia phỏng vấn kỹ thuật (technical interviewer) giàu kinh nghiệm, "
    "đang chấm điểm một câu trả lời phỏng vấn của ứng viên.\n\n"
    "Chấm theo đúng 4 tiêu chí sau, MỖI tiêu chí trên thang điểm nguyên 0-25 (không phải 0-10):\n"
    "- relevance: câu trả lời có bám sát và giải quyết đúng trọng tâm câu hỏi không\n"
    "- clarity: câu trả lời có rõ ràng, mạch lạc, dễ hiểu không\n"
    "- depth: câu trả lời có đủ chiều sâu, chi tiết, ví dụ cụ thể không, hay chỉ hời hợt\n"
    "- correctness: nội dung có chính xác về mặt kỹ thuật/kiến thức không\n\n"
    "Nếu ứng viên không trả lời hoặc trả lời không liên quan gì đến câu hỏi, chấm điểm thấp "
    "(gần 0) ở tất cả tiêu chí, không chấm nương tay.\n"
    "Nếu đề bài có gợi ý 'từ khóa kỳ vọng', chỉ dùng chúng như TÍN HIỆU PHỤ để đánh giá depth/correctness, "
    "KHÔNG chấm rớt chỉ vì ứng viên không nhắc đúng từ khóa — ý đúng diễn đạt khác từ vẫn được điểm.\n"
    "Viết một nhận xét (comment) ngắn gọn 1-2 câu bằng tiếng Việt, nêu điểm mạnh/yếu chính của câu trả lời."
)


class ScoreAnswersState(TypedDict):
    session_id: str
    questions: list[dict]           # [{id, question, category, difficulty, expected_keywords?}]
    answers: list[dict]             # [{question_id, answer_text, audio_url?}]
    scored_answers: Optional[list[dict]]
    overall_score: Optional[float]
    transcript: Optional[str]
    error: Optional[str]


def _build_scoring_human_message(question: dict, answer_text: str) -> str:
    lines = [f"Câu hỏi: {question.get('question', '')}"]

    expected_keywords = question.get("expected_keywords")
    if expected_keywords:
        lines.append(f"Từ khóa kỳ vọng (chỉ tham khảo, không bắt buộc khớp): {', '.join(str(k) for k in expected_keywords)}")

    lines.append(f"Câu trả lời của ứng viên: {answer_text}")
    return "\n".join(lines)


async def _score_single_answer(question: dict, answer_text: str) -> AnswerScoreItem:
    llm = _build_llm(AnswerScoreItem)
    human_message = _build_scoring_human_message(question, answer_text)
    result = await llm.ainvoke([("system", SCORING_SYSTEM_PROMPT), ("human", human_message)])
    return cast(AnswerScoreItem, result)


async def score_answers_node(state: ScoreAnswersState) -> ScoreAnswersState:
    answers = state["answers"]
    if not answers:
        return {**state, "error": "answers rỗng, không có câu trả lời nào để chấm điểm"}

    questions_by_id = {q["id"]: q for q in state["questions"]}

    for answer in answers:
        question_id = answer.get("question_id")
        answer_text = answer.get("answer_text")

        if not answer_text or not str(answer_text).strip():
            return {
                **state,
                "error": f"answer_text rỗng cho question_id={question_id}",
            }

        if question_id not in questions_by_id:
            return {
                **state,
                "error": f"question_id={question_id} không khớp bộ câu hỏi đã sinh trong session {state['session_id']}",
            }

    try:
        score_items = await asyncio.gather(
            *[
                _score_single_answer(questions_by_id[answer["question_id"]], answer["answer_text"])
                for answer in answers
            ]
        )
    except Exception as exc:  # noqa: BLE001 — muốn bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "error": str(exc)}

    scored_answers = []
    transcript_parts = []
    totals = []

    for answer, score in zip(answers, score_items):
        question = questions_by_id[answer["question_id"]]
        total = score.relevance + score.clarity + score.depth + score.correctness
        totals.append(total)

        scored_answers.append(
            {
                "question_id": answer["question_id"],
                "question": question.get("question", ""),
                "answer_text": answer["answer_text"],
                "scores": {
                    "relevance": score.relevance,
                    "clarity": score.clarity,
                    "depth": score.depth,
                    "correctness": score.correctness,
                },
                "total": total,
                "comment": score.comment,
            }
        )
        transcript_parts.append(f"Q: {question.get('question', '')}\nA: {answer['answer_text']}")

    # Công thức B1 (đã chốt): overall = AVG(total của tất cả câu), KHÔNG chia 4
    overall_score = round(sum(totals) / len(totals), 2)
    transcript = "\n\n".join(transcript_parts)

    return {
        **state,
        "scored_answers": scored_answers,
        "overall_score": overall_score,
        "transcript": transcript,
        "error": None,
    }


def _build_score_answers_graph():
    graph = StateGraph(ScoreAnswersState)
    graph.add_node("score_answers", score_answers_node)
    graph.set_entry_point("score_answers")
    graph.add_edge("score_answers", END)
    return graph.compile()


score_answers_graph = _build_score_answers_graph()
