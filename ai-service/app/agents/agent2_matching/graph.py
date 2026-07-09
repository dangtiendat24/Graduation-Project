import math
from typing import Optional, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.core.vectorstore import get_vector
from .schemas import MatchAnalysis, MatchCriteria

# Khớp với packages/shared/scoring.constants.ts — giữ đồng bộ nếu đổi công thức
MATCHING_WEIGHTS = {"skills": 0.45, "experience": 0.35, "education": 0.20}
MATCH_BANDS = {"strong_match": 80, "good_match": 60, "partial_match": 40, "poor_match": 0}

SYSTEM_PROMPT = (
    "Bạn là chuyên gia tuyển dụng (technical recruiter) giàu kinh nghiệm. "
    "Nhiệm vụ: phân tích mức độ phù hợp giữa CV ứng viên và mô tả công việc (JD) bên dưới. "
    "Chấm điểm 3 tiêu chí skills_score, experience_score, education_score (thang 0-100) dựa CHÍNH XÁC "
    "trên nội dung CV/JD được cung cấp — KHÔNG bịa đặt thông tin không có. "
    "Đồng thời viết phần explanation bằng tiếng Việt, trình bày rõ: breakdown điểm theo từng tiêu chí, "
    "điểm mạnh của ứng viên so với JD, và những điểm còn thiếu sót/chưa đáp ứng."
)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _classify_recommendation(score: float) -> str:
    if score >= MATCH_BANDS["strong_match"]:
        return "strong_match"
    if score >= MATCH_BANDS["good_match"]:
        return "good_match"
    if score >= MATCH_BANDS["partial_match"]:
        return "partial_match"
    return "poor_match"


class MatchState(TypedDict):
    profile_id: str
    job_id: str
    cv_text: str
    job_text: str
    qdrant_similarity: Optional[float]
    criteria: Optional[MatchCriteria]
    overall_score: Optional[float]
    recommendation: Optional[str]
    explanation: Optional[str]
    error: Optional[str]


def _build_llm():
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    ).with_structured_output(MatchAnalysis)


async def fetch_vectors_node(state: MatchState) -> MatchState:
    cv_vector = await get_vector("cvs", state["profile_id"])
    if cv_vector is None:
        return {**state, "error": f"Chưa có CV embedding cho profile_id={state['profile_id']}"}

    job_vector = await get_vector("jobs", state["job_id"])
    if job_vector is None:
        return {**state, "error": f"Chưa có Job embedding cho job_id={state['job_id']}"}

    similarity = _cosine_similarity(cv_vector, job_vector)
    return {**state, "qdrant_similarity": round(max(similarity, 0.0) * 100, 2), "error": None}


async def score_node(state: MatchState) -> MatchState:
    try:
        llm = _build_llm()
        human_message = (
            f"Độ tương đồng embedding (Qdrant cosine similarity) giữa CV và JD: "
            f"{state['qdrant_similarity']:.1f}/100\n\n"
            f"--- CV ứng viên ---\n{state['cv_text']}\n\n"
            f"--- Mô tả công việc (JD) ---\n{state['job_text']}"
        )
        analysis: MatchAnalysis = await llm.ainvoke(
            [("system", SYSTEM_PROMPT), ("human", human_message)]
        )

        criteria = MatchCriteria(
            skills=analysis.skills_score,
            experience=analysis.experience_score,
            education=analysis.education_score,
        )
        overall_score = round(
            criteria.skills * MATCHING_WEIGHTS["skills"]
            + criteria.experience * MATCHING_WEIGHTS["experience"]
            + criteria.education * MATCHING_WEIGHTS["education"],
            2,
        )

        return {
            **state,
            "criteria": criteria,
            "overall_score": overall_score,
            "recommendation": _classify_recommendation(overall_score),
            "explanation": analysis.explanation,
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001 — muốn bắt mọi lỗi từ LLM call để trả về success=False
        return {**state, "error": str(exc)}


def _route_after_fetch(state: MatchState) -> str:
    return "score" if not state.get("error") else "end"


def _build_graph():
    graph = StateGraph(MatchState)
    graph.add_node("fetch_vectors", fetch_vectors_node)
    graph.add_node("score", score_node)
    graph.set_entry_point("fetch_vectors")
    graph.add_conditional_edges("fetch_vectors", _route_after_fetch, {"score": "score", "end": END})
    graph.add_edge("score", END)
    return graph.compile()


matching_graph = _build_graph()
