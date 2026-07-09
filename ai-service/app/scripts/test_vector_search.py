"""
Test cơ bản cho similarity search giữa CV và JD embeddings trên Qdrant (US-13).

Cách chạy (từ thư mục ai-service/, sau khi đã cấu hình .env với OPENAI_API_KEY
và Qdrant đang chạy — `docker compose up qdrant`):

    python -m app.scripts.test_vector_search
"""

import asyncio
import uuid

from app.core.vectorstore import ensure_collections, search_similar, upsert_vector
from app.services.embeddings import create_embedding

SAMPLE_CV_TEXT = (
    "Backend Developer với 3 năm kinh nghiệm Node.js, NestJS, PostgreSQL, "
    "thiết kế REST API và triển khai microservices trên Docker."
)

SAMPLE_JOB_RELEVANT = (
    "Tuyển Backend Engineer (NestJS/Node.js): xây dựng REST API, làm việc với "
    "PostgreSQL, triển khai hệ thống containerized bằng Docker/Kubernetes."
)

SAMPLE_JOB_IRRELEVANT = (
    "Tuyển Nhân viên Marketing: lên kế hoạch truyền thông, quản lý mạng xã hội, "
    "content sáng tạo cho chiến dịch quảng cáo."
)


async def main() -> None:
    await ensure_collections()

    profile_id = str(uuid.uuid4())
    relevant_job_id = str(uuid.uuid4())
    irrelevant_job_id = str(uuid.uuid4())

    print("→ Tạo & upsert CV embedding...")
    cv_vector = await create_embedding(SAMPLE_CV_TEXT)
    await upsert_vector("cvs", profile_id, cv_vector, {"profile_id": profile_id})

    print("→ Tạo & upsert JD embeddings (1 liên quan, 1 không liên quan)...")
    relevant_vector = await create_embedding(SAMPLE_JOB_RELEVANT)
    await upsert_vector("jobs", relevant_job_id, relevant_vector, {"job_id": relevant_job_id})

    irrelevant_vector = await create_embedding(SAMPLE_JOB_IRRELEVANT)
    await upsert_vector("jobs", irrelevant_job_id, irrelevant_vector, {"job_id": irrelevant_job_id})

    print("→ Similarity search: JD gần nhất với CV...")
    hits = await search_similar("jobs", cv_vector, top_k=5)
    for hit in hits:
        print(f"  job_id={hit.payload.get('job_id')}  score={hit.score:.4f}")

    assert hits, "Không tìm thấy kết quả nào — kiểm tra lại Qdrant/OpenAI config"
    assert hits[0].payload.get("job_id") == relevant_job_id, "JD liên quan phải có similarity score cao nhất"
    print("✔ Test PASSED: JD liên quan có similarity score cao nhất")


if __name__ == "__main__":
    asyncio.run(main())
