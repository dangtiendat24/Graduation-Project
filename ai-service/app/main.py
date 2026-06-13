from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Khởi tạo instance FastAPI và cấu hình thông tin Swagger tự động
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Service handling LangGraph Agents for Resume Parsing, Matching, and Interviewing",
    version="1.0.0"
)

# Cấu hình Middleware CORS để tránh lỗi bảo mật khi NestJS gọi API nội bộ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong môi trường Dev cho phép nhận mọi nguồn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint kiểm tra gốc (Root)
@app.get("/")
def read_root():
    return {
        "project_name": settings.PROJECT_NAME,
        "status": "healthy",
        "message": "AI Multi-Agent Service is running smoothly."
    }

# Endpoint Health Check phục vụ kiểm tra hệ thống (đồng bộ với SAD)
@app.get("/api/ai/health")
def health_check():
    return {
        "status": "ok",
        "infrastructure": {
            "openai_integration": "initialized",
            "qdrant_vector_db": f"configured at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}"
        }
    }

# Khối lệnh kích hoạt server uvicorn khi chạy file trực tiếp bằng lệnh python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)