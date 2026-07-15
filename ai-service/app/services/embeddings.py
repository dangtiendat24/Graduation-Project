from langchain_openai import OpenAIEmbeddings
from pydantic import SecretStr

from app.core.config import settings

EMBEDDING_MODEL = "text-embedding-3-small"

_embeddings_client: OpenAIEmbeddings | None = None


def _get_embeddings_client() -> OpenAIEmbeddings:
    global _embeddings_client
    if _embeddings_client is None:
        _embeddings_client = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            api_key=SecretStr(settings.OPENAI_API_KEY),
        )
    return _embeddings_client


async def create_embedding(text: str) -> list[float]:
    return await _get_embeddings_client().aembed_query(text)
