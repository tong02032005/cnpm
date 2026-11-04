import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';
import { promotionDiscount } from '../orders/pricing.js';
import { PrismaService } from '../prisma/prisma.service.js';

class ValidatePromoDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsInt()
  @Min(0)
  subtotal: number;
}

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /promotions/validate – xem trước số tiền giảm ở trang thanh toán (Task 10d). */
  @Post('validate')
  @HttpCode(200)
  async validate(@Body() dto: ValidatePromoDto) {
    const code = dto.code.trim().toUpperCase();
    const promo = await this.prisma.promotions.findUnique({ where: { code } });
    if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại');
    const result = promotionDiscount(promo, dto.subtotal);
    if ('error' in result) throw new BadRequestException(result.error);
    return { code, discount: result.discount };
  }
}
