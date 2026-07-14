import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient
  private readonly bucket: string

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('SUPABASE_BUCKET', 'recruitment-files')
    this.supabase = createClient(
      config.get<string>('SUPABASE_URL', ''),
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY', ''),
    )
  }

  /** Upload file lên Supabase Storage. Return key (không phải full URL) — lưu key vào DB. */
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, buffer, { contentType: mimeType, upsert: true })

    if (error) {
      throw new Error(error.message)
    }
    return key
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(this.bucket).download(key)

    if (error) {
      throw new Error(error.message)
    }
    return Buffer.from(await data.arrayBuffer())
  }

  /** Tạo signed URL để download file (mặc định hết hạn sau 300 giây). */
  async getSignedUrl(key: string, expiresIn = 300): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresIn)

    if (error) {
      throw new Error(error.message)
    }
    return data.signedUrl
  }

  /** Wrapper cho code cũ truyền vào key đã lưu trong DB, ví dụ applications.cv_url */
  async getPresignedUrlForStoredUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return this.getSignedUrl(key, expiresInSeconds)
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([key])

    if (error) {
      throw new Error(error.message)
    }
  }
}
