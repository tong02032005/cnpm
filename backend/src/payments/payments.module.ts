import { Module } from '@nestjs/common';
import { MockPaymentGateway } from './mock-gateway.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({ controllers: [PaymentsController], providers: [PaymentsService, MockPaymentGateway] })
export class PaymentsModule {}
