import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../generated/prisma/enums.js';
import { SIZES, type Size } from './pricing.js';

export class OrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @Min(1)
  productId: number;

  @IsIn(Object.keys(SIZES), { message: 'Size phải là S, M hoặc L' })
  size: Size;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(20, { message: 'Tối đa 20 ly mỗi món' })
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  toppingIds?: number[];
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái không hợp lệ' })
  status: OrderStatus;
}
