import { Injectable } from '@nestjs/common';
import type { PaymentMethod } from '../generated/prisma/enums.js';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  /** Demo nhánh lỗi: giả lập thẻ/ví bị từ chối */
  simulateFailure?: boolean;
}

/**
 * Cổng thanh toán mô phỏng (Task 8 – "Mock payment").
 * Tách thành service riêng để sau này thay bằng cổng thật (VNPay, MoMo…) mà không sửa PaymentsService.
 */
@Injectable()
export class MockPaymentGateway {
  charge(req: ChargeRequest): Promise<{ success: boolean }> {
    return Promise.resolve({ success: !req.simulateFailure && req.amount > 0 });
  }
}
