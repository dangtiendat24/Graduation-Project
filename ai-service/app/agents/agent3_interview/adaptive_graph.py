from typing import Optional, TypedDict, cast

from langgraph.graph import END, StateGraph

from .adaptive_schemas import NextQuestionItem, ScoreAndNextResult
from .graph import REQUIRED_CATEGORIES, _build_llm, _format_parsed_data

# =============================================================
# Voice interview — sinh câu hỏi thích ứng theo từng lượt (turn-based), KHÔNG sinh sẵn N câu
# như luồng text (graph.py). Thiết kế để logic sinh câu hỏi/chấm điểm không phụ thuộc kênh
# giao tiếp (voice/text) — sau này text muốn chuyển sang adaptive chỉ cần gọi lại 2 node này.
#
# Mỗi lượt gộp CHUNG 1 lệnh gọi LLM cho cả "chấm điểm câu vừa trả lời" + "sinh câu hỏi kế tiếp"
# để tiết kiệm token/số lệnh gọi (quan trọng vì free tier Groq giới hạn TPD) — thay vì tách 2
# lệnh gọi riêng phải lặp lại CV/JD/lịch sử 2 lần.
# =============================================================

FIRST_QUESTION_SYSTEM_PROMPT = (
    "Bạn là chuyên gia phỏng vấn kỹ thuật (technical interviewer) giàu kinh nghiệm, đang bắt đầu "
    "một buổi phỏng vấn bằng giọng nói. Dựa vào CV ứng viên (đã trích xuất) và mô tả công việc (JD) "
    "bên dưới, hãy soạn CÂU HỎI MỞ ĐẦU (câu 1) cho buổi phỏng vấn.\n\n"
    "YÊU CẦU:\n"
    "1. Trường 'question' PHẢI bắt đầu bằng 1-2 câu chào hỏi ngắn gọn, thân thiện (vd: 'Xin chào! "
    "Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay cho vị trí [tên vị trí lấy từ JD]. Dựa trên mô tả "
    "công việc, mình xin bắt đầu với câu hỏi đầu tiên.'), SAU ĐÓ mới đến nội dung câu hỏi thật — toàn "
    "bộ gộp chung thành 1 đoạn văn nói tự nhiên, liền mạch (đây là toàn bộ nội dung sẽ được đọc thành "
    "giọng nói cho câu hỏi đầu tiên).\n"
    "2. Câu hỏi phải bám sát nội dung THẬT trong CV (kỹ năng, dự án, công ty, chức danh cụ thể) và JD — "
    "KHÔNG chung chung kiểu hỏi ai cũng được.\n"
    "3. Vì là câu mở đầu, ưu tiên difficulty 'easy' hoặc 'medium', category 'technical' hoặc 'behavioral' "
    "để ứng viên làm quen, tránh bắt đầu bằng câu quá khó hoặc quá hóc búa.\n"
    "4. Không hỏi kiểu 'giới thiệu bản thân' chung chung — vẫn phải gắn với 1 chi tiết cụ thể trong CV/JD."
)

TURN_SYSTEM_PROMPT = (
    "Bạn là chuyên gia phỏng vấn kỹ thuật (technical interviewer) giàu kinh nghiệm, đang điều phối "
    "một buổi phỏng vấn bằng giọng nói theo từng lượt. Nhiệm vụ của bạn trong MỖI lượt gồm 2 việc:\n\n"
    "1. CHẤM ĐIỂM câu trả lời ứng viên vừa nói cho câu hỏi hiện tại, theo đúng 5 tiêu chí phụ, "
    "MỖI tiêu chí thang điểm nguyên 0-20:\n"
    "   - relevance: bám sát và giải quyết đúng trọng tâm câu hỏi\n"
    "   - clarity: rõ ràng, mạch lạc, dễ hiểu\n"
    "   - depth: đủ chiều sâu, chi tiết, ví dụ cụ thể, không hời hợt\n"
    "   - correctness: chính xác về mặt kỹ thuật/kiến thức\n"
    "   - authenticity: mức độ đáng tin là câu trả lời tự nhiên của chính ứng viên — CHỈ chấm thấp khi "
    "có tín hiệu khách quan đi kèm hỗ trợ (rời tab nhiều lần, trả lời tức thì bất thường cho câu hỏi khó), "
    "KHÔNG được chấm thấp chỉ vì trả lời trôi chảy/tự tin/có cấu trúc tốt.\n"
    "   Nếu ứng viên không trả lời hoặc trả lời không liên quan, chấm điểm thấp (gần 0) ở các tiêu chí "
    "nội dung, không chấm nương tay.\n"
    "   Viết comment 2-3 câu tiếng Việt nêu RÕ điểm tốt và điểm chưa tốt — nội dung này sẽ được đọc "
    "trực tiếp cho ứng viên nghe.\n\n"
    "2. SINH CÂU HỎI KẾ TIẾP (trừ khi được yêu cầu để null vì đã là câu cuối), bám sát CV/JD, và "
    "ĐIỀU CHỈNH ĐỘ KHÓ dựa trên tổng điểm câu vừa chấm (thang 0-100, = tổng 5 tiêu chí):\n"
    "   - Tổng điểm > 75: câu tiếp theo khó hơn 1 bậc so với câu vừa hỏi (không vượt quá 'hard')\n"
    "   - Tổng điểm < 50: câu tiếp theo dễ hơn 1 bậc so với câu vừa hỏi (không thấp hơn 'easy')\n"
    "   - Còn lại: giữ nguyên độ khó\n"
    "   Không lặp lại ý đã hỏi ở các câu trước."
)


class FirstQuestionState(TypedDict):
    parsed_data: dict
    job_requirements: str
    question: Optional[dict]
    error: Optional[str]


async def generate_first_question_node(state: FirstQuestionState) -> FirstQuestionState:
    try:
        llm = _build_llm(NextQuestionItem)
        human_message = (
            f"--- Hồ sơ ứng viên (CV đã trích xuất) ---\n{_format_parsed_data(state['parsed_data'])}\n\n"
            f"--- Mô tả công việc (JD) ---\n{state['job_requirements']}"
        )
        result = cast(
            NextQuestionItem,
            await llm.ainvoke([("system", FIRST_QUESTION_SYSTEM_PROMPT), ("human", human_message)]),
        )
        return {
            **state,
            "question": {
                "id": "q1",
                "question": result.question,
                "category": result.category,
                "difficulty": result.difficulty,
            },
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001 — bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "error": str(exc)}


def _build_first_question_graph():
    graph = StateGraph(FirstQuestionState)
    graph.add_node("generate_first_question", generate_first_question_node)
    graph.set_entry_point("generate_first_question")
    graph.add_edge("generate_first_question", END)
    return graph.compile()


first_question_graph = _build_first_question_graph()


def _format_history(history: list[dict]) -> str:
    """Tóm tắt gọn các lượt trước — CHỈ câu hỏi/category/difficulty/tổng điểm/comment, KHÔNG lặp lại
    toàn văn câu trả lời, để ngữ cảnh không phình to theo số lượt (quan trọng cho token budget)."""
    if not history:
        return "(Chưa có lượt nào trước đó — đây là câu đầu tiên có chấm điểm.)"
    lines = []
    for idx, turn in enumerate(history, start=1):
        total = turn.get("total", "?")
        lines.append(
            f"Câu {idx} ({turn.get('category')}, {turn.get('difficulty')}): {turn.get('question')}\n"
            f"  Tổng điểm: {total}/100 | Nhận xét: {turn.get('comment', '')}"
        )
    return "\n".join(lines)


def _format_cheating_signals(signals: Optional[dict]) -> str:
    if not signals:
        return "(Không có tín hiệu bổ sung.)"
    parts = []
    if signals.get("tab_blur_count") is not None:
        parts.append(f"Số lần rời khỏi tab/cửa sổ trong lúc trả lời: {signals['tab_blur_count']}")
    if signals.get("tab_blur_total_ms") is not None:
        parts.append(f"Tổng thời gian rời tab: {signals['tab_blur_total_ms']}ms")
    if signals.get("response_latency_ms") is not None:
        parts.append(f"Độ trễ từ lúc nghe xong câu hỏi đến lúc bắt đầu trả lời: {signals['response_latency_ms']}ms")
    if signals.get("pause_ratio_percent") is not None:
        parts.append(
            f"Tỷ lệ khoảng lặng giữa các đoạn nói trong câu trả lời: {signals['pause_ratio_percent']}% "
            "(tỷ lệ rất thấp + nói đều đặn có thể là dấu hiệu đọc lại văn bản đã chuẩn bị sẵn)"
        )
    return "; ".join(parts) if parts else "(Không có tín hiệu bổ sung.)"


class TurnState(TypedDict):
    parsed_data: dict
    job_requirements: str
    turn_index: int          # số thứ tự câu hỏi VỪA được trả lời (1-based)
    total_questions: int
    history: list[dict]      # các lượt trước đã chấm điểm (không gồm lượt turn_index)
    pending_question: dict   # câu hỏi ứng với turn_index
    pending_answer_text: str
    cheating_signals: Optional[dict]
    score: Optional[dict]
    next_question: Optional[dict]
    error: Optional[str]


async def score_and_next_node(state: TurnState) -> TurnState:
    try:
        is_last = state["turn_index"] >= state["total_questions"]
        remaining_slots = state["total_questions"] - state["turn_index"]
        asked_categories = {h.get("category") for h in state["history"]} | {
            state["pending_question"].get("category")
        }
        missing_categories = REQUIRED_CATEGORIES - asked_categories

        forcing_note = ""
        if not is_last and missing_categories and len(missing_categories) >= remaining_slots:
            forced = sorted(missing_categories)[0]
            forcing_note = (
                f"\n\nLƯU Ý BẮT BUỘC: chỉ còn {remaining_slots} câu hỏi nữa mà chưa hỏi nhóm "
                f"'{forced}' — câu hỏi kế tiếp BẮT BUỘC phải thuộc category '{forced}'."
            )

        next_question_note = (
            "\n\nĐây là câu hỏi CUỐI CÙNG của buổi phỏng vấn — để next_question = null, không sinh thêm câu hỏi."
            if is_last
            else "\n\nHãy sinh thêm 1 câu hỏi kế tiếp (next_question) theo đúng quy tắc điều chỉnh độ khó."
        )

        human_message = (
            f"--- Hồ sơ ứng viên (CV đã trích xuất) ---\n{_format_parsed_data(state['parsed_data'])}\n\n"
            f"--- Mô tả công việc (JD) ---\n{state['job_requirements']}\n\n"
            f"--- Các câu hỏi trước đó (đã chấm điểm) ---\n{_format_history(state['history'])}\n\n"
            f"--- Câu hỏi hiện tại (câu {state['turn_index']}/{state['total_questions']}, "
            f"{state['pending_question'].get('category')}, {state['pending_question'].get('difficulty')}) ---\n"
            f"{state['pending_question'].get('question')}\n\n"
            f"--- Câu trả lời của ứng viên (transcript) ---\n{state['pending_answer_text']}\n\n"
            f"--- Tín hiệu khách quan kèm theo câu trả lời ---\n{_format_cheating_signals(state['cheating_signals'])}"
            f"{forcing_note}{next_question_note}"
        )

        llm = _build_llm(ScoreAndNextResult)
        result = cast(
            ScoreAndNextResult,
            await llm.ainvoke([("system", TURN_SYSTEM_PROMPT), ("human", human_message)]),
        )

        score = result.score
        total = score.relevance + score.clarity + score.depth + score.correctness + score.authenticity

        next_question = None
        if not is_last and result.next_question is not None:
            next_question = {
                "id": f"q{state['turn_index'] + 1}",
                "question": result.next_question.question,
                "category": result.next_question.category,
                "difficulty": result.next_question.difficulty,
            }

        return {
            **state,
            "score": {
                "relevance": score.relevance,
                "clarity": score.clarity,
                "depth": score.depth,
                "correctness": score.correctness,
                "authenticity": score.authenticity,
                "total": total,
                "comment": score.comment,
            },
            "next_question": next_question,
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001 — bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "error": str(exc)}


def _build_turn_graph():
    graph = StateGraph(TurnState)
    graph.add_node("score_and_next", score_and_next_node)
    graph.set_entry_point("score_and_next")
    graph.add_edge("score_and_next", END)
    return graph.compile()


turn_graph = _build_turn_graph()
