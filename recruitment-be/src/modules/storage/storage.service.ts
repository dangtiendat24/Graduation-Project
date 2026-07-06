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
  private readonly region: string

  constructor(private readonly config: ConfigService) {
    this.region = config.get<string>('AWS_REGION', 'ap-southeast-1')
    this.bucket = config.get<string>('AWS_S3_BUCKET', 'smart-recruitment-files')
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
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
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
    } catch (err) {
      throw new InternalServerErrorException(
        `Không thể upload file lên S3: ${(err as Error).message}`,
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
        `Không thể tải file từ S3: ${(err as Error).message}`,
      )
    }
  }

  /** Ký presigned URL (GET) cho một URL public đã lưu trong DB, ví dụ applications.cv_url */
  async getPresignedUrlForStoredUrl(storedUrl: string, expiresInSeconds = 300): Promise<string> {
    const publicPrefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`
    const key = storedUrl.startsWith(publicPrefix) ? storedUrl.slice(publicPrefix.length) : storedUrl

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
