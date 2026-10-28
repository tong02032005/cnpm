import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { User } from './user.entity';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @Get('me')
  async me(@CurrentUser() auth: AuthUser) {
    const { id, email, role, loyaltyPoints } = await this.users.findOneByOrFail({ id: auth.sub });
    return { id, email, role, loyaltyPoints };
  }
}
