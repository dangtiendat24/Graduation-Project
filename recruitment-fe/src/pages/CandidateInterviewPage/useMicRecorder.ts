import { useCallback, useRef, useState } from 'react'

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']

// Whisper (Groq) "ảo giác" ra vài từ ngẫu nhiên (thường "Thank you"/"you"/"Obrigado"...) khi nhận
// audio gần như im lặng — thay vì trả về rỗng. Để tránh câu trả lời bịa bị chấm điểm như thật, chỉ
// coi là "có trả lời" nếu mức âm thanh (level, thang 0-1) vượt ngưỡng này ít nhất 1 lần trong lúc
// ghi âm — cùng ngưỡng đã dùng để hiện hiệu ứng "đang nói" ở VoiceInterviewFlow.
const SILENCE_LEVEL_THRESHOLD = 0.08

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
}

export type MicPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

/**
 * Quản lý vòng đời mic cho voice interview: xin quyền 1 lần, dùng lại cùng 1 MediaStream cho cả
 * màn test mic lẫn ghi âm từng câu trả lời (tránh xin quyền lặp lại giữa các câu).
 */
export function useMicRecorder() {
  const [permission, setPermission] = useState<MicPermissionState>('idle')
  const [level, setLevel] = useState(0) // 0-1, dùng cho volume meter
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const levelTimerRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isMutedRef = useRef(false)
  const maxLevelRef = useRef(0)

  const stopLevelMeter = useCallback(() => {
    if (levelTimerRef.current !== null) {
      window.clearInterval(levelTimerRef.current)
      levelTimerRef.current = null
    }
    setLevel(0)
  }, [])

  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    // getByteTimeDomainData cần mảng kích thước fftSize (waveform), KHÔNG phải frequencyBinCount
    // (dùng cho getByteFrequencyData, chỉ bằng nửa fftSize) — dùng sai kích thước khiến level luôn ~0
    const data = new Uint8Array(analyser.fftSize)
    levelTimerRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(data)
      let sumSquares = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sumSquares += v * v
      }
      const nextLevel = Math.min(1, Math.sqrt(sumSquares / data.length) * 4)
      maxLevelRef.current = Math.max(maxLevelRef.current, nextLevel)
      setLevel(nextLevel)
    }, 100)
  }, [])

  // Gắn 1 MediaStream (mới xin hoặc xin lại) vào analyser — dựng lại AudioContext mỗi lần vì
  // AudioContext cũ đã đóng không thể tái sử dụng. Nếu meter đang chạy (đang giữa buổi phỏng vấn,
  // không phải lần xin quyền đầu tiên) thì tự khởi động lại meter cho analyser mới.
  const attachStream = useCallback(
    async (stream: MediaStream) => {
      const meterWasRunning = levelTimerRef.current !== null
      stopLevelMeter()
      void audioCtxRef.current?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())

      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioCtx = new AudioCtx()
      // Chrome/Safari có thể tạo AudioContext ở trạng thái "suspended" (đặc biệt sau await getUserMedia,
      // mất liên kết trực tiếp với user gesture) — không resume() thì analyser không nhận được audio nào
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      const track = stream.getAudioTracks()[0]
      if (track) track.enabled = !isMutedRef.current

      streamRef.current = stream
      if (meterWasRunning) startLevelMeter()
    },
    [startLevelMeter, stopLevelMeter],
  )

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermission('unsupported')
      return false
    }
    setPermission('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      await attachStream(stream)
      startLevelMeter()
      setPermission('granted')
      return true
    } catch {
      setPermission('denied')
      return false
    }
  }, [attachStream, startLevelMeter])

  // Ứng viên đổi thiết bị âm thanh (vd rút/cắm lại tai nghe có mic, đổi tai nghe Bluetooth) giữa
  // chừng phỏng vấn có thể khiến track mic đang dùng chết lặng lẽ — trình duyệt không báo lỗi gì,
  // chỉ có readyState của track chuyển "ended". Trước mỗi lần ghi âm, luôn kiểm tra track còn sống
  // hay không và xin lại mic nếu cần — KHÔNG hiện lại popup xin quyền vì trình duyệt đã cấp từ
  // trước, getUserMedia sẽ tự chọn thiết bị mặc định hiện tại (chính là tai nghe mới).
  const ensureLiveStream = useCallback(async (): Promise<MediaStream | null> => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track && track.readyState === 'live') return streamRef.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      await attachStream(stream)
      return stream
    } catch {
      return null
    }
  }, [attachStream])

  const startRecording = useCallback(async (): Promise<boolean> => {
    const stream = await ensureLiveStream()
    if (!stream) return false
    try {
      chunksRef.current = []
      maxLevelRef.current = 0
      const mimeType = pickSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      return true
    } catch {
      return false
    }
  }, [ensureLiveStream])

  // hadSound = true nếu mức âm thanh vượt SILENCE_LEVEL_THRESHOLD ít nhất 1 lần trong lúc ghi âm —
  // false nghĩa là gần như im lặng suốt, dùng để tránh gửi audio "im lặng" lên STT (xem hằng số ở
  // đầu file: Whisper hay bịa vài từ ngẫu nhiên khi transcribe audio không có tiếng nói thật).
  const stopRecording = useCallback((): Promise<{ blob: Blob | null; hadSound: boolean }> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      const hadSound = maxLevelRef.current >= SILENCE_LEVEL_THRESHOLD
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false)
        resolve({ blob: null, hadSound })
        return
      }
      recorder.onstop = () => {
        setIsRecording(false)
        if (chunksRef.current.length === 0) {
          resolve({ blob: null, hadSound })
          return
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        resolve({ blob, hadSound })
      }
      recorder.stop()
    })
  }, [])

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    isMutedRef.current = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  const release = useCallback(() => {
    stopLevelMeter()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
  }, [stopLevelMeter])

  return {
    permission,
    level,
    isRecording,
    isMuted,
    requestPermission,
    startRecording,
    stopRecording,
    toggleMute,
    release,
  }
}
