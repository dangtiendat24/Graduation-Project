from typing import Optional, TypedDict, cast

from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import SecretStr

from app.core.config import settings
from .schemas import GeneratedQuestions

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


def _build_llm():
    return ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=SecretStr(settings.GROQ_API_KEY),
        temperature=0.3,
    ).with_structured_output(GeneratedQuestions)


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
        llm = _build_llm()
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
