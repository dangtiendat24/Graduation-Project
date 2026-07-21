/** Tách summary AI thành từng dòng — hỗ trợ cả format bullet mới (\n) lẫn đoạn văn cũ (1 dòng) */
export function splitSummaryLines(summary: string): string[] {
  return summary
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
}
