from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.agents.agent1_resume_parser.router import router as resume_parser_router
from app.agents.agent2_matching.router import router as matching_router
from app.agents.agent3_interview.router import router as interview_router
from app.agents.agent4_scheduling.router import router as scheduling_router
from app.agents.agent5_reporting.router import router as reporting_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Service — LangGraph Multi-Agent: Resume Parser, CV-JD Matching, AI Interview, Scheduling, Reporting",
    version="1.0.0",
    docs_url="/api/ai/docs",
    redoc_url="/api/ai/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent routers
app.include_router(resume_parser_router)
app.include_router(matching_router)
app.include_router(interview_router)
app.include_router(scheduling_router)
app.include_router(reporting_router)


@app.get("/")
def read_root():
    return {
        "project_name": settings.PROJECT_NAME,
        "status": "healthy",
        "agents": [
            "agent1_resume_parser",
            "agent2_matching",
            "agent3_interview",
            "agent4_scheduling",
            "agent5_reporting",
        ],
    }


@app.get("/api/ai/health")
def health_check():
    return {
        "status": "ok",
        "infrastructure": {
            "openai_model": settings.OPENAI_MODEL,
            "qdrant": f"{settings.QDRANT_HOST}:{settings.QDRANT_PORT}",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
