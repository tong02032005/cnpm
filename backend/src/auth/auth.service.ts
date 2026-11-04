import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { isUniqueViolation } from '../common/prisma-errors.js';
import type { users } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import type { AuthUser } from './auth.guard.js';

/** Không bao giờ trả password_hash ra ngoài. */
const publicUser = (u: users) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  loyaltyPoints: u.loyalty_points,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const user = await this.prisma.users.create({
        data: {
          full_name: dto.fullName.trim(),
          email: dto.email.toLowerCase(),
          password_hash: await bcrypt.hash(dto.password, 10),
        },
      });
      return this.session(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Email đã được đăng ký');
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email.toLowerCase() } });
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký
    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.session(user);
  }

  async me(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');
    return publicUser(user);
  }

  private session(user: users) {
    const payload: AuthUser = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: publicUser(user) };
  }
}
