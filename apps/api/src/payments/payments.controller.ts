import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { PaymentMethod } from './payment.entity';
import { PaymentsService } from './payments.service';

export class PayRequestDto {
  @IsInt() orderId: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @IsBoolean() simulateFailure?: boolean;
}

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  pay(
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: PayRequestDto,
  ) {
    return this.payments.pay(user, key, dto);
  }
}
