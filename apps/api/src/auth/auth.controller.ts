import { Body, ConflictException, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';

export class CredentialsDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) @MaxLength(72) password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: CredentialsDto) {
    const email = dto.email.toLowerCase();
    const taken = new ConflictException('Email đã được đăng ký');
    if (await this.users.existsBy({ email })) throw taken;
    try {
      const user = await this.users.save(this.users.create({ email, passwordHash: await hash(dto.password, 10) }));
      return this.token(user);
    } catch (err) {
      // hai request đăng ký cùng email chạy song song
      if (err instanceof QueryFailedError && (err.driverError as { code?: string }).code === '23505') throw taken;
      throw err;
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: CredentialsDto) {
    const user = await this.users.findOneBy({ email: dto.email.toLowerCase() });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.token(user);
  }

  private token(user: User) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, role: user.role }),
      user: { id: user.id, email: user.email, role: user.role, loyaltyPoints: user.loyaltyPoints },
    };
  }
}
