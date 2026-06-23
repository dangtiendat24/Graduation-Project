import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Company } from './company.entity'
import { CreateCompanyDto } from './dto/create-company.dto'
import { UpdateCompanyDto } from './dto/update-company.dto'

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async getMyCompany(recruiterId: string): Promise<Company | null> {
    return this.repo.findOne({ where: { recruiterId } })
  }

  async upsert(recruiterId: string, dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.repo.findOne({ where: { recruiterId } })
    if (existing) {
      Object.assign(existing, dto)
      return this.repo.save(existing)
    }
    const company = this.repo.create({ ...dto, recruiterId })
    return this.repo.save(company)
  }

  async update(recruiterId: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.repo.findOne({ where: { recruiterId } })
    if (!company) {
      throw new NotFoundException('Chưa có hồ sơ công ty. Tạo mới trước qua PUT /companies/my.')
    }
    Object.assign(company, dto)
    return this.repo.save(company)
  }

  async findById(id: string): Promise<Company> {
    const company = await this.repo.findOne({ where: { id } })
    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty')
    }
    return company
  }

  async findPublished(): Promise<Company[]> {
    return this.repo.find({
      where: { isPublished: true },
      order: { updatedAt: 'DESC' },
    })
  }
}
