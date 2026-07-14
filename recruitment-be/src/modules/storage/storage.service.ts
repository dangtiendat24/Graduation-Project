import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class StorageService {
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly publicPrefix: string

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('CF_ACCOUNT_ID', '')
    this.bucket = config.get<string>('R2_BUCKET', 'smart-recruitment-files')
    this.publicPrefix = `https://${accountId}.r2.cloudflarestorage.com/${this.bucket}/`
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    })
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      )
      return `${this.publicPrefix}${key}`
    } catch (err) {
      throw new InternalServerErrorException(
        `Không thể upload file lên R2: ${(err as Error).message}`,
      )
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      const stream = res.Body as AsyncIterable<Buffer | Uint8Array>
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    } catch (err) {
      throw new InternalServerErrorException(
        `Không thể tải file từ R2: ${(err as Error).message}`,
      )
    }
  }

  /** Ký presigned URL (GET) cho một URL public đã lưu trong DB, ví dụ applications.cv_url */
  async getPresignedUrlForStoredUrl(storedUrl: string, expiresInSeconds = 300): Promise<string> {
    const key = storedUrl.startsWith(this.publicPrefix)
      ? storedUrl.slice(this.publicPrefix.length)
      : storedUrl

    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
      return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
    } catch (err) {
      throw new InternalServerErrorException(
        `Không thể tạo presigned URL cho file: ${(err as Error).message}`,
      )
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch {
      // ignore delete errors (file may already be gone)
    }
  }
}
