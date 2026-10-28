import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User } from '../users/user.entity';

export interface AuthUser {
  sub: number;
  role: Role;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Cần đăng nhập');
    let sub: number;
    try {
      sub = this.jwt.verify<AuthUser>(token).sub;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    // Đọc vai trò từ DB thay vì tin token: tài khoản bị xóa hoặc đổi quyền có hiệu lực ngay.
    const user = await this.users.findOne({ where: { id: sub }, select: { id: true, role: true } });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    req.user = { sub: user.id, role: user.role } satisfies AuthUser;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
