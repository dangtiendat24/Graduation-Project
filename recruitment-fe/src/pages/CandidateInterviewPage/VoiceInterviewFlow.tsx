import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  Square,
  Bot,
  Clock,
  Check,
  User,
  PhoneOff,
} from 'lucide-react'
import {
  startVoiceInterview,
  getVoiceInterviewState,
  submitVoiceAnswer,
  endVoiceInterview,
  audioBase64ToUrl,
  type VoiceQuestion,
  type VoiceAnswerResult,
} from '../../api/voiceInterview'
import type { InterviewQuestionCategory, InterviewQuestionDifficulty } from '../../api/interviews'
import { useMicRecorder } from './useMicRecorder'
import './VoiceInterviewFlow.css'

const RECORD_SECONDS = 120

const CATEGORY_LABEL: Record<InterviewQuestionCategory, string> = {
  technical: 'Kỹ thuật',
  situational: 'Tình huống',
  behavioral: 'Kinh nghiệm',
}

const DIFFICULTY_LABEL: Record<InterviewQuestionDifficulty, string> = {
  easy: 'Cơ bản',
  medium: 'Trung bình',
  hard: 'Nâng cao',
}

type Screen =
  | 'permission'
  | 'mic-test'
  | 'loading-state'
  | 'starting'
  | 'question'
  | 'ready'
  | 'recording'
  | 'submitting'
  | 'feedback'
  | 'completed'
  | 'mic-error'
  | 'network-error'

const STAGE_SCREENS: Screen[] = ['question', 'ready', 'recording', 'submitting', 'feedback']
const END_ALLOWED_SCREENS: Screen[] = ['question', 'ready', 'recording']

interface SubmitPayload {
  questionId: string
  audioBlob: Blob | null
  responseLatencyMs: number
  tabBlurCount: number
  tabBlurTotalMs: number
}

export default function VoiceInterviewFlow({
  sessionId,
  isResume,
  onFallbackToText,
  onCompleted,
}: {
  sessionId: string
  isResume: boolean
  onFallbackToText: () => void
  onCompleted: () => void
}) {
  const mic = useMicRecorder()
  // Khi resume (đã bắt đầu voice interview từ trước, thoát ra rồi quay lại) thì KHÔNG hiện lại màn
  // xin quyền mic — chỉ hỏi 1 lần duy nhất ở lượt bắt đầu đầu tiên của cả buổi phỏng vấn. Trình
  // duyệt cũng không hỏi lại popup quyền mic thật nếu đã cấp trước đó, nên xin quyền ngầm rồi vào
  // thẳng câu hỏi đang dở là an toàn.
  const [screen, setScreen] = useState<Screen>(isResume ? 'loading-state' : 'permission')
  const [currentQuestion, setCurrentQuestion] = useState<VoiceQuestion | null>(null)
  const [feedback, setFeedback] = useState<VoiceAnswerResult | null>(null)
  const [recordSecondsLeft, setRecordSecondsLeft] = useState(RECORD_SECONDS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const questionAudioEndedAtRef = useRef<number | null>(null)
  const trackingRef = useRef(false)
  const blurCountRef = useRef(0)
  const blurTotalMsRef = useRef(0)
  const blurStartRef = useRef<number | null>(null)
  // Chặn gọi lặp handleStopRecording/handleSkip cho cùng 1 câu hỏi (double-click, double-tap) —
  // submitPayload là async nên screen chỉ chuyển sang 'submitting' SAU khi await xong, nghĩa là
  // giữa 2 lần click liên tiếp nút vẫn còn hiển thị và bấm được, dễ gửi trùng 2 lần cho cùng 1
  // câu. Khoá bằng ref (đọc/ghi đồng bộ) thay vì dựa vào state vì state không cập nhật kịp.
  const submitLockRef = useRef(false)
  // Lưu lại đúng hành động cần thử lại khi rơi vào màn network-error — màn lỗi có thể đến từ 3
  // nguồn khác nhau (nộp câu trả lời / bắt đầu phỏng vấn mới / lấy lại trạng thái khi resume),
  // mỗi nguồn cần gọi lại đúng API tương ứng thay vì đoán qua trạng thái khác.
  const retryRef = useRef<() => void>(() => {})

  const submitMutation = useMutation({
    mutationFn: (payload: SubmitPayload) => submitVoiceAnswer(sessionId, payload),
  })

  const endMutation = useMutation({
    mutationFn: () => endVoiceInterview(sessionId),
  })

  // Dừng track mic khi rời trang, bất kể đang ở màn nào — CHỈ chạy cleanup lúc unmount thật sự.
  // mic.release là useCallback ổn định (deps chỉ phụ thuộc stopLevelMeter, cũng ổn định) nên an
  // toàn khi bỏ qua exhaustive-deps; nếu để deps=[mic] thì object `mic` mới mỗi lần render (do
  // useMicRecorder trả về object literal) sẽ khiến effect này chạy lại — và cleanup cũ gọi
  // release() — sau MỖI lần render, tắt luôn AudioContext/interval/track mic gần như ngay lập tức.
  useEffect(() => {
    return () => mic.release()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resume: xin quyền mic ngầm (không cần bấm nút) rồi vào thẳng câu hỏi đang dở, chỉ chạy 1 lần
  // lúc mount vì `isResume` cố định trong suốt vòng đời component (key theo sessionId ở component cha).
  useEffect(() => {
    if (isResume) void handlePermissionGranted()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Theo dõi rời tab/cửa sổ — chỉ tính khi trackingRef bật (từ lúc câu hỏi đọc xong tới lúc nộp)
  useEffect(() => {
    function handleVisibility() {
      if (!trackingRef.current) return
      if (document.hidden) {
        blurStartRef.current = Date.now()
        blurCountRef.current += 1
      } else if (blurStartRef.current !== null) {
        blurTotalMsRef.current += Date.now() - blurStartRef.current
        blurStartRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Đếm ngược 2 phút khi đang ghi âm
  useEffect(() => {
    if (screen !== 'recording') return
    const id = window.setInterval(() => {
      setRecordSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen])

  useEffect(() => {
    if (screen === 'recording' && recordSecondsLeft === 0) {
      void handleStopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, recordSecondsLeft])

  function enterQuestion(question: VoiceQuestion) {
    submitLockRef.current = false
    setShowEndConfirm(false)
    setCurrentQuestion(question)
    setFeedback(null)
    setScreen('question')
  }

  function beginTrackingWindow() {
    questionAudioEndedAtRef.current = Date.now()
    blurCountRef.current = 0
    blurTotalMsRef.current = 0
    blurStartRef.current = null
    trackingRef.current = true
  }

  function handleQuestionAudioEnded() {
    beginTrackingWindow()
    setScreen('ready')
  }

  function handleStartRecording() {
    mic.startRecording()
    setRecordSecondsLeft(RECORD_SECONDS)
    setScreen('recording')
  }

  async function submitPayload(payload: SubmitPayload) {
    setScreen('submitting')
    try {
      const result = await submitMutation.mutateAsync(payload)
      setFeedback(result)
      setScreen('feedback')
    } catch {
      retryRef.current = () => void submitPayload(payload)
      setScreen('network-error')
    }
  }

  async function handleStopRecording() {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setShowEndConfirm(false)
    trackingRef.current = false
    const blob = await mic.stopRecording()
    const responseLatencyMs = questionAudioEndedAtRef.current
      ? Date.now() - questionAudioEndedAtRef.current
      : 0
    await submitPayload({
      questionId: currentQuestion!.questionId,
      audioBlob: blob,
      responseLatencyMs,
      tabBlurCount: blurCountRef.current,
      tabBlurTotalMs: blurTotalMsRef.current,
    })
  }

  async function handleSkip() {
    if (submitLockRef.current) return
    submitLockRef.current = true
    setShowEndConfirm(false)
    trackingRef.current = false
    if (mic.isRecording) await mic.stopRecording()
    const responseLatencyMs = questionAudioEndedAtRef.current
      ? Date.now() - questionAudioEndedAtRef.current
      : 0
    await submitPayload({
      questionId: currentQuestion!.questionId,
      audioBlob: null,
      responseLatencyMs,
      tabBlurCount: blurCountRef.current,
      tabBlurTotalMs: blurTotalMsRef.current,
    })
  }

  async function handleEndInterview() {
    trackingRef.current = false
    if (mic.isRecording) await mic.stopRecording()
    setShowEndConfirm(false)
    try {
      await endMutation.mutateAsync()
    } catch {
      // dù API lỗi vẫn không nên kẹt ứng viên lại giữa chừng — coi như đã kết thúc phía FE,
      // trạng thái thật sẽ được đồng bộ lại lần sau nếu họ quay lại trang
    }
    setScreen('completed')
    onCompleted()
  }

  function handleFeedbackEnded() {
    if (!feedback || feedback.isComplete || !feedback.nextQuestion) {
      setScreen('completed')
      onCompleted()
      return
    }
    enterQuestion(feedback.nextQuestion)
  }

  async function handlePermissionGranted() {
    const granted = await mic.requestPermission()
    if (!granted) {
      setScreen('mic-error')
      return
    }
    if (isResume) {
      setScreen('loading-state')
      try {
        const state = await getVoiceInterviewState(sessionId)
        if (state.status === 'completed') {
          setScreen('completed')
          onCompleted()
          return
        }
        if (!state.currentQuestion) {
          retryRef.current = () => void handlePermissionGranted()
          setErrorMessage('Không tìm thấy câu hỏi đang chờ trả lời.')
          setScreen('network-error')
          return
        }
        enterQuestion(state.currentQuestion)
      } catch {
        retryRef.current = () => void handlePermissionGranted()
        setErrorMessage(null)
        setScreen('network-error')
      }
    } else {
      setScreen('mic-test')
    }
  }

  async function handleStartInterview() {
    setScreen('starting')
    try {
      const question = await startVoiceInterview(sessionId)
      enterQuestion(question)
    } catch {
      retryRef.current = () => void handleStartInterview()
      setErrorMessage(null)
      setScreen('network-error')
    }
  }

  const mm = String(Math.floor(recordSecondsLeft / 60)).padStart(2, '0')
  const ss = String(recordSecondsLeft % 60).padStart(2, '0')

  const candidateSpeaking = screen === 'recording' && !mic.isMuted && mic.level > 0.08

  const completedCount = currentQuestion
    ? screen === 'submitting' || screen === 'feedback'
      ? currentQuestion.questionIndex
      : currentQuestion.questionIndex - 1
    : 0

  return (
    <div className="vi-wrap">
      {screen === 'permission' && (
        <PermissionScreen onGrant={handlePermissionGranted} requesting={mic.permission === 'requesting'} />
      )}

      {screen === 'mic-test' && <MicTestScreen level={mic.level} onContinue={handleStartInterview} />}

      {(screen === 'loading-state' || screen === 'starting') && <LoadingScreen />}

      {screen === 'mic-error' && (
        <MicErrorScreen state={mic.permission} onRetry={handlePermissionGranted} onFallbackToText={onFallbackToText} />
      )}

      {screen === 'network-error' && (
        <NetworkErrorScreen message={errorMessage} onRetry={() => retryRef.current()} />
      )}

      {currentQuestion && STAGE_SCREENS.includes(screen) && (
        <div className="vi-shell">
          <div className="vi-topbar">
            <span className="vi-topbar-chip">
              <Bot size={14} />
              Câu {currentQuestion.questionIndex}/{currentQuestion.totalQuestions}
            </span>

            <div className="vi-topbar-right">
              {screen === 'recording' && (
                <span className="vi-topbar-timer">
                  <Clock size={14} />
                  {mm}:{ss}
                </span>
              )}

              {END_ALLOWED_SCREENS.includes(screen) && !showEndConfirm && (
                <button className="vi-end-btn" onClick={() => setShowEndConfirm(true)}>
                  <PhoneOff size={13} />
                  Kết thúc phỏng vấn
                </button>
              )}

              {showEndConfirm && (
                <div className="vi-end-confirm">
                  <span>Các câu chưa trả lời sẽ tính 0 điểm. Chắc chắn kết thúc?</span>
                  <button
                    className="iv-btn iv-btn-ghost"
                    disabled={endMutation.isPending}
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Hủy
                  </button>
                  <button
                    className="vi-end-btn vi-end-btn--confirm"
                    disabled={endMutation.isPending}
                    onClick={() => void handleEndInterview()}
                  >
                    {endMutation.isPending ? 'Đang kết thúc...' : 'Xác nhận'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="vi-shell-body">
            <div className="vi-stage-card">
              <div className="vi-avatar-pair">
                <div className="vi-avatar-col">
                  <div className={`vi-avatar-circle${aiSpeaking ? ' speaking' : ''}`}>
                    <Bot size={30} />
                  </div>
                  <span className={`vi-speaking-badge${aiSpeaking ? ' show' : ''}`}>
                    <span className="vi-speaking-dot" />
                    Đang nói
                  </span>
                </div>
                <div className="vi-avatar-col">
                  <div className={`vi-avatar-circle vi-avatar-circle--candidate${candidateSpeaking ? ' speaking' : ''}`}>
                    <User size={30} />
                  </div>
                  <span className={`vi-speaking-badge vi-speaking-badge--candidate${candidateSpeaking ? ' show' : ''}`}>
                    <span className="vi-speaking-dot" />
                    Đang nói
                  </span>
                </div>
              </div>

              <div className="vi-stage-tags">
                <span className={`iv-badge iv-badge-${currentQuestion.category}`}>
                  {CATEGORY_LABEL[currentQuestion.category]}
                </span>
                <span className={`iv-diff iv-diff-${currentQuestion.difficulty}`}>
                  <span className="iv-diff-dot" />
                  {DIFFICULTY_LABEL[currentQuestion.difficulty]}
                </span>
              </div>

              {screen === 'question' && (
                <AudioCaptionPlayer
                  key={`q-${currentQuestion.questionId}`}
                  audioBase64={currentQuestion.audioBase64}
                  text={currentQuestion.questionText}
                  onEnded={handleQuestionAudioEnded}
                  onPlayStateChange={setAiSpeaking}
                />
              )}

              {screen !== 'question' && screen !== 'feedback' && (
                <div className="vi-caption-box">
                  <p className="vi-caption-text vi-caption-static">{currentQuestion.questionText}</p>
                </div>
              )}

              {screen === 'feedback' && feedback && (
                <>
                  <div className="vi-answer-box">
                    <span className="vi-answer-box-label">Câu trả lời của bạn</span>
                    <p className="vi-answer-box-text">
                      {feedback.answerText.trim() ? feedback.answerText : <em>Không có câu trả lời</em>}
                    </p>
                  </div>
                  <AudioCaptionPlayer
                    key={`fb-${feedback.feedbackAudioBase64.slice(0, 16)}`}
                    audioBase64={feedback.feedbackAudioBase64}
                    text={feedback.score.comment}
                    onEnded={handleFeedbackEnded}
                    onPlayStateChange={setAiSpeaking}
                  />
                </>
              )}

              <div className="vi-control-bar">
                <div className="vi-control-icons">
                  <button
                    type="button"
                    className={`vi-control-icon-btn${mic.isMuted ? ' muted' : mic.level > 0.05 ? ' active' : ''}`}
                    title={mic.isMuted ? 'Bật lại micro' : 'Tắt micro tạm thời'}
                    onClick={mic.toggleMute}
                  >
                    {mic.isMuted ? <MicOff size={17} /> : <Mic size={17} />}
                  </button>
                </div>

                <div className="vi-control-main">
                  {screen === 'question' && <p className="vi-hint">Đang đọc câu hỏi...</p>}

                  {screen === 'ready' && (
                    <>
                      <button className="vi-record-btn" onClick={handleStartRecording}>
                        <Mic size={20} />
                      </button>
                      <span className="vi-control-label">Bắt đầu ghi âm</span>
                    </>
                  )}

                  {screen === 'recording' && (
                    <>
                      <div className="vi-meter vi-meter-small">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <span
                            key={i}
                            className={`vi-meter-bar${i < Math.round(mic.level * 16) ? ' active' : ''}`}
                          />
                        ))}
                      </div>
                      <button className="vi-record-btn recording" onClick={() => void handleStopRecording()}>
                        <Square size={18} />
                      </button>
                      <span className="vi-control-label">Dừng &amp; nộp câu trả lời</span>
                    </>
                  )}

                  {screen === 'submitting' && (
                    <>
                      <div className="vi-icon-spin">
                        <Wifi size={20} />
                      </div>
                      <span className="vi-control-label">Đang chấm điểm...</span>
                    </>
                  )}

                  {screen === 'feedback' && (
                    <span className="vi-control-label">
                      {feedback?.isComplete ? 'Đây là câu cuối cùng...' : 'Chuyển câu tiếp theo sau khi nghe xong...'}
                    </span>
                  )}
                </div>

                <div className="vi-control-skip">
                  {screen === 'ready' && (
                    <button className="iv-link-btn" onClick={() => void handleSkip()}>
                      Bỏ qua
                    </button>
                  )}
                </div>
              </div>
            </div>

            <InterviewRoadmap completedCount={completedCount} totalQuestions={currentQuestion.totalQuestions} />
          </div>
        </div>
      )}

      {screen === 'completed' && <CompletedScreen />}
    </div>
  )
}

// ───────────────────────────── Sub-screens ─────────────────────────────

function PermissionScreen({ onGrant, requesting }: { onGrant: () => void; requesting: boolean }) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-teal">
          <Mic size={26} />
        </div>
        <h2>Cần quyền truy cập micro</h2>
        <p>
          Buổi phỏng vấn này diễn ra bằng giọng nói — hệ thống cần quyền sử dụng micro của bạn để
          ghi âm câu trả lời. Chúng tôi chỉ ghi âm khi bạn đang trả lời câu hỏi.
        </p>
        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onGrant} disabled={requesting}>
          {requesting ? 'Đang chờ cấp quyền...' : 'Cấp quyền micro'}
        </button>
      </div>
    </div>
  )
}

function MicTestScreen({ level, onContinue }: { level: number; onContinue: () => void }) {
  const bars = 20
  const activeBars = Math.round(level * bars)
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-teal">
          <Mic size={26} />
        </div>
        <h2>Kiểm tra micro</h2>
        <p>Hãy thử nói gì đó — nếu các vạch bên dưới nhấp nháy theo giọng nói, micro của bạn hoạt động tốt.</p>
        <div className="vi-meter">
          {Array.from({ length: bars }).map((_, i) => (
            <span key={i} className={`vi-meter-bar${i < activeBars ? ' active' : ''}`} />
          ))}
        </div>
        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onContinue}>
          Bắt đầu phỏng vấn
        </button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-spin">
          <Wifi size={26} />
        </div>
        <h2>Đang chuẩn bị buổi phỏng vấn</h2>
        <p>Vui lòng đợi trong giây lát...</p>
      </div>
    </div>
  )
}

function MicErrorScreen({
  state,
  onRetry,
  onFallbackToText,
}: {
  state: string
  onRetry: () => void
  onFallbackToText: () => void
}) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-danger">
          <MicOff size={26} />
        </div>
        <h2>Không thể truy cập micro</h2>
        <p>
          {state === 'unsupported'
            ? 'Trình duyệt của bạn không hỗ trợ ghi âm. Hãy dùng Chrome/Edge/Firefox bản mới nhất.'
            : 'Bạn đã từ chối quyền micro, hoặc micro đang được ứng dụng khác sử dụng. Kiểm tra quyền truy cập micro trong cài đặt trình duyệt rồi thử lại.'}
        </p>
        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onRetry}>
          Thử lại
        </button>
        <button className="iv-btn iv-btn-ghost iv-btn-block" style={{ marginTop: 10 }} onClick={onFallbackToText}>
          Chuyển sang trả lời bằng văn bản
        </button>
      </div>
    </div>
  )
}

function NetworkErrorScreen({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-danger">
          <AlertTriangle size={26} />
        </div>
        <h2>Đã có lỗi xảy ra</h2>
        <p>{message ?? 'Kết nối gặp sự cố. Kiểm tra mạng của bạn rồi thử lại — câu trả lời của bạn chưa bị mất.'}</p>
        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    </div>
  )
}

function CompletedScreen() {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-teal">
          <CheckCircle2 size={26} />
        </div>
        <h2>Bạn đã hoàn thành phỏng vấn!</h2>
        <p>
          Câu trả lời của bạn đã được ghi nhận. Nhà tuyển dụng sẽ xem xét kết quả và liên hệ với
          bạn ở bước tiếp theo — bạn có thể theo dõi trạng thái tại mục Đơn đã nộp.
        </p>
      </div>
    </div>
  )
}

function InterviewRoadmap({
  completedCount,
  totalQuestions,
}: {
  completedCount: number
  totalQuestions: number
}) {
  return (
    <aside className="vi-roadmap">
      <div className="vi-roadmap-title">Lộ trình phỏng vấn</div>
      <div className="vi-roadmap-list">
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const step = i + 1
          const status = step <= completedCount ? 'done' : step === completedCount + 1 ? 'current' : 'upcoming'
          return (
            <div key={step} className={`vi-roadmap-item vi-roadmap-item--${status}`}>
              <span className="vi-roadmap-dot">{status === 'done' ? <Check size={12} /> : step}</span>
              <span className="vi-roadmap-label">
                {status === 'upcoming' ? 'Câu hỏi tiếp theo' : `Câu hỏi ${step}`}
              </span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function AudioCaptionPlayer({
  audioBase64,
  text,
  onEnded,
  onPlayStateChange,
}: {
  audioBase64: string
  text: string
  onEnded: () => void
  onPlayStateChange: (playing: boolean) => void
}) {
  const [revealed, setRevealed] = useState(0)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [playbackErrorDetail, setPlaybackErrorDetail] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  // Cố ý KHÔNG revokeObjectURL: dưới React 18 StrictMode (dev), effect cleanup chạy ngay sau
  // effect đầu tiên (setup → cleanup → setup lại) để phát hiện bug — nếu revoke ở đây, URL bị
  // hỏng trước khi thẻ <audio> kịp đọc, gây lỗi "NotSupportedError: no supported sources" một
  // cách ngẫu nhiên theo thời gian. Mỗi clip chỉ vài chục KB, cả buổi phỏng vấn tối đa ~14 clip
  // (7 câu hỏi + 7 feedback) — không đáng để đánh đổi lấy race condition này.
  const url = useMemo(() => audioBase64ToUrl(audioBase64), [audioBase64])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setPlaybackBlocked(false)
    setPlaybackErrorDetail(null)
    // Không dùng thuộc tính autoPlay khai báo — trình duyệt có thể chặn autoplay âm thanh khi
    // lệnh play() không còn nằm trong "user gesture" trực tiếp (audio này phát sau 1 vòng gọi
    // mạng bất đồng bộ, không phải ngay trong onClick), và autoPlay không cho biết khi nào bị
    // chặn. Gọi play() tường minh để bắt được lỗi và hiển thị nút phát thủ công thay vì treo im lặng.
    audio.play().catch((err: unknown) => {
      setPlaybackBlocked(true)
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      setPlaybackErrorDetail(detail)
      console.error('[voice-interview] audio.play() failed', err)
    })
     
  }, [url])

  // Đồng bộ hiện chữ theo tốc độ nói bằng requestAnimationFrame thay vì sự kiện "timeupdate" của
  // trình duyệt — timeupdate chỉ bắn ~4 lần/giây và không đều, khiến chữ hiện ra giật cục (vài
  // chữ rồi khựng lại). rAF chạy mỗi khung hình (~60fps) nên chữ hiện mượt liên tục.
  useEffect(() => {
    let rafId: number
    function tick() {
      const audio = audioRef.current
      if (audio && audio.duration && Number.isFinite(audio.duration)) {
        const ratio = Math.min(1, audio.currentTime / audio.duration)
        setRevealed(Math.round(ratio * text.length))
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [text])

  function handleAudioError() {
    const mediaError = audioRef.current?.error
    setPlaybackBlocked(true)
    const detail = mediaError ? `MediaError code=${mediaError.code} ${mediaError.message}` : 'unknown media error'
    setPlaybackErrorDetail(detail)
    console.error('[voice-interview] audio element error', mediaError)
  }

  function handleManualPlay() {
    setPlaybackBlocked(false)
    setPlaybackErrorDetail(null)
    audioRef.current?.play().catch((err: unknown) => {
      setPlaybackBlocked(true)
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      setPlaybackErrorDetail(detail)
      console.error('[voice-interview] manual audio.play() failed', err)
    })
  }

  return (
    <div className="vi-caption-box">
      <audio
        ref={audioRef}
        src={url}
        onEnded={onEnded}
        onError={handleAudioError}
        onPlay={() => onPlayStateChange(true)}
        onPause={() => onPlayStateChange(false)}
      />
      <p className="vi-caption-text">{text.slice(0, revealed)}</p>
      {playbackBlocked && (
        <>
          <button className="iv-btn iv-btn-primary" onClick={handleManualPlay}>
            Bấm để phát âm thanh
          </button>
          {playbackErrorDetail && <p className="vi-hint">{playbackErrorDetail}</p>}
        </>
      )}
    </div>
  )
}
