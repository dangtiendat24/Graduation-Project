import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Đọc dữ liệu từ file .env vào bộ nhớ tạm
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Recruitment AI Multi-Agent Service"
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    
    # Cấu hình OpenAI API
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Cấu hình kết nối Vector DB Qdrant
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))

    class Config:
        case_sensitive = True

# Khởi tạo một instance dùng chung cho toàn bộ ứng dụng
settings = Settings()