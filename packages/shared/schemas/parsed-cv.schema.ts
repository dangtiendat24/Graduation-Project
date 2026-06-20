import { z } from 'zod';

// Zod schema cho candidate_profiles.parsed_data (output của Agent 1)
// Validate bắt buộc trước khi INSERT vào DB

const ExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  duration: z.string().min(1), // VD "2022/01 - 2024/06"
  description: z.string().default(''),
});

const EducationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  major: z.string().min(1),
  year: z.string().min(1),
});

export const ParsedCvSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  summary: z.string().default(''),
  skills: z.array(z.string()).min(0).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
});

export type ParsedCv = z.infer<typeof ParsedCvSchema>;

// Schema cho matching_results.criteria
export const MatchingCriteriaSchema = z.object({
  skills: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  education: z.number().min(0).max(100),
});
export type MatchingCriteria = z.infer<typeof MatchingCriteriaSchema>;

// Schema cho schedules.suggested_slots
export const ScheduleSlotSchema = z.object({
  start_time: z.string().datetime({ offset: true }),
  end_time: z.string().datetime({ offset: true }),
});
export const SuggestedSlotsSchema = z.array(ScheduleSlotSchema).min(3).max(5);
export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

// Schema cho interview_sessions.questions
export const InterviewQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  category: z.enum(['technical', 'behavioral', 'situational']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

// Schema cho interview_sessions.answers
export const InterviewAnswerSchema = z.object({
  question_id: z.string().min(1),
  answer_text: z.string().default(''),
  audio_url: z.string().url().optional().nullable(),
  scores: z.object({
    relevance: z.number().min(0).max(25),
    clarity: z.number().min(0).max(25),
    depth: z.number().min(0).max(25),
    correctness: z.number().min(0).max(25),
  }),
  total: z.number().min(0).max(100),
  answered_at: z.string().datetime({ offset: true }),
});
export type InterviewAnswer = z.infer<typeof InterviewAnswerSchema>;
