import { Injectable, NotFoundException } from '@nestjs/common';
import type { products as ProductRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SIZES } from '../orders/pricing.js';

/** Dữ liệu một món trả về cho frontend (Task 2 – US-02). */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

const toProduct = (p: ProductRow): Product => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  price: p.price,
  imageUrl: p.image_url ?? '',
  category: p.category ?? '',
  stock: p.stock,
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Menu: chỉ các món đang bán, theo thứ tự id. */
  async findAll(): Promise<Product[]> {
    const rows = await this.prisma.products.findMany({ where: { is_available: true }, orderBy: { id: 'asc' } });
    return rows.map(toProduct);
  }

  /** Chi tiết một món kèm bảng size và topping để chọn (Task 4); không có → 404. */
  async findOne(id: number) {
    const row = await this.prisma.products.findFirst({ where: { id, is_available: true } });
    if (!row) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    const toppings = await this.prisma.toppings.findMany({ orderBy: { id: 'asc' } });
    return {
      ...toProduct(row),
      sizes: Object.entries(SIZES).map(([size, extra]) => ({ size, extra })),
      toppings,
    };
  }
}
