from typing import Optional, TypedDict, cast

from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import SecretStr

from app.core.config import settings
from .schemas import ParsedCv

SYSTEM_PROMPT = (
    "Bạn là hệ thống trích xuất thông tin CV (resume) sang JSON có cấu trúc. "
    "Đọc nội dung CV thô bên dưới và trích xuất chính xác các trường theo schema đã cho. "
    "Nếu không tìm thấy thông tin cho một trường, để chuỗi rỗng hoặc mảng rỗng — "
    "KHÔNG bịa đặt dữ liệu không có trong CV. "
    "Riêng trường `summary`: LUÔN viết bằng tiếng Việt, bất kể CV gốc là tiếng Anh, "
    "tiếng Việt hay song ngữ — tự dịch/diễn giải sang tiếng Việt nếu cần. "
    "Viết dưới dạng 3-4 gạch đầu dòng ngắn (mỗi dòng bắt đầu bằng '• ', các dòng cách nhau "
    "bằng ký tự xuống dòng \\n), KHÔNG viết thành 1 đoạn văn dài liền mạch."
)


class ResumeParserState(TypedDict):
    cv_raw_text: str
    parsed_data: Optional[ParsedCv]
    error: Optional[str]


def _build_llm():
    # settings.GROQ_MODEL (llama-3.3-70b-versatile) dùng method="function_calling" mặc định,
    # đôi khi trả lẫn text + JSON với schema lồng nested (experience/education) — lỗi đã biết
    # của Llama trên Groq với structured output phức tạp. gpt-oss-120b là 1 trong 2 model Groq
    # hỗ trợ method="json_schema" (ép decode đúng schema, không phải best-effort như function_calling),
    # nên tách riêng cho agent này thay vì dùng GROQ_MODEL chung.
    return ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=SecretStr(settings.GROQ_API_KEY),
        temperature=0,
    ).with_structured_output(ParsedCv, method="json_schema")


async def extract_node(state: ResumeParserState) -> ResumeParserState:
    try:
        llm = _build_llm()
        result = cast(
            ParsedCv,
            await llm.ainvoke(
                [
                    ("system", SYSTEM_PROMPT),
                    ("human", state["cv_raw_text"]),
                ]
            ),
        )
        return {**state, "parsed_data": result, "error": None}
    except Exception as exc:  # noqa: BLE001 — muốn bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "parsed_data": None, "error": str(exc)}


def _build_graph():
    graph = StateGraph(ResumeParserState)
    graph.add_node("extract", extract_node)
    graph.set_entry_point("extract")
    graph.add_edge("extract", END)
    return graph.compile()


resume_parser_graph = _build_graph()
