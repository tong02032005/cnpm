import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { dataSourceOptions } from './data-source';
import { entities } from './entities';
import { HealthController } from './health.controller';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { PaymentsController } from './payments/payments.controller';
import { MockPaymentGateway, PaymentsService } from './payments/payments.service';
import { ProductsController } from './products/products.controller';
import { PromotionsController } from './promotions/promotions.controller';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature(entities),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET chưa được cấu hình');
        return { secret: process.env.JWT_SECRET, signOptions: { expiresIn: '7d' } };
      },
    }),
  ],
  controllers: [
    HealthController,
    ProductsController,
    AuthController,
    UsersController,
    PromotionsController,
    OrdersController,
    PaymentsController,
  ],
  providers: [OrdersService, PaymentsService, MockPaymentGateway],
})
export class AppModule {}

export function configureApp(app: INestApplication) {
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}
