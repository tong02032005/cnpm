import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { PromotionsController } from './promotions/promotions.controller.js';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, OrdersModule, PaymentsModule],
  controllers: [AppController, HealthController, PromotionsController],
  providers: [AppService],
})
export class AppModule {}
