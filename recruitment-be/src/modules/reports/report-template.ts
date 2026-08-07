import { Application } from '../applications/application.entity';
import { Job } from '../jobs/job.entity';
import { Company } from '../companies/company.entity';
import {
  MatchingResult,
  MatchRecommendation,
} from '../applications/matching-result.entity';
import { InterviewSession } from '../applications/interview-session.entity';
import { InterviewAnswer } from '../applications/interview-answer.entity';
import { ApplicationStatusHistory } from '../applications/application-status-history.entity';

export interface ReportData {
  application: Application;
  job: Job;
  company: Company | null;
  matchingResult: MatchingResult;
  session: InterviewSession | null;
  answers: InterviewAnswer[];
  history: ApplicationStatusHistory[];
}

const RECOMMENDATION_LABELS: Record<MatchRecommendation, string> = {
  strong_match: 'Rất phù hợp',
  good_match: 'Phù hợp',
  partial_match: 'Phù hợp một phần',
  poor_match: 'Không phù hợp',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  matched: 'Đã chấm điểm CV',
  interviewed: 'Đã mời phỏng vấn',
  schedule_sent: 'Đã gửi lịch phỏng vấn',
  scheduled: 'Đã xác nhận lịch',
  completed: 'Hoàn tất phỏng vấn',
  hired: 'Trúng tuyển',
  rejected: 'Từ chối',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Radar chart tĩnh (SVG, dựng server-side) cho 3 trục skillBreakdown: keyword / TF-IDF / semantic, thang 0-100 */
function buildRadarSvg(axes: { label: string; value: number }[]): string {
  const size = 220;
  const center = size / 2;
  const radius = 80;
  const angleStep = (2 * Math.PI) / axes.length;
  const startAngle = -Math.PI / 2;

  const pointFor = (index: number, ratio: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  };

  const gridRings = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const points = axes
      .map((_, i) => pointFor(i, ratio))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    return `<polygon points="${points}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
  });

  const axisLines = axes.map((_, i) => {
    const p = pointFor(i, 1);
    return `<line x1="${center}" y1="${center}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />`;
  });

  const dataPoints = axes.map((axis, i) =>
    pointFor(i, Math.min(axis.value, 100) / 100),
  );
  const dataPolygon = dataPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const labels = axes.map((axis, i) => {
    const p = pointFor(i, 1.28);
    const anchor =
      Math.abs(p.x - center) < 5 ? 'middle' : p.x > center ? 'start' : 'end';
    return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-size="11" fill="#334155" text-anchor="${anchor}" dominant-baseline="middle">${escapeHtml(axis.label)} (${axis.value.toFixed(0)})</text>`;
  });

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${gridRings.join('')}
      ${axisLines.join('')}
      <polygon points="${dataPolygon}" fill="rgba(37, 99, 235, 0.25)" stroke="#2563eb" stroke-width="2" />
      ${labels.join('')}
    </svg>
  `;
}

function buildTimelineSection(history: ApplicationStatusHistory[]): string {
  if (history.length === 0) {
    return '<p class="muted">Chưa có lịch sử thay đổi trạng thái.</p>';
  }
  const items = history
    .map(
      (h) => `
        <li>
          <span class="timeline-date">${formatDate(h.changedAt)}</span>
          <span class="timeline-status">${escapeHtml(STATUS_LABELS[h.toStatus] ?? h.toStatus)}</span>
        </li>`,
    )
    .join('');
  return `<ul class="timeline">${items}</ul>`;
}

function buildTranscriptSection(
  session: InterviewSession | null,
  answers: InterviewAnswer[],
): string {
  if (!session || answers.length === 0) {
    return '<p class="muted">Chưa có dữ liệu phỏng vấn</p>';
  }

  const rows = answers
    .map(
      (a) => `
        <div class="qa">
          <p class="question">${escapeHtml(a.questionText)}</p>
          <p class="answer">${escapeHtml(a.answerText)}</p>
          ${
            a.totalScore !== null
              ? `<p class="score">Điểm: ${Number(a.totalScore).toFixed(1)}/100${a.comment ? ` — ${escapeHtml(a.comment)}` : ''}</p>`
              : ''
          }
        </div>`,
    )
    .join('');

  const overall =
    session.overallScore !== null
      ? `<p class="overall-interview-score">Điểm phỏng vấn tổng thể: <strong>${Number(session.overallScore).toFixed(1)}/100</strong></p>`
      : '';

  return `${overall}${rows}`;
}

export function buildReportHtml(data: ReportData): string {
  const {
    application,
    job,
    company,
    matchingResult,
    session,
    answers,
    history,
  } = data;
  const criteria = matchingResult.criteria;
  const skillBreakdown = criteria.skillBreakdown;

  const radarSvg = skillBreakdown
    ? buildRadarSvg([
        { label: 'Keyword', value: skillBreakdown.keyword },
        { label: 'TF-IDF', value: skillBreakdown.tfidf },
        { label: 'Semantic', value: skillBreakdown.semantic },
      ])
    : '<p class="muted">Chưa có dữ liệu chi tiết kỹ năng (skill breakdown)</p>';

  return `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; font-size: 13px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .muted { color: #64748b; font-style: italic; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
          .subtitle { color: #64748b; margin: 0; }
          .score-row { display: flex; align-items: center; gap: 24px; }
          .score-badge { font-size: 32px; font-weight: 700; color: #2563eb; }
          .recommendation { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-weight: 600; }
          .criteria-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .criteria-table td { padding: 4px 0; }
          .criteria-table td:last-child { text-align: right; font-weight: 600; }
          .charts { display: flex; gap: 24px; align-items: center; }
          .timeline { list-style: none; margin: 0; padding: 0; }
          .timeline li { display: flex; gap: 12px; padding: 4px 0; border-left: 2px solid #e2e8f0; padding-left: 12px; }
          .timeline-date { color: #64748b; min-width: 150px; }
          .timeline-status { font-weight: 600; }
          .qa { margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
          .question { font-weight: 600; margin: 0 0 4px; }
          .answer { margin: 0 0 4px; white-space: pre-wrap; }
          .score { margin: 0; color: #2563eb; font-size: 12px; }
          .overall-interview-score { font-size: 14px; }
          .explanation { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${escapeHtml(application.candidate.fullName)}</h1>
            <p class="subtitle">${escapeHtml(job.title)}${company ? ` — ${escapeHtml(company.name)}` : ''}</p>
          </div>
          <div class="subtitle">Xuất báo cáo: ${formatDate(new Date())}</div>
        </div>

        <h2>Điểm phù hợp tổng thể</h2>
        <div class="score-row">
          <div class="score-badge">${Number(matchingResult.overallScore).toFixed(1)}</div>
          <div>
            <span class="recommendation">${RECOMMENDATION_LABELS[matchingResult.recommendation]}</span>
            <table class="criteria-table">
              <tr><td>Kỹ năng</td><td>${criteria.skills.toFixed(1)}</td></tr>
              <tr><td>Kinh nghiệm</td><td>${criteria.experience.toFixed(1)}</td></tr>
              <tr><td>Học vấn</td><td>${criteria.education.toFixed(1)}</td></tr>
            </table>
          </div>
        </div>

        <h2>Phân tích chi tiết kỹ năng</h2>
        <div class="charts">${radarSvg}</div>

        ${
          matchingResult.explanation
            ? `<h2>Nhận xét / đề xuất</h2><p class="explanation">${escapeHtml(matchingResult.explanation)}</p>`
            : ''
        }

        <h2>Lịch sử trạng thái</h2>
        ${buildTimelineSection(history)}

        <h2>Transcript phỏng vấn AI</h2>
        ${buildTranscriptSection(session, answers)}
      </body>
    </html>
  `;
}
