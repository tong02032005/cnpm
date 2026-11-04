import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard.js';
import { CreatePaymentDto } from './payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** POST /payments – thanh toán Ví/Thẻ (mô phỏng). Bắt buộc header Idempotency-Key. */
  @Post()
  pay(@CurrentUser() user: AuthUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: CreatePaymentDto) {
    return this.payments.pay(user, key, dto);
  }
}
