export interface ExplanationSection {
  key: 'skills' | 'experience' | 'education'
  title: string
  text: string
}

/** Khớp đúng format AI trả về: 'Kỹ năng (skills_score): ...', 'Kinh nghiệm (experience_score): ...', 'Học vấn (education_score): ...' */
const SECTION_PATTERNS: { key: ExplanationSection['key']; title: string; pattern: RegExp }[] = [
  { key: 'skills', title: 'Kỹ năng', pattern: /Kỹ năng\s*\(skills_score\)\s*:\s*/i },
  { key: 'experience', title: 'Kinh nghiệm', pattern: /Kinh nghiệm\s*\(experience_score\)\s*:\s*/i },
  { key: 'education', title: 'Học vấn', pattern: /Học vấn\s*\(education_score\)\s*:\s*/i },
]

/** Tách giải thích AI thành từng phần theo tiêu chí — trả về [] nếu không khớp format (fallback hiển thị nguyên văn) */
export function parseMatchExplanation(explanation: string): ExplanationSection[] {
  if (!explanation) return []

  const found = SECTION_PATTERNS.map(({ key, title, pattern }) => {
    const m = pattern.exec(explanation)
    return m ? { key, title, start: m.index, end: m.index + m[0].length } : null
  })
    .filter((x): x is { key: ExplanationSection['key']; title: string; start: number; end: number } => x !== null)
    .sort((a, b) => a.start - b.start)

  if (found.length === 0) return []

  return found
    .map((section, i) => ({
      key: section.key,
      title: section.title,
      text: explanation.slice(section.end, i + 1 < found.length ? found[i + 1].start : explanation.length).trim(),
    }))
    .filter((s) => s.text.length > 0)
}
