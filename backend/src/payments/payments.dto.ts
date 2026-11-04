import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../generated/prisma/enums.js';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsEnum(PaymentMethod, { message: 'Phương thức phải là WALLET (ví) hoặc CARD (thẻ)' })
  method: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
