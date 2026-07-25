from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    PROJECT_NAME: str = "Smart Recruitment AI Multi-Agent Service"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # OpenAI (chỉ dùng cho embeddings — xem app/services/embeddings.py)
    OPENAI_API_KEY: str = ""

    # Groq (dùng cho agent1 resume-parser và agent2 matching)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Qdrant Vector DB
    # Local/Docker: dùng QDRANT_HOST/QDRANT_PORT
    # Production (Qdrant Cloud): set QDRANT_URL (https://xxx.qdrant.io) + QDRANT_API_KEY — ghi đè QDRANT_HOST/PORT
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""

    # PostgreSQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "smart_user"
    DB_PASSWORD: str = "smart_password"
    DB_NAME: str = "smart_recruitment"

    # NestJS BE internal (callback sau khi agent hoàn thành)
    BE_INTERNAL_URL: str = "http://localhost:3000"
    BE_INTERNAL_SECRET: str = ""

    # Google Calendar (agent4_scheduling) — Service Account + domain-wide delegation.
    # Đọc lịch freebusy của bất kỳ hr_email nào trong Workspace bằng cách impersonate qua
    # with_subject(hr_email), thay vì bắt từng HR tự OAuth thủ công. Giá trị là nội dung JSON
    # key của service account (không hard-code, không commit — set qua .env/.env.example).
    # Cần Workspace admin bật domain-wide delegation cho client_id của service account với
    # scope https://www.googleapis.com/auth/calendar.readonly.
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def qdrant_url(self) -> str:
        return self.QDRANT_URL or f"http://{self.QDRANT_HOST}:{self.QDRANT_PORT}"


settings = Settings()
