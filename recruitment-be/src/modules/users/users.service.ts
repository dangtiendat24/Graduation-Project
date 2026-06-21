import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } })
  }

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } })
  }

  create(data: Partial<User>) {
    return this.usersRepo.save(this.usersRepo.create(data))
  }

  async setVerifyToken(userId: string, token: string, expires: Date) {
    await this.usersRepo.update(userId, {
      emailVerifyToken: token,
      emailVerifyExpires: expires,
    })
  }

  async activateByToken(token: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({ where: { emailVerifyToken: token } })
    if (!user || !user.emailVerifyExpires) return null
    if (user.emailVerifyExpires < new Date()) return null

    await this.usersRepo.update(user.id, {
      isActive: true,
      emailVerifyToken: null,
      emailVerifyExpires: null,
    })
    return user
  }
}
