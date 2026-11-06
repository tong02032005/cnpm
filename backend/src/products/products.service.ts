import { Injectable, NotFoundException } from '@nestjs/common';
import type { products as ProductRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SIZES } from '../orders/pricing.js';
import { cupsLeft } from '../stocks/stock.js';

/** Dữ liệu một món trả về cho frontend (Task 2 – US-02). */
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  /** Số ly size M (không topping) còn pha được từ kho nguyên liệu; null = món chưa có công thức. */
  stock: number | null;
}

/** Công thức size M dùng để báo "còn bao nhiêu ly" trên menu. */
const MENU_SIZE = 'M';

const toProduct = (p: ProductRow, stock: number | null): Product => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  price: p.price,
  imageUrl: p.image_url ?? '',
  category: p.category ?? '',
  stock,
});

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Menu: chỉ các món đang bán, theo thứ tự id. */
  async findAll(): Promise<Product[]> {
    const rows = await this.prisma.products.findMany({ where: { is_available: true }, orderBy: { id: 'asc' } });
    const left = await this.cupsLeft(rows.map((r) => r.id));
    return rows.map((r) => toProduct(r, left.get(r.id) ?? null));
  }

  /** Chi tiết một món kèm bảng size và topping để chọn (Task 4); không có → 404. */
  async findOne(id: number) {
    const row = await this.prisma.products.findFirst({ where: { id, is_available: true } });
    if (!row) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    const toppings = await this.prisma.toppings.findMany({ orderBy: { id: 'asc' } });
    return {
      ...toProduct(row, (await this.cupsLeft([row.id])).get(row.id) ?? null),
      sizes: Object.entries(SIZES).map(([size, extra]) => ({ size, extra })),
      toppings,
    };
  }

  private async cupsLeft(productIds: number[]) {
    const recipes = await this.prisma.recipes.findMany({
      where: { product_id: { in: productIds }, size: MENU_SIZE },
      include: { stock: true },
    });
    const available = new Map(recipes.map((r) => [r.stock_id, r.stock.quantity - r.stock.reserved]));
    return new Map(productIds.map((id) => [id, cupsLeft(recipes.filter((r) => r.product_id === id), available)]));
  }
}
