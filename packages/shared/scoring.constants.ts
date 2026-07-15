// =============================================================
// Single source of truth cho scoring thresholds, weights, enums
// Dùng chung cho NestJS BE. AI service dùng bản Python tương đương.
// =============================================================

// ── Status Enums ──────────────────────────────────────────────

export const APPLICATION_STATUSES = [
  'pending',
  'matched',
  'interviewed',
  'schedule_sent',
  'scheduled',
  'completed',
  'hired',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const USER_ROLES = ['recruiter', 'candidate'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const JOB_STATUSES = ['draft', 'active', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const INTERVIEW_MODES = ['text', 'voice'] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'timeout',
  'cancelled',
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const SCHEDULE_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const EMAIL_STATUSES = ['pending', 'sent', 'failed'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const MATCH_RECOMMENDATIONS = [
  'strong_match',
  'good_match',
  'partial_match',
  'poor_match',
] as const;
export type MatchRecommendation = (typeof MATCH_RECOMMENDATIONS)[number];

export const REPORT_RECOMMENDATIONS = ['pass', 'fail', 'review'] as const;
export type ReportRecommendation = (typeof REPORT_RECOMMENDATIONS)[number];

// ── Matching ──────────────────────────────────────────────────

/** Trọng số tính overall_score (per M1, đã bỏ salary) */
export const MATCHING_WEIGHTS = {
  skills: 0.45,
  experience: 0.35,
  education: 0.20,
} as const;

/** overall_score = skills×0.45 + experience×0.35 + education×0.20 */
export function calcMatchingScore(criteria: {
  skills: number;
  experience: number;
  education: number;
}): number {
  return (
    criteria.skills * MATCHING_WEIGHTS.skills +
    criteria.experience * MATCHING_WEIGHTS.experience +
    criteria.education * MATCHING_WEIGHTS.education
  );
}

/** Ngưỡng auto-reject: score < 30 → reject ngay, không qua phỏng vấn */
export const AUTO_REJECT_THRESHOLD = 30;

/** Band classification cho matching score */
export const MATCH_BANDS: Record<MatchRecommendation, number> = {
  strong_match: 80,  // >= 80
  good_match: 60,    // 60-79
  partial_match: 40, // 40-59
  poor_match: 0,     // < 40
};

export function getMatchRecommendation(score: number): MatchRecommendation {
  if (score >= MATCH_BANDS.strong_match) return 'strong_match';
  if (score >= MATCH_BANDS.good_match) return 'good_match';
  if (score >= MATCH_BANDS.partial_match) return 'partial_match';
  return 'poor_match';
}

// ── Interview ─────────────────────────────────────────────────

/**
 * Điểm mỗi câu trả lời = relevance + clarity + depth + correctness
 * overall_score = AVG(answers[*].total)  — KHÔNG chia 4, KHÔNG nhân 100
 * Regression check: {22, 20, 18, 23} → total=83, AVG(83)=83
 */
export const INTERVIEW_SCORE_COMPONENTS = [
  'relevance',
  'clarity',
  'depth',
  'correctness',
] as const;
export type InterviewScoreComponent = (typeof INTERVIEW_SCORE_COMPONENTS)[number];

// ── Report ────────────────────────────────────────────────────

export const REPORT_BANDS: Record<ReportRecommendation, number> = {
  pass: 70,    // >= 70
  review: 40,  // 40-69
  fail: 0,     // < 40
};

export function getReportRecommendation(score: number): ReportRecommendation {
  if (score >= REPORT_BANDS.pass) return 'pass';
  if (score >= REPORT_BANDS.review) return 'review';
  return 'fail';
}

// ── BullMQ Queue Names ────────────────────────────────────────

export const QUEUE_NAMES = {
  RESUME_PARSE: 'resume-parse',
  APPLICATION_CV_PARSE: 'application-cv-parse',
  CV_MATCHING: 'cv-matching',
  INTERVIEW: 'interview',
  SCHEDULING: 'scheduling',
  REPORT: 'report',
  EMAIL: 'send-schedule-email',
  JOB_EMBED: 'job-embed',
} as const;

// ── Application State Machine ─────────────────────────────────

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending:       ['matched', 'rejected'],
  matched:       ['interviewed', 'rejected'],
  interviewed:   ['schedule_sent', 'rejected'],
  schedule_sent: ['scheduled'],
  scheduled:     ['completed'],
  completed:     ['hired', 'rejected'],
  hired:         [],
  rejected:      [],
};
