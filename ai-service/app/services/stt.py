from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

_stt_client: AsyncOpenAI | None = None


def _get_stt_client() -> AsyncOpenAI:
    global _stt_client
    if _stt_client is None:
        _stt_client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
        )
    return _stt_client


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Chuyển audio câu trả lời phỏng vấn thành văn bản qua Groq Whisper."""
    response = await _get_stt_client().audio.transcriptions.create(
        model=settings.GROQ_STT_MODEL,
        file=(filename, audio_bytes),
    )
    return response.text


class TranscriptionWithSignals(BaseModel):
    """Transcript + tín hiệu thời lượng rút ra từ segment timestamp của Whisper — dùng làm tín
    hiệu khách quan phụ trợ cho tiêu chí "authenticity" (voice interview), KHÔNG phải bằng chứng
    gian lận, chỉ là input thêm cho LLM tự đánh giá (xem TURN_SYSTEM_PROMPT trong adaptive_graph.py)."""

    text: str
    pause_ratio_percent: float | None = None


async def transcribe_audio_with_signals(
    audio_bytes: bytes, filename: str
) -> TranscriptionWithSignals:
    """
    Giống transcribe_audio nhưng dùng response_format="verbose_json" để lấy segment timestamp,
    từ đó tính pause_ratio_percent = % thời lượng audio là khoảng lặng GIỮA các đoạn nói (không
    tính im lặng đầu/cuối) — câu trả lời đọc thuộc/dán sẵn thường có nhịp nói rất đều, gần như
    không có khoảng dừng để suy nghĩ giữa chừng.
    """
    response = await _get_stt_client().audio.transcriptions.create(
        model=settings.GROQ_STT_MODEL,
        file=(filename, audio_bytes),
        response_format="verbose_json",
    )
    text = response.text
    segments = getattr(response, "segments", None) or []

    if len(segments) < 2:
        return TranscriptionWithSignals(text=text, pause_ratio_percent=None)

    total_duration = max((s.end for s in segments), default=0) - min(
        (s.start for s in segments), default=0
    )
    if total_duration <= 0:
        return TranscriptionWithSignals(text=text, pause_ratio_percent=None)

    gap_time = 0.0
    for prev, curr in zip(segments, segments[1:]):
        gap_time += max(0.0, curr.start - prev.end)

    pause_ratio_percent = round(min(100.0, (gap_time / total_duration) * 100), 1)
    return TranscriptionWithSignals(text=text, pause_ratio_percent=pause_ratio_percent)
