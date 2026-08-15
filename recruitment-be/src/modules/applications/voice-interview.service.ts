import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { VALID_TRANSITIONS } from '@smart-recruitment/shared';
import {
  GeneratedQuestionItem,
  InterviewSession,
} from './interview-session.entity';
import {
  InterviewAnswer,
  InterviewAnswerSubScores,
} from './interview-answer.entity';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { Job as JobEntity } from '../jobs/job.entity';
import { StorageService } from '../storage/storage.service';
import { SubmitVoiceAnswerDto } from './dto/submit-voice-answer.dto';
import { AgentExecutionLoggerService } from '../admin/agent-execution-logger.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';

const CLOSED_STATUSES = ['completed', 'timeout', 'cancelled'];
const TOTAL_QUESTIONS = 7;
const NO_ANSWER_PLACEHOLDER =
  '(Ứng viên không trả lời trong thời gian quy định — hết giờ 2 phút hoặc không ghi âm được)';
const ZERO_VOICE_SUB_SCORES: InterviewAnswerSubScores = {
  relevance: 0,
  clarity: 0,
  depth: 0,
  correctness: 0,
  authenticity: 0,
};

interface AiFirstQuestionResponse {
  session_id: string;
  question: GeneratedQuestionItem | null;
  success: boolean;
  error: string | null;
}

interface AiTurnScore extends InterviewAnswerSubScores {
  total: number;
  comment: string;
}

interface AiTurnResponse {
  session_id: string;
  score: AiTurnScore | null;
  next_question: GeneratedQuestionItem | null;
  is_complete: boolean;
  success: boolean;
  error: string | null;
}

interface AiTranscribeResponse {
  text: string;
  pause_ratio_percent: number | null;
}

export interface VoiceQuestionPayload {
  questionId: string;
  questionText: string;
  category: string;
  difficulty: string;
  questionIndex: number;
  totalQuestions: number;
  audioBase64: string;
}

export interface VoiceAnswerResultPayload {
  score: AiTurnScore;
  answerText: string;
  feedbackAudioBase64: string;
  isComplete: boolean;
  nextQuestion: VoiceQuestionPayload | null;
}

export interface VoiceSessionStatePayload {
  sessionId: string;
  mode: string;
  status: string;
  totalQuestions: number;
  answeredCount: number;
  overallScore: number | null;
  currentQuestion: VoiceQuestionPayload | null;
}

/**
 * Điều phối voice interview (adaptive, sinh câu hỏi thích ứng theo lượt) — SONG SONG hoàn toàn
 * với InterviewSessionService (text, sinh sẵn cả bộ câu hỏi). Dùng chung interview_sessions/
 * interview_answers nhưng không đụng vào service/controller/processor của text. Một vài hàm
 * (buildParsedData/buildJobRequirements/calcOverallScore/buildTranscript/transition sang
 * "interviewed") lặp lại có chủ đích từ InterviewGenerationProcessor/InterviewScoringProcessor
 * thay vì tái dùng, để 2 luồng độc lập hoàn toàn — sửa 1 bên không ảnh hưởng bên kia.
 */
@Injectable()
export class VoiceInterviewService {
  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    @InjectRepository(InterviewAnswer)
    private readonly answerRepo: Repository<InterviewAnswer>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusHistory)
    private readonly historyRepo: Repository<ApplicationStatusHistory>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly agentLogger: AgentExecutionLoggerService,
    private readonly dashboardCache: DashboardCacheService,
  ) {}

  async startSession(
    candidateId: string,
    sessionId: string,
  ): Promise<VoiceQuestionPayload> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (
      session.status === 'in_progress' &&
      session.mode === 'voice' &&
      session.currentQuestion
    ) {
      // Idempotent — voice đã bắt đầu rồi (vd F5 lại trang), trả lại đúng câu hỏi hiện tại
      const answeredCount = await this.answerRepo.count({
        where: { sessionId },
      });
      return this.buildQuestionPayload(
        session.currentQuestion,
        answeredCount + 1,
      );
    }

    if (session.status !== 'pending') {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}" (mode: ${session.mode}), không thể bắt đầu voice interview`,
      );
    }

    const application = await this.getApplicationWithJob(session.applicationId);

    const result = await this.agentLogger.track(
      'agent3_interview',
      session.applicationId,
      async () => {
        const { data } = await firstValueFrom(
          this.httpService.post<AiFirstQuestionResponse>(
            `${this.getAiServiceUrl()}/api/ai/interview/adaptive/first-question`,
            {
              session_id: sessionId,
              parsed_data: this.buildParsedData(application),
              job_requirements: this.buildJobRequirements(application.job),
            },
            { headers: { 'x-internal-secret': this.getInternalSecret() } },
          ),
        );
        if (!data.success || !data.question) {
          throw new Error(
            data.error ?? 'AI service không sinh được câu hỏi mở đầu',
          );
        }
        return data;
      },
    );

    const question = result.question as GeneratedQuestionItem;
    await this.sessionRepo.update(sessionId, {
      mode: 'voice',
      status: 'in_progress',
      startedAt: new Date(),
      currentQuestion: question,
    });

    return this.buildQuestionPayload(question, 1);
  }

  async getSessionState(
    candidateId: string,
    sessionId: string,
  ): Promise<VoiceSessionStatePayload> {
    const session = await this.findOwnedSession(candidateId, sessionId);
    const answeredCount = await this.answerRepo.count({
      where: { sessionId },
    });

    let currentQuestion: VoiceQuestionPayload | null = null;
    if (
      session.status === 'in_progress' &&
      session.mode === 'voice' &&
      session.currentQuestion
    ) {
      currentQuestion = await this.buildQuestionPayload(
        session.currentQuestion,
        answeredCount + 1,
      );
    }

    return {
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      totalQuestions: TOTAL_QUESTIONS,
      answeredCount,
      overallScore:
        session.overallScore !== null ? Number(session.overallScore) : null,
      currentQuestion,
    };
  }

  async submitAnswer(
    candidateId: string,
    sessionId: string,
    dto: SubmitVoiceAnswerDto,
    audioFile: Express.Multer.File | undefined,
  ): Promise<VoiceAnswerResultPayload> {
    const session = await this.findOwnedSession(candidateId, sessionId);

    if (session.mode !== 'voice') {
      throw new BadRequestException('Buổi phỏng vấn này không ở chế độ voice');
    }
    if (CLOSED_STATUSES.includes(session.status)) {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}"`,
      );
    }

    // Idempotent replay — client gửi lại do mất kết nối sau khi server đã xử lý xong lượt này
    const existingAnswer = await this.answerRepo.findOne({
      where: { sessionId, questionId: dto.questionId },
    });
    if (existingAnswer) {
      return this.buildReplayResult(session, existingAnswer);
    }

    if (
      session.status !== 'in_progress' ||
      !session.currentQuestion ||
      session.currentQuestion.id !== dto.questionId
    ) {
      throw new BadRequestException(
        'questionId không khớp câu hỏi đang chờ trả lời của buổi phỏng vấn này',
      );
    }

    const pendingQuestion = session.currentQuestion;

    let audioUrl: string | null = null;
    let transcript = '';
    let pauseRatioPercent: number | null = null;
    if (audioFile && audioFile.buffer.length > 0) {
      const key = `interviews/${sessionId}/${pendingQuestion.id}-${Date.now()}.webm`;
      audioUrl = await this.storage.upload(
        key,
        audioFile.buffer,
        audioFile.mimetype || 'audio/webm',
      );
      const transcribed = await this.transcribeAudio(
        audioFile.buffer,
        audioFile.originalname || 'answer.webm',
      );
      transcript = transcribed.text;
      pauseRatioPercent = transcribed.pause_ratio_percent;
    }

    const isEmptyAnswer = !transcript.trim();
    const answeredCountBefore = await this.answerRepo.count({
      where: { sessionId },
    });
    const turnIndex = answeredCountBefore + 1;
    const history = await this.buildHistory(sessionId);
    const application = await this.getApplicationWithJob(session.applicationId);

    const turnResult = await this.agentLogger.track(
      'agent3_interview',
      session.applicationId,
      async () => {
        const { data } = await firstValueFrom(
          this.httpService.post<AiTurnResponse>(
            `${this.getAiServiceUrl()}/api/ai/interview/adaptive/turn`,
            {
              session_id: sessionId,
              parsed_data: this.buildParsedData(application),
              job_requirements: this.buildJobRequirements(application.job),
              turn_index: turnIndex,
              total_questions: TOTAL_QUESTIONS,
              history,
              pending_question: {
                id: pendingQuestion.id,
                question: pendingQuestion.question,
                category: pendingQuestion.category,
                difficulty: pendingQuestion.difficulty,
              },
              pending_answer_text: isEmptyAnswer
                ? NO_ANSWER_PLACEHOLDER
                : transcript,
              cheating_signals: {
                response_latency_ms: dto.responseLatencyMs ?? null,
                tab_blur_count: dto.tabBlurCount ?? null,
                tab_blur_total_ms: dto.tabBlurTotalMs ?? null,
                pause_ratio_percent: pauseRatioPercent,
              },
            },
            { headers: { 'x-internal-secret': this.getInternalSecret() } },
          ),
        );
        if (!data.success || !data.score) {
          throw new Error(
            data.error ?? 'AI service không chấm được câu trả lời',
          );
        }
        return data;
      },
    );

    const score = turnResult.score as AiTurnScore;
    const answerText = isEmptyAnswer ? '' : transcript;
    await this.answerRepo.save(
      this.answerRepo.create({
        sessionId,
        questionId: pendingQuestion.id,
        questionText: pendingQuestion.question,
        category: pendingQuestion.category,
        difficulty: pendingQuestion.difficulty,
        answerText,
        subScores: {
          relevance: score.relevance,
          clarity: score.clarity,
          depth: score.depth,
          correctness: score.correctness,
          authenticity: score.authenticity,
        },
        totalScore: score.total,
        comment: score.comment,
        audioUrl,
        responseLatencyMs: dto.responseLatencyMs ?? null,
        tabBlurCount: dto.tabBlurCount ?? null,
        tabBlurTotalMs: dto.tabBlurTotalMs ?? null,
      }),
    );

    const feedbackAudioBase64 = await this.synthesizeSpeech(score.comment);

    if (turnResult.is_complete || !turnResult.next_question) {
      await this.completeSession(session);
      return {
        score,
        answerText,
        feedbackAudioBase64,
        isComplete: true,
        nextQuestion: null,
      };
    }

    const nextQuestion = turnResult.next_question;
    await this.sessionRepo.update(sessionId, { currentQuestion: nextQuestion });
    const nextQuestionAudioBase64 = await this.synthesizeSpeech(
      nextQuestion.question,
    );

    return {
      score,
      answerText,
      feedbackAudioBase64,
      isComplete: false,
      nextQuestion: {
        questionId: nextQuestion.id,
        questionText: nextQuestion.question,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty,
        questionIndex: turnIndex + 1,
        totalQuestions: TOTAL_QUESTIONS,
        audioBase64: nextQuestionAudioBase64,
      },
    };
  }

  private async buildReplayResult(
    session: InterviewSession,
    existingAnswer: InterviewAnswer,
  ): Promise<VoiceAnswerResultPayload> {
    const feedbackAudioBase64 = await this.synthesizeSpeech(
      existingAnswer.comment ?? '',
    );
    const subScores = existingAnswer.subScores ?? ZERO_VOICE_SUB_SCORES;
    const score: AiTurnScore = {
      relevance: subScores.relevance,
      clarity: subScores.clarity,
      depth: subScores.depth,
      correctness: subScores.correctness,
      authenticity: subScores.authenticity ?? 0,
      total: Number(existingAnswer.totalScore ?? 0),
      comment: existingAnswer.comment ?? '',
    };

    if (session.status === 'completed' || !session.currentQuestion) {
      return {
        score,
        answerText: existingAnswer.answerText,
        feedbackAudioBase64,
        isComplete: true,
        nextQuestion: null,
      };
    }

    const answeredCount = await this.answerRepo.count({
      where: { sessionId: session.id },
    });
    const nextQuestion = await this.buildQuestionPayload(
      session.currentQuestion,
      answeredCount + 1,
    );
    return {
      score,
      answerText: existingAnswer.answerText,
      feedbackAudioBase64,
      isComplete: false,
      nextQuestion,
    };
  }

  /**
   * Ứng viên chủ động kết thúc sớm — các câu chưa trả lời không có row riêng (vì adaptive chỉ
   * biết câu hỏi hiện tại, chưa sinh trước các câu sau) nên không "điền 0đ" như text; thay vào đó
   * calcOverallScore() luôn chia cho TOTAL_QUESTIONS cố định (không phải answers.length), nên
   * phần chưa trả lời tự động kéo điểm trung bình xuống tương đương.
   */
  async endInterview(candidateId: string, sessionId: string): Promise<void> {
    const session = await this.findOwnedSession(candidateId, sessionId);
    if (session.mode !== 'voice') {
      throw new BadRequestException('Buổi phỏng vấn này không ở chế độ voice');
    }
    if (session.status !== 'in_progress') {
      throw new BadRequestException(
        `Buổi phỏng vấn đã ở trạng thái "${session.status}", không thể kết thúc sớm`,
      );
    }
    await this.completeSession(session);
  }

  private async completeSession(session: InterviewSession): Promise<void> {
    const answers = await this.answerRepo.find({
      where: { sessionId: session.id },
    });
    const completedAt = new Date();
    await this.sessionRepo.update(session.id, {
      status: 'completed',
      completedAt,
      currentQuestion: null,
      overallScore: this.calcOverallScore(answers),
      transcript: this.buildTranscript(answers),
      scoringStatus: 'done',
      scoringError: null,
    });
    await this.transitionApplicationToInterviewed(session.applicationId);
  }

  /** Đồng bộ với VALID_TRANSITIONS('matched' → 'interviewed') — xem InterviewScoringProcessor (text) */
  private async transitionApplicationToInterviewed(
    applicationId: string,
  ): Promise<void> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });
    if (!application) return;
    if (!VALID_TRANSITIONS[application.status].includes('interviewed')) return;

    const fromStatus = application.status;
    application.status = 'interviewed';
    await this.appRepo.save(application);

    await this.historyRepo.save(
      this.historyRepo.create({
        applicationId: application.id,
        fromStatus,
        toStatus: 'interviewed',
        changedBy: null,
        metadata: { source: 'agent3_interview_voice' },
      }),
    );

    await this.dashboardCache.invalidate(application.job.recruiterId);
  }

  /**
   * Chia cho TOTAL_QUESTIONS cố định (không phải answers.length) — khi phỏng vấn hoàn tất bình
   * thường 2 giá trị bằng nhau nên không đổi; khi kết thúc sớm (endInterview), các câu chưa trả
   * lời coi như 0đ một cách tự nhiên mà không cần tạo row giả cho câu hỏi chưa từng được sinh ra.
   */
  private calcOverallScore(answers: InterviewAnswer[]): number {
    if (answers.length === 0) return 0;
    const total = answers.reduce(
      (sum, a) => sum + Number(a.totalScore ?? 0),
      0,
    );
    return Math.round((total / TOTAL_QUESTIONS) * 100) / 100;
  }

  private buildTranscript(answers: InterviewAnswer[]): string {
    return answers
      .map(
        (a) =>
          `Q: ${a.questionText}\nA: ${a.answerText && a.answerText.trim() ? a.answerText : '(Không trả lời)'}`,
      )
      .join('\n\n');
  }

  private async buildHistory(
    sessionId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const answers = await this.answerRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
    return answers.map((a) => ({
      category: a.category,
      difficulty: a.difficulty,
      question: a.questionText,
      total: a.totalScore !== null ? Number(a.totalScore) : null,
      comment: a.comment ?? '',
    }));
  }

  private async buildQuestionPayload(
    question: GeneratedQuestionItem,
    questionIndex: number,
  ): Promise<VoiceQuestionPayload> {
    const audioBase64 = await this.synthesizeSpeech(question.question);
    return {
      questionId: question.id,
      questionText: question.question,
      category: question.category,
      difficulty: question.difficulty,
      questionIndex,
      totalQuestions: TOTAL_QUESTIONS,
      audioBase64,
    };
  }

  private async transcribeAudio(
    buffer: Buffer,
    filename: string,
  ): Promise<AiTranscribeResponse> {
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array(buffer)]), filename);
    const { data } = await firstValueFrom(
      this.httpService.post<AiTranscribeResponse>(
        `${this.getAiServiceUrl()}/api/ai/interview/adaptive/transcribe`,
        form,
        { headers: { 'x-internal-secret': this.getInternalSecret() } },
      ),
    );
    return {
      text: data.text ?? '',
      pause_ratio_percent: data.pause_ratio_percent ?? null,
    };
  }

  private async synthesizeSpeech(text: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('text', text);
    const { data } = await firstValueFrom(
      this.httpService.post<ArrayBuffer>(
        `${this.getAiServiceUrl()}/api/ai/interview/adaptive/speak`,
        params,
        {
          headers: {
            'x-internal-secret': this.getInternalSecret(),
            'content-type': 'application/x-www-form-urlencoded',
          },
          responseType: 'arraybuffer',
        },
      ),
    );
    return Buffer.from(data).toString('base64');
  }

  private async getApplicationWithJob(
    applicationId: string,
  ): Promise<Application> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }
    return application;
  }

  private buildParsedData(application: Application): Record<string, unknown> {
    return {
      summary: application.parsedSummary,
      skills: application.parsedSkills ?? [],
      experience: application.parsedExperience ?? [],
      education: application.parsedEducation ?? [],
    };
  }

  private buildJobRequirements(job: JobEntity): string {
    return [
      job.title,
      job.description,
      job.requirements,
      ...(job.requiredSkills ?? []),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private getAiServiceUrl(): string {
    return this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
  }

  private getInternalSecret(): string {
    return this.config.get<string>('AI_SERVICE_INTERNAL_SECRET', '');
  }

  private async findOwnedSession(
    candidateId: string,
    sessionId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['application'],
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy buổi phỏng vấn');
    }
    if (session.application.candidateId !== candidateId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập buổi phỏng vấn này',
      );
    }
    return session;
  }
}
