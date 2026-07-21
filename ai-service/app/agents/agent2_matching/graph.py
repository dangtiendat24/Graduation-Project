import math
from typing import Optional, TypedDict, cast

from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import SecretStr
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_similarity

from app.core.config import settings
from app.core.vectorstore import get_vector
from .schemas import MatchAnalysis, MatchCriteria, MatchingWeights, SkillBreakdown

# Fallback khi request không gửi weights (caller cũ/test) — nguồn chân lý thật sự là
# packages/shared/scoring.constants.ts::MATCHING_WEIGHTS, NestJS resolve và gửi qua mỗi request (P4)
DEFAULT_WEIGHTS = MatchingWeights(skills=0.45, experience=0.35, education=0.20)
# 3 tầng bổ trợ hợp thành skill_score (§3.5/§3.6 [Paper] IJCSE v14i5.7424)
SKILL_SUBWEIGHTS = {"keyword": 0.3, "tfidf": 0.3, "semantic": 0.4}
MATCH_BANDS = {"strong_match": 80, "good_match": 60, "partial_match": 40, "poor_match": 0}

SYSTEM_PROMPT = (
    "Bạn là chuyên gia tuyển dụng (technical recruiter) giàu kinh nghiệm. "
    "Nhiệm vụ: phân tích mức độ phù hợp giữa CV ứng viên và mô tả công việc (JD) bên dưới. "
    "Điểm kỹ năng (skill) đã được một thuật toán tính toán sẵn và cung cấp cho bạn — KHÔNG tự chấm lại điểm này. "
    "Chấm điểm 2 tiêu chí experience_score, education_score (thang 0-100) dựa CHÍNH XÁC "
    "trên nội dung CV/JD được cung cấp — KHÔNG bịa đặt thông tin không có. "
    "Đồng thời viết phần explanation bằng tiếng Việt, trình bày rõ: breakdown điểm theo cả 3 tiêu chí "
    "skills/experience/education (bao gồm điểm kỹ năng đã cho), điểm mạnh của ứng viên so với JD, "
    "và những điểm còn thiếu sót/chưa đáp ứng."
)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _normalize_skill(skill: str) -> str:
    return skill.strip().lower()


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
    cv_skills: list[str]
    job_skills: list[str]
    weights: Optional[MatchingWeights]
    qdrant_similarity: Optional[float]
    keyword_score: Optional[float]
    tfidf_score: Optional[float]
    skill_score: Optional[float]
    skill_breakdown: Optional[SkillBreakdown]
    criteria: Optional[MatchCriteria]
    overall_score: Optional[float]
    recommendation: Optional[str]
    explanation: Optional[str]
    error: Optional[str]


def _build_llm():
    return ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=SecretStr(settings.GROQ_API_KEY),
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
    # Kẹp cả 2 đầu: cosine similarity lý thuyết trong [-1,1] nhưng sai số dấu phẩy động
    # (vector gần như trùng nhau) có thể cho > 1.0 một chút, vượt le=100 của SkillBreakdown
    similarity_pct = round(min(max(similarity, 0.0), 1.0) * 100, 2)
    return {**state, "qdrant_similarity": similarity_pct, "error": None}


async def keyword_score_node(state: MatchState) -> MatchState:
    """Skill Score = Matched Skills ÷ Total Required Skills (§3.5 [Paper])"""
    job_skills = {_normalize_skill(s) for s in state["job_skills"] if s.strip()}
    if not job_skills:
        # Job không có requiredSkills có cấu trúc — không thể penalize ứng viên vì thiếu dữ liệu
        return {**state, "keyword_score": 100.0}

    cv_skills = {_normalize_skill(s) for s in state["cv_skills"] if s.strip()}
    matched = job_skills & cv_skills
    score = round(len(matched) / len(job_skills) * 100, 2)
    return {**state, "keyword_score": score}


async def tfidf_score_node(state: MatchState) -> MatchState:
    """TF-IDF cosine similarity trên cv_text/job_text — thuần toán học, không gọi LLM (§3.5 [Paper])"""
    try:
        matrix = TfidfVectorizer().fit_transform([state["cv_text"], state["job_text"]])
        similarity = sk_cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        # Kẹp cả 2 đầu — lý do xem fetch_vectors_node
        score = round(min(max(float(similarity), 0.0), 1.0) * 100, 2)
    except ValueError:
        # Vocabulary rỗng (text quá ngắn/toàn stop-word) — không đủ tín hiệu để so khớp
        score = 0.0
    return {**state, "tfidf_score": score}


async def aggregate_node(state: MatchState) -> MatchState:
    """Hội tụ keyword + TF-IDF + semantic (Qdrant) thành skill_score — không gọi LLM (§4.1 điểm 3)"""
    keyword = state["keyword_score"] or 0.0
    tfidf = state["tfidf_score"] or 0.0
    semantic = state["qdrant_similarity"] or 0.0
    skill_score = round(
        keyword * SKILL_SUBWEIGHTS["keyword"]
        + tfidf * SKILL_SUBWEIGHTS["tfidf"]
        + semantic * SKILL_SUBWEIGHTS["semantic"],
        2,
    )
    breakdown = SkillBreakdown(keyword=keyword, tfidf=tfidf, semantic=semantic)
    return {**state, "skill_score": skill_score, "skill_breakdown": breakdown}


async def score_node(state: MatchState) -> MatchState:
    try:
        llm = _build_llm()
        human_message = (
            f"Điểm kỹ năng đã được tính sẵn bằng thuật toán (đừng chấm lại): {state['skill_score']:.1f}/100 "
            f"— keyword matching={state['keyword_score']:.1f}, TF-IDF={state['tfidf_score']:.1f}, "
            f"semantic embedding (Qdrant cosine similarity)={state['qdrant_similarity']:.1f}.\n\n"
            f"--- CV ứng viên ---\n{state['cv_text']}\n\n"
            f"--- Mô tả công việc (JD) ---\n{state['job_text']}"
        )
        analysis = cast(
            MatchAnalysis,
            await llm.ainvoke([("system", SYSTEM_PROMPT), ("human", human_message)]),
        )

        criteria = MatchCriteria(
            skills=state["skill_score"],
            experience=analysis.experience_score,
            education=analysis.education_score,
            skill_breakdown=state["skill_breakdown"],
        )
        weights = state.get("weights") or DEFAULT_WEIGHTS
        overall_score = round(
            criteria.skills * weights.skills
            + criteria.experience * weights.experience
            + criteria.education * weights.education,
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
    return "continue" if not state.get("error") else "end"


def _build_graph():
    graph = StateGraph(MatchState)
    graph.add_node("fetch_vectors", fetch_vectors_node)
    graph.add_node("keyword_score", keyword_score_node)
    graph.add_node("tfidf_score", tfidf_score_node)
    graph.add_node("aggregate", aggregate_node)
    graph.add_node("score", score_node)
    graph.set_entry_point("fetch_vectors")
    graph.add_conditional_edges(
        "fetch_vectors", _route_after_fetch, {"continue": "keyword_score", "end": END}
    )
    graph.add_edge("keyword_score", "tfidf_score")
    graph.add_edge("tfidf_score", "aggregate")
    graph.add_edge("aggregate", "score")
    graph.add_edge("score", END)
    return graph.compile()


matching_graph = _build_graph()
