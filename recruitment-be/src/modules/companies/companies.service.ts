import 'multer';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { Company } from './company.entity';
import { StorageService } from '../storage/storage.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** Ký 10 năm — về mặt thực tế coi như vĩnh viễn, tránh phải tự refresh URL ảnh liên tục */
const IMAGE_SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365 * 10;

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
    private readonly storage: StorageService,
  ) {}

  async getMyCompany(recruiterId: string): Promise<Company | null> {
    return this.repo.findOne({ where: { recruiterId } });
  }

  async upsert(recruiterId: string, dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.repo.findOne({ where: { recruiterId } });
    if (existing) {
      Object.assign(existing, dto);
      return this.repo.save(existing);
    }
    const company = this.repo.create({ ...dto, recruiterId });
    return this.repo.save(company);
  }

  async update(recruiterId: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.repo.findOne({ where: { recruiterId } });
    if (!company) {
      throw new NotFoundException(
        'Chưa có hồ sơ công ty. Tạo mới trước qua PUT /companies/my.',
      );
    }
    Object.assign(company, dto);
    return this.repo.save(company);
  }

  async uploadImage(
    recruiterId: string,
    kind: 'logo' | 'cover',
    file: Express.Multer.File,
  ): Promise<Company> {
    const company = await this.repo.findOne({ where: { recruiterId } });
    if (!company) {
      throw new NotFoundException(
        'Chưa có hồ sơ công ty. Lưu thông tin cơ bản (tên công ty) trước khi tải ảnh.',
      );
    }

    const ext = path.extname(file.originalname);
    const key = `companies/${recruiterId}/${kind}-${Date.now()}${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    const url = await this.storage.getSignedUrl(
      key,
      IMAGE_SIGNED_URL_EXPIRES_IN,
    );

    if (kind === 'logo') company.logoUrl = url;
    else company.coverUrl = url;

    return this.repo.save(company);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }
    return company;
  }

  async findPublished(): Promise<Company[]> {
    return this.repo.find({
      where: { isPublished: true },
      order: { updatedAt: 'DESC' },
    });
  }
}
