// Kho nguyên liệu (Task 10c): giữ chỗ khi tạo đơn → trừ thật khi đơn COMPLETED → trả chỗ khi đơn CANCELLED.
import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

export interface StockUse {
  stock_id: number;
  quantity: number;
}

export interface RecipeRow {
  product_id: number | null;
  topping_id: number | null;
  size: string | null;
  stock_id: number;
  quantity: number;
}

export interface UsageLine {
  product_id: number;
  size: string;
  quantity: number;
  toppingIds: number[];
}

/**
 * Tổng nguyên liệu cần cho các dòng đơn, cộng dồn theo stock_id, sắp xếp theo stock_id
 * (giữ chỗ theo thứ tự cố định để hai đơn song song không deadlock). Hàm thuần, có unit test.
 */
export function stockUsage(lines: UsageLine[], recipes: RecipeRow[]): StockUse[] {
  const need = new Map<number, number>();
  const add = (stockId: number, qty: number) => need.set(stockId, (need.get(stockId) ?? 0) + qty);
  for (const line of lines) {
    for (const r of recipes) {
      if (r.product_id === line.product_id && r.size === line.size) add(r.stock_id, r.quantity * line.quantity);
      if (r.topping_id !== null && line.toppingIds.includes(r.topping_id)) add(r.stock_id, r.quantity * line.quantity);
    }
  }
  return [...need].sort(([a], [b]) => a - b).map(([stock_id, quantity]) => ({ stock_id, quantity }));
}

/**
 * Số ly còn pha được (theo công thức một size), hoặc null nếu món chưa có công thức (không giới hạn).
 * `available` = quantity - reserved của từng nguyên liệu.
 */
export function cupsLeft(recipe: { stock_id: number; quantity: number }[], available: Map<number, number>): number | null {
  if (recipe.length === 0) return null;
  return Math.max(0, Math.min(...recipe.map((r) => Math.floor((available.get(r.stock_id) ?? 0) / r.quantity))));
}

/**
 * Giữ chỗ nguyên liệu. Điều kiện nằm trong câu UPDATE nên hai đơn cùng lúc không thể cùng lấy phần cuối
 * (Task 10c). Thiếu một nguyên liệu → 409, transaction tạo đơn rollback toàn bộ.
 */
export async function reserveStock(tx: Tx, usage: StockUse[]) {
  for (const u of usage) {
    const updated = await tx.$executeRaw`
      UPDATE stocks SET reserved = reserved + ${u.quantity}, updated_at = now()
      WHERE id = ${u.stock_id} AND quantity - reserved >= ${u.quantity}`;
    if (updated !== 1) {
      const s = await tx.stocks.findUnique({ where: { id: u.stock_id } });
      throw new ConflictException(`Không đủ nguyên liệu: ${s?.name ?? u.stock_id}. Vui lòng chọn món khác.`);
    }
  }
}

/** Đơn COMPLETED: trừ thật khỏi kho và bỏ phần đã giữ. */
export async function consumeStock(tx: Tx, usage: StockUse[]) {
  for (const u of usage) {
    await tx.$executeRaw`
      UPDATE stocks SET quantity = quantity - ${u.quantity}, reserved = reserved - ${u.quantity}, updated_at = now()
      WHERE id = ${u.stock_id}`;
  }
}

/** Đơn CANCELLED: trả lại phần đã giữ, kho thật không đổi. */
export async function releaseStock(tx: Tx, usage: StockUse[]) {
  for (const u of usage) {
    await tx.$executeRaw`
      UPDATE stocks SET reserved = reserved - ${u.quantity}, updated_at = now() WHERE id = ${u.stock_id}`;
  }
}
