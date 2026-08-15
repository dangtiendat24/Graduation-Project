from openai import AsyncOpenAI

from app.core.config import settings

_tts_client: AsyncOpenAI | None = None


def _get_tts_client() -> AsyncOpenAI:
    global _tts_client
    if _tts_client is None:
        _tts_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _tts_client


async def synthesize_speech(text: str) -> bytes:
    """Đọc câu hỏi/feedback phỏng vấn thành audio (mp3) qua OpenAI TTS."""
    response = await _get_tts_client().audio.speech.create(
        model=settings.OPENAI_TTS_MODEL,
        voice=settings.OPENAI_TTS_VOICE,
        input=text,
    )
    return response.content
