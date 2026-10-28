import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { promotionDiscount } from '../orders/pricing';
import { Promotion } from './promotion.entity';

export class ValidatePromotionDto {
  @IsString() code: string;
  @IsInt() @Min(0) subtotal: number;
}

export async function findPromotion(m: EntityManager, code: string): Promise<Promotion> {
  const promo = await m.findOneBy(Promotion, { code: code.trim().toUpperCase() });
  if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại');
  return promo;
}

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly ds: DataSource) {}

  // Cho frontend xem trước số tiền giảm; khi tạo đơn backend kiểm tra lại.
  @Post('validate')
  @HttpCode(200)
  async validate(@Body() dto: ValidatePromotionDto) {
    const promo = await findPromotion(this.ds.manager, dto.code);
    return { code: promo.code, discount: promotionDiscount(promo, dto.subtotal) };
  }
}
