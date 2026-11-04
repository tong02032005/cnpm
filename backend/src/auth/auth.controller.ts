import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { AuthGuard, CurrentUser, type AuthUser } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register – tạo tài khoản, trả JWT. Email trùng → 409. */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /** POST /auth/login – đúng thông tin → JWT; sai → 401. */
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** GET /auth/me – thông tin tài khoản + điểm thưởng. */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }
}
