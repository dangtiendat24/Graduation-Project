import { useCallback, useRef, useState } from 'react'

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']

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
      setLevel(Math.min(1, Math.sqrt(sumSquares / data.length) * 4))
    }, 100)
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermission('unsupported')
      return false
    }
    setPermission('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

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
      startLevelMeter()

      setPermission('granted')
      return true
    } catch {
      setPermission('denied')
      return false
    }
  }, [startLevelMeter])

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    const mimeType = pickSupportedMimeType()
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start()
    recorderRef.current = recorder
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false)
        resolve(null)
        return
      }
      recorder.onstop = () => {
        setIsRecording(false)
        if (chunksRef.current.length === 0) {
          resolve(null)
          return
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        resolve(blob)
      }
      recorder.stop()
    })
  }, [])

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
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
