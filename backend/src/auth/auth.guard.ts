import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '../generated/prisma/enums.js';

/** Thông tin người dùng lấy từ JWT. */
export interface AuthUser {
  sub: number;
  email: string;
  role: UserRole;
}

/** Chặn route khi không có JWT hợp lệ (header Authorization: Bearer <token>) – Task 7. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Vui lòng đăng nhập');
    try {
      req.user = this.jwt.verify<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
    }
  }
}

/** Lấy user đã đăng nhập trong controller: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
