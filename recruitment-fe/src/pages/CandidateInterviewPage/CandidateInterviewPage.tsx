import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CandidateLayout from '../../layouts/CandidateLayout/CandidateLayout'
import { getMyApplications, getMyApplicationDetail } from '../../api/candidateApplications'
import {
  getInterviewSession,
  submitInterviewAnswer,
  completeInterviewSession,
  type InterviewSessionDetail,
  type InterviewQuestion,
  type InterviewQuestionCategory,
  type InterviewQuestionDifficulty,
} from '../../api/interviews'
import {
  Bot,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Building2,
  Mic,
  Keyboard,
} from 'lucide-react'
import VoiceInterviewFlow from './VoiceInterviewFlow'
import './CandidateInterviewPage.css'

const MAX_ANSWER_LENGTH = 2000
const MIN_ANSWERS_TO_SUBMIT = 1

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

const SESSION_STATUS_LABEL: Record<string, string> = {
  pending: 'Chưa bắt đầu',
  in_progress: 'Đang làm dở',
  completed: 'Đã nộp bài',
  timeout: 'Đã hết hạn',
  cancelled: 'Đã huỷ',
}

type Screen = 'loading' | 'error' | 'intro' | 'answering' | 'review' | 'completed'

function deriveScreen(session: InterviewSessionDetail, hasStarted: boolean, isReviewing: boolean): Screen {
  if (session.status === 'completed') return 'completed'
  if (session.questionsStatus === 'error') return 'error'
  if (session.questionsStatus !== 'done' || !session.questions) return 'loading'
  if (!hasStarted) return 'intro'
  if (isReviewing) return 'review'
  return 'answering'
}

export default function CandidateInterviewPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return (
      <CandidateLayout>
        <SessionPickerScreen />
      </CandidateLayout>
    )
  }

  // key theo sessionId để mỗi phiên có state riêng biệt, tránh dính dữ liệu khi chuyển qua lại
  return <InterviewFlow key={sessionId} sessionId={sessionId} />
}

// ───────────────────────────── Danh sách chọn phiên ─────────────────────────────

function SessionPickerScreen() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-applications', 'interview-sessions'],
    queryFn: () => getMyApplications({ limit: 100 }),
  })

  const sessions = (data?.data ?? []).filter((a) => a.interview?.sessionId)

  return (
    <>
      <div className="iv-context-line">
        <span className="iv-role">Phỏng vấn AI</span>
      </div>
      <p className="iv-picker-hint">
        Chọn một đơn ứng tuyển bên dưới để bắt đầu hoặc tiếp tục buổi phỏng vấn AI.
      </p>

      {isLoading && <div className="iv-picker-empty">Đang tải danh sách...</div>}
      {isError && <div className="iv-picker-empty">Lỗi tải dữ liệu. Vui lòng thử lại.</div>}

      {!isLoading && !isError && (
        <div className="iv-picker-list">
          {sessions.map((a) => (
            <button
              key={a.applicationId}
              className="iv-picker-card"
              onClick={() => navigate(`/candidate/interview?sessionId=${a.interview!.sessionId}`)}
            >
              <div className="iv-picker-logo">
                <Building2 size={20} />
              </div>
              <div className="iv-picker-info">
                <div className="iv-picker-title">{a.job.title}</div>
                <div className="iv-picker-company">{a.job.company?.name ?? 'N/A'}</div>
              </div>
              <span className={`iv-picker-status iv-picker-status-${a.interview!.status}`}>
                {SESSION_STATUS_LABEL[a.interview!.status ?? 'pending']}
              </span>
            </button>
          ))}

          {sessions.length === 0 && (
            <div className="iv-picker-empty">
              Bạn chưa có buổi phỏng vấn AI nào. Buổi phỏng vấn sẽ xuất hiện ở đây sau khi nhà
              tuyển dụng mời bạn phỏng vấn.
            </div>
          )}
        </div>
      )}
    </>
  )
}

function NotFoundScreen() {
  const navigate = useNavigate()
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-danger">
          <AlertTriangle size={26} />
        </div>
        <h2>Không tìm thấy buổi phỏng vấn</h2>
        <p>Buổi phỏng vấn này không tồn tại hoặc không thuộc về tài khoản của bạn.</p>
        <button
          className="iv-btn iv-btn-primary iv-btn-block"
          onClick={() => navigate('/candidate/interview')}
        >
          Quay lại danh sách
        </button>
      </div>
    </div>
  )
}

// ───────────────────────────── Luồng phỏng vấn ─────────────────────────────

function initialAnswersMap(session: InterviewSessionDetail): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of session.answers) map[a.questionId] = a.answerText
  return map
}

function initialQuestionIndex(session: InterviewSessionDetail, answers: Record<string, string>): number {
  const questions = session.questions ?? []
  const firstUnanswered = questions.findIndex((q) => !(answers[q.id]?.trim().length > 0))
  return firstUnanswered === -1 ? 0 : firstUnanswered
}

function InterviewFlow({ sessionId }: { sessionId: string }) {
  const sessionQuery = useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: () => getInterviewSession(sessionId),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.questionsStatus
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
  })

  if (sessionQuery.isLoading) {
    return (
      <CandidateLayout>
        <BackToListLink />
        <LoadingCard />
      </CandidateLayout>
    )
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <CandidateLayout>
        <NotFoundScreen />
      </CandidateLayout>
    )
  }

  return <InterviewSessionView sessionId={sessionId} initialSession={sessionQuery.data} />
}

function InterviewSessionView({
  sessionId,
  initialSession,
}: {
  sessionId: string
  initialSession: InterviewSessionDetail
}) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: () => getInterviewSession(sessionId),
    initialData: initialSession,
    refetchInterval: (query) => {
      const status = query.state.data?.questionsStatus
      return status === 'pending' || status === 'processing' ? 3000 : false
    },
  })
  const session = sessionQuery.data ?? initialSession

  const applicationQuery = useQuery({
    queryKey: ['candidate-application-detail', session.applicationId],
    queryFn: () => getMyApplicationDetail(session.applicationId),
  })
  const jobTitle = applicationQuery.data?.job.title ?? '...'
  const companyName = applicationQuery.data?.job.company?.name ?? '...'

  const answerMutation = useMutation({
    mutationFn: (payload: { questionId: string; answerText: string }) =>
      submitInterviewAnswer(sessionId, payload),
  })

  const completeMutation = useMutation({
    mutationFn: () => completeInterviewSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interview-session', sessionId] })
      void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
  })

  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAnswersMap(session))
  const [hasStarted, setHasStarted] = useState(session.status !== 'pending')
  const [isReviewing, setIsReviewing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(() => initialQuestionIndex(session, answers))
  const [savedHint, setSavedHint] = useState(false)
  const [showSubmittedAnswers, setShowSubmittedAnswers] = useState(false)
  const [voiceIntent, setVoiceIntent] = useState(false)
  const [showTextIntro, setShowTextIntro] = useState(false)

  const questions = session.questions ?? []
  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length
  const screen = deriveScreen(session, hasStarted, isReviewing)

  // Voice interview đã được bắt đầu từ trước (vd tải lại trang) và CHƯA hoàn tất — mode đã khoá ở
  // server. Khi status đã "completed" thì không vào lại luồng ghi âm (đòi quyền mic) nữa, mà rơi
  // xuống màn "completed" chung bên dưới để xem lại câu hỏi/câu trả lời.
  const isVoiceActive =
    session.mode === 'voice' && session.status !== 'pending' && session.status !== 'completed'

  function handleVoiceCompleted() {
    void queryClient.invalidateQueries({ queryKey: ['interview-session', sessionId] })
    void queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
  }

  if (isVoiceActive || voiceIntent) {
    return (
      <CandidateLayout>
        <BackToListLink />
        <ContextLine jobTitle={jobTitle} companyName={companyName} />
        <VoiceInterviewFlow
          key={sessionId}
          sessionId={sessionId}
          isResume={isVoiceActive}
          onFallbackToText={() => {
            setVoiceIntent(false)
            setShowTextIntro(true)
          }}
          onCompleted={handleVoiceCompleted}
        />
      </CandidateLayout>
    )
  }

  function persistCurrentAnswer(value: string) {
    if (!currentQuestion) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
    if (value.trim().length > 0) {
      answerMutation.mutate({ questionId: currentQuestion.id, answerText: value })
      setSavedHint(true)
      window.setTimeout(() => setSavedHint(false), 1800)
    }
  }

  function goToQuestion(index: number) {
    setIsReviewing(false)
    setCurrentIndex(index)
  }

  function handleNext(value: string) {
    persistCurrentAnswer(value)
    if (currentIndex === questions.length - 1) {
      setIsReviewing(true)
      return
    }
    setCurrentIndex((i) => i + 1)
  }

  function handlePrev(value: string) {
    persistCurrentAnswer(value)
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function handleSubmit() {
    completeMutation.mutate()
  }

  return (
    <CandidateLayout>
      {(screen !== 'completed' || showSubmittedAnswers) && <BackToListLink />}

      {screen === 'loading' && <LoadingCard />}
      {screen === 'error' && <ErrorCard message={session.questionsError} />}

      {screen === 'intro' && !showTextIntro && (
        <ModeChoiceCard
          jobTitle={jobTitle}
          companyName={companyName}
          textQuestionCount={questions.length}
          onChooseVoice={() => setVoiceIntent(true)}
          onChooseText={() => setShowTextIntro(true)}
        />
      )}

      {screen === 'intro' && showTextIntro && (
        <IntroCard
          jobTitle={jobTitle}
          companyName={companyName}
          questionCount={questions.length}
          onStart={() => setHasStarted(true)}
        />
      )}

      {screen === 'answering' && currentQuestion && (
        <>
          <ContextLine jobTitle={jobTitle} companyName={companyName} />
          <AnsweringPanel
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            answeredCount={answeredCount}
            savedHint={savedHint}
            saveFailed={answerMutation.isError}
            onJump={goToQuestion}
            onNext={handleNext}
            onPrev={handlePrev}
            onReview={(value) => {
              persistCurrentAnswer(value)
              setIsReviewing(true)
            }}
          />
        </>
      )}

      {screen === 'review' && (
        <>
          <ContextLine jobTitle={jobTitle} companyName={companyName} />
          <ReviewPanel
            questions={questions}
            answers={answers}
            submitting={completeMutation.isPending}
            submitFailed={completeMutation.isError}
            onEdit={goToQuestion}
            onBack={() => setIsReviewing(false)}
            onSubmit={handleSubmit}
          />
        </>
      )}

      {screen === 'completed' && !showSubmittedAnswers && (
        <CompletedCard onViewAnswers={() => setShowSubmittedAnswers(true)} />
      )}

      {screen === 'completed' && showSubmittedAnswers && (
        <>
          <ContextLine jobTitle={jobTitle} companyName={companyName} />
          {session.mode === 'voice' ? (
            <VoiceSubmittedAnswersView answers={session.answers} />
          ) : (
            <SubmittedAnswersView questions={questions} answers={answers} />
          )}
        </>
      )}
    </CandidateLayout>
  )
}

// ───────────────────────────── Sub-views ─────────────────────────────

function BackToListLink() {
  const navigate = useNavigate()
  return (
    <button className="iv-back-link" onClick={() => navigate('/candidate/interview')}>
      <ChevronLeft size={15} />
      Quay lại danh sách phỏng vấn
    </button>
  )
}

function ContextLine({ jobTitle, companyName }: { jobTitle: string; companyName: string }) {
  return (
    <div className="iv-context-line">
      <span className="iv-role">{jobTitle}</span>
      <span className="iv-sep">·</span>
      <span className="iv-company">{companyName}</span>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-spin">
          <Loader2 size={26} />
        </div>
        <h2>Đang chuẩn bị câu hỏi phỏng vấn</h2>
        <p>
          Hệ thống đang phân tích CV của bạn và mô tả công việc để soạn bộ câu hỏi phù hợp. Quá
          trình này thường mất khoảng 10–20 giây.
        </p>
        <p className="iv-hint-small">Không cần tải lại trang — trang sẽ tự cập nhật.</p>
      </div>
    </div>
  )
}

function ErrorCard({ message }: { message: string | null }) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-danger">
          <AlertTriangle size={26} />
        </div>
        <h2>Không thể sinh câu hỏi phỏng vấn</h2>
        <p>
          {message ||
            'Đã có lỗi xảy ra trong quá trình chuẩn bị câu hỏi. Vui lòng thử lại sau ít phút, hoặc liên hệ nhà tuyển dụng nếu tình trạng này tiếp diễn.'}
        </p>
      </div>
    </div>
  )
}

function IntroCard({
  jobTitle,
  companyName,
  questionCount,
  onStart,
}: {
  jobTitle: string
  companyName: string
  questionCount: number
  onStart: () => void
}) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow iv-card-wide">
        <div className="iv-icon-ring iv-teal">
          <Bot size={26} />
        </div>
        <h2>Phỏng vấn sơ loại bằng AI</h2>
        <p className="iv-role-line">
          {jobTitle} · {companyName}
        </p>

        <div className="iv-brief-meta">
          <div>
            <div className="iv-meta-num">{questionCount}</div>
            <div className="iv-meta-label">câu hỏi</div>
          </div>
          <div>
            <div className="iv-meta-num">~15</div>
            <div className="iv-meta-label">phút</div>
          </div>
          <div>
            <div className="iv-meta-num">Văn bản</div>
            <div className="iv-meta-label">hình thức</div>
          </div>
        </div>

        <ul className="iv-brief-rules">
          <li>Trả lời từng câu bằng văn bản, không giới hạn thời gian cho mỗi câu.</li>
          <li>Bạn có thể quay lại chỉnh sửa câu trả lời trước khi nộp bài.</li>
          <li>
            Cần trả lời ít nhất {MIN_ANSWERS_TO_SUBMIT} câu để nộp bài — câu nào bỏ qua sẽ được
            tính 0 điểm.
          </li>
          <li>
            Sau khi nộp, câu trả lời sẽ được chấm điểm tự động và gửi cho nhà tuyển dụng — không
            thể chỉnh sửa lại.
          </li>
        </ul>

        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onStart}>
          Bắt đầu phỏng vấn
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function ModeChoiceCard({
  jobTitle,
  companyName,
  textQuestionCount,
  onChooseVoice,
  onChooseText,
}: {
  jobTitle: string
  companyName: string
  textQuestionCount: number
  onChooseVoice: () => void
  onChooseText: () => void
}) {
  return (
    <div className="iv-center">
      <div className="iv-card-narrow iv-card-wide">
        <div className="iv-icon-ring iv-teal">
          <Bot size={26} />
        </div>
        <h2>Phỏng vấn sơ loại bằng AI</h2>
        <p className="iv-role-line">
          {jobTitle} · {companyName}
        </p>

        <div className="iv-brief-meta">
          <div>
            <div className="iv-meta-num">7</div>
            <div className="iv-meta-label">câu hỏi</div>
          </div>
          <div>
            <div className="iv-meta-num">~15</div>
            <div className="iv-meta-label">phút</div>
          </div>
          <div>
            <div className="iv-meta-num">2 phút</div>
            <div className="iv-meta-label">mỗi câu</div>
          </div>
        </div>

        <ul className="iv-brief-rules">
          <li>Bạn sẽ nghe câu hỏi và trả lời trực tiếp bằng giọng nói qua micro.</li>
          <li>Sau mỗi câu, AI sẽ nhận xét ngay điểm tốt và chưa tốt trong câu trả lời của bạn.</li>
          <li>Độ khó câu hỏi tiếp theo điều chỉnh theo chất lượng câu trả lời trước đó.</li>
          <li>Một khi đã chọn hình thức phỏng vấn, bạn không thể đổi sang hình thức khác giữa chừng.</li>
        </ul>

        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onChooseVoice}>
          <Mic size={16} />
          Bắt đầu phỏng vấn bằng giọng nói
        </button>

        <button className="iv-link-btn" style={{ margin: '14px auto 0' }} onClick={onChooseText}>
          <Keyboard size={13} />
          Hoặc trả lời bằng văn bản ({textQuestionCount} câu, không giới hạn thời gian)
        </button>
      </div>
    </div>
  )
}

function AnsweringPanel({
  questions,
  currentIndex,
  answers,
  answeredCount,
  savedHint,
  saveFailed,
  onJump,
  onNext,
  onPrev,
  onReview,
}: {
  questions: InterviewQuestion[]
  currentIndex: number
  answers: Record<string, string>
  answeredCount: number
  savedHint: boolean
  saveFailed: boolean
  onJump: (index: number) => void
  onNext: (value: string) => void
  onPrev: (value: string) => void
  onReview: (value: string) => void
}) {
  const current = questions[currentIndex]
  const [draft, setDraft] = useState(answers[current.id] ?? '')

  // Đồng bộ ô nhập khi chuyển câu hỏi (câu đã có sẵn câu trả lời trước đó thì hiện lại)
  const [syncedFor, setSyncedFor] = useState(current.id)
  if (syncedFor !== current.id) {
    setSyncedFor(current.id)
    setDraft(answers[current.id] ?? '')
  }

  const isLast = currentIndex === questions.length - 1
  const canReviewEarly = answeredCount >= MIN_ANSWERS_TO_SUBMIT

  return (
    <>
      <div className="iv-progress-head">
        <div className="iv-progress-top">
          <span className="iv-progress-label">Tiến độ trả lời</span>
          <span className="iv-progress-frac">
            {answeredCount}/{questions.length} câu đã trả lời
          </span>
        </div>
        <div className="iv-progress-bar">
          <div
            className="iv-progress-fill"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <div className="iv-early-review">
          <button
            className="iv-link-btn"
            disabled={!canReviewEarly}
            title={!canReviewEarly ? `Trả lời ít nhất ${MIN_ANSWERS_TO_SUBMIT} câu để nộp bài` : undefined}
            onClick={() => onReview(draft)}
          >
            Xem lại &amp; nộp bài
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="iv-answer-body">
        <div className="iv-rail">
          {questions.map((q, i) => {
            const answered = (answers[q.id] ?? (i === currentIndex ? draft : '')).trim().length > 0
            const isCurrent = i === currentIndex
            return (
              <div
                key={q.id}
                className={`iv-rail-item${isCurrent ? ' current' : ''}${answered ? ' answered' : ''}`}
                onClick={() => {
                  if (!isCurrent) onJump(i)
                }}
              >
                <span className="iv-rail-idx">
                  {answered && !isCurrent ? <Check size={12} /> : i + 1}
                </span>
                <span className="iv-rail-q">{q.question}</span>
              </div>
            )
          })}
        </div>

        <div className="iv-qpanel">
          <div className="iv-qpanel-tags">
            <span className={`iv-badge iv-badge-${current.category}`}>
              {CATEGORY_LABEL[current.category]}
            </span>
            <span className={`iv-diff iv-diff-${current.difficulty}`}>
              <span className="iv-diff-dot" />
              {DIFFICULTY_LABEL[current.difficulty]}
            </span>
          </div>
          <h3>
            {currentIndex + 1}. {current.question}
          </h3>
          <p className="iv-qhint">
            Trả lời chi tiết, có ví dụ cụ thể nếu có thể — điều này giúp đánh giá chính xác hơn.
          </p>

          <div className="iv-answer-box">
            <textarea
              value={draft}
              maxLength={MAX_ANSWER_LENGTH}
              placeholder="Nhập câu trả lời của bạn..."
              onChange={(e) => setDraft(e.target.value)}
            />
            <span className="iv-char-count">
              {draft.length}/{MAX_ANSWER_LENGTH} ký tự
            </span>
          </div>

          <div className="iv-qpanel-footer">
            <button
              className="iv-btn iv-btn-ghost"
              disabled={currentIndex === 0}
              onClick={() => onPrev(draft)}
            >
              <ChevronLeft size={15} />
              Câu trước
            </button>
            {saveFailed ? (
              <span className="iv-saved-hint iv-saved-hint-error show">
                <AlertTriangle size={13} />
                Lưu câu trả lời thất bại, kiểm tra kết nối mạng
              </span>
            ) : (
              <span className={`iv-saved-hint${savedHint ? ' show' : ''}`}>
                <Check size={13} />
                Đã lưu câu trả lời
              </span>
            )}
            <button className="iv-btn iv-btn-primary" onClick={() => onNext(draft)}>
              {isLast ? 'Xem lại bài làm' : 'Câu tiếp theo'}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ReviewPanel({
  questions,
  answers,
  submitting,
  submitFailed,
  onEdit,
  onBack,
  onSubmit,
}: {
  questions: InterviewQuestion[]
  answers: Record<string, string>
  submitting: boolean
  submitFailed: boolean
  onEdit: (index: number) => void
  onBack: () => void
  onSubmit: () => void
}) {
  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length
  const missing = questions.length - answeredCount
  const canSubmit = answeredCount >= MIN_ANSWERS_TO_SUBMIT && !submitting

  return (
    <>
      <div className="iv-review-list">
        {questions.map((q, i) => {
          const text = (answers[q.id] ?? '').trim()
          return (
            <div key={q.id} className={`iv-review-item${text ? '' : ' unanswered'}`}>
              <div className="iv-review-item-top">
                <div className="iv-review-q">
                  {i + 1}. {q.question}
                </div>
                <div className="iv-review-item-actions">
                  {!text && <span className="iv-zero-tag">Sẽ tính 0 điểm</span>}
                  <button className="iv-edit-btn" onClick={() => onEdit(i)}>
                    <Pencil size={13} />
                    Sửa
                  </button>
                </div>
              </div>
              {text ? (
                <div className="iv-review-a">{text}</div>
              ) : (
                <div className="iv-review-a empty">Chưa trả lời</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="iv-review-warning">
        <AlertTriangle size={16} />
        Sau khi nộp bài, bạn không thể chỉnh sửa lại câu trả lời. Câu nào chưa trả lời sẽ được
        tính 0 điểm. Nhà tuyển dụng sẽ xem xét kết quả và liên hệ với bạn ở bước tiếp theo.
      </div>

      {submitFailed && (
        <div className="iv-review-warning iv-review-warning-danger">
          <AlertTriangle size={16} />
          Nộp bài thất bại, vui lòng thử lại. Nếu tình trạng tiếp diễn, kiểm tra kết nối mạng của
          bạn.
        </div>
      )}

      <div className="iv-review-footer">
        <span className={`iv-gate-hint${canSubmit ? ' ok' : ''}`}>
          {answeredCount < MIN_ANSWERS_TO_SUBMIT
            ? `Cần trả lời ít nhất ${MIN_ANSWERS_TO_SUBMIT} câu để nộp bài.`
            : missing > 0
              ? `Đủ điều kiện nộp bài — ${missing} câu chưa trả lời sẽ tính 0 điểm.`
              : 'Đã trả lời đầy đủ tất cả câu hỏi.'}
        </span>
        <div className="iv-review-footer-actions">
          <button className="iv-btn iv-btn-ghost" onClick={onBack} disabled={submitting}>
            Quay lại chỉnh sửa
          </button>
          <button className="iv-btn iv-btn-primary" disabled={!canSubmit} onClick={onSubmit}>
            {submitting ? 'Đang nộp bài...' : 'Nộp bài phỏng vấn'}
            <CheckCircle2 size={15} />
          </button>
        </div>
      </div>
    </>
  )
}

function CompletedCard({ onViewAnswers }: { onViewAnswers: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="iv-center">
      <div className="iv-card-narrow">
        <div className="iv-icon-ring iv-teal">
          <CheckCircle2 size={26} />
        </div>
        <h2>Bạn đã hoàn thành phỏng vấn!</h2>
        <p>
          Câu trả lời của bạn đã được ghi nhận và đang được xử lý. Nhà tuyển dụng sẽ xem kết quả và
          liên hệ với bạn ở bước tiếp theo — bạn có thể theo dõi trạng thái tại mục Đơn đã nộp.
        </p>
        <button className="iv-btn iv-btn-primary iv-btn-block" onClick={onViewAnswers}>
          Xem lại bài phỏng vấn
        </button>
        <button
          className="iv-btn iv-btn-ghost iv-btn-block"
          style={{ marginTop: 10 }}
          onClick={() => navigate('/candidate/applications')}
        >
          Về trang Đơn đã nộp
        </button>
      </div>
    </div>
  )
}

function SubmittedAnswersView({
  questions,
  answers,
}: {
  questions: InterviewQuestion[]
  answers: Record<string, string>
}) {
  return (
    <>
      <div className="iv-submitted-title">Bài phỏng vấn đã nộp</div>
      <div className="iv-review-list">
        {questions.map((q, i) => {
          const text = (answers[q.id] ?? '').trim()
          return (
            <div key={q.id} className={`iv-review-item${text ? '' : ' unanswered'}`}>
              <div className="iv-review-item-top">
                <div className="iv-review-q">
                  {i + 1}. {q.question}
                </div>
              </div>
              {text ? (
                <div className="iv-review-a">{text}</div>
              ) : (
                <div className="iv-review-a empty">Không trả lời</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function VoiceSubmittedAnswersView({ answers }: { answers: InterviewSessionDetail['answers'] }) {
  return (
    <>
      <div className="iv-submitted-title">Bài phỏng vấn đã nộp</div>
      <div className="iv-review-list">
        {answers.map((a, i) => {
          const text = a.answerText.trim()
          return (
            <div key={a.questionId} className={`iv-review-item${text ? '' : ' unanswered'}`}>
              <div className="iv-review-item-top">
                <div className="iv-review-q">
                  {i + 1}. {a.questionText}
                </div>
                <div className="iv-review-item-actions">
                  <span className={`iv-badge iv-badge-${a.category}`}>{CATEGORY_LABEL[a.category]}</span>
                  <span className={`iv-diff iv-diff-${a.difficulty}`}>
                    <span className="iv-diff-dot" />
                    {DIFFICULTY_LABEL[a.difficulty]}
                  </span>
                </div>
              </div>
              {text ? (
                <div className="iv-review-a">{text}</div>
              ) : (
                <div className="iv-review-a empty">Không trả lời</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
