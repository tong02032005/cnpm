import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Size } from '../products/product.entity';
import { OrderStatus } from './order.entity';

export class OrderItemDto {
  @IsInt() productId: number;
  @IsEnum(Size) size: Size;
  @IsInt() @Min(1) @Max(20) qty: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) toppingIds?: number[];
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng trống' })
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional() @IsString() promoCode?: string;
}

export class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}
