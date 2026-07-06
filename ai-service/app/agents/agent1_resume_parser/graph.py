from typing import Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from app.core.config import settings
from .schemas import ParsedCv

SYSTEM_PROMPT = (
    "Bạn là hệ thống trích xuất thông tin CV (resume) sang JSON có cấu trúc. "
    "Đọc nội dung CV thô bên dưới và trích xuất chính xác các trường theo schema đã cho. "
    "Nếu không tìm thấy thông tin cho một trường, để chuỗi rỗng hoặc mảng rỗng — "
    "KHÔNG bịa đặt dữ liệu không có trong CV."
)


class ResumeParserState(TypedDict):
    cv_raw_text: str
    parsed_data: Optional[ParsedCv]
    error: Optional[str]


def _build_llm():
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    ).with_structured_output(ParsedCv)


async def extract_node(state: ResumeParserState) -> ResumeParserState:
    try:
        llm = _build_llm()
        result = await llm.ainvoke(
            [
                ("system", SYSTEM_PROMPT),
                ("human", state["cv_raw_text"]),
            ]
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
