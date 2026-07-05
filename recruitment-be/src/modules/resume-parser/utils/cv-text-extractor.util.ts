import * as path from 'path'
import { PDFParse } from 'pdf-parse'
import * as mammoth from 'mammoth'

/** Trích xuất text thô từ file CV (PDF hoặc DOCX) để gửi sang AI service */
export async function extractCvText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = path.extname(fileName).toLowerCase()

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return result.text.trim()
    } finally {
      await parser.destroy()
    }
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  throw new Error(`Định dạng file không được hỗ trợ để trích xuất text: ${ext}`)
}
