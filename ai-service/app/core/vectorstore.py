from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, PointStruct, ScoredPoint, VectorParams

from app.core.config import settings

EMBEDDING_DIM = 1536
COLLECTIONS = ("cvs", "jobs")

_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=settings.qdrant_url)
    return _client


async def ensure_collections() -> None:
    """Tạo các collection Qdrant nếu chưa tồn tại (gọi lúc app khởi động)."""
    client = get_qdrant_client()
    for name in COLLECTIONS:
        if not await client.collection_exists(name):
            await client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
            )


async def upsert_vector(collection: str, point_id: str, vector: list[float], payload: dict) -> None:
    client = get_qdrant_client()
    await client.upsert(
        collection_name=collection,
        points=[PointStruct(id=point_id, vector=vector, payload=payload)],
    )


async def search_similar(collection: str, query_vector: list[float], top_k: int = 5) -> list[ScoredPoint]:
    """Dùng nội bộ bởi Agent 2 (matching) để tìm các vector CV/Job gần nhất."""
    client = get_qdrant_client()
    return await client.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=top_k,
    )
