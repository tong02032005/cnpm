// Dữ liệu mẫu (Task 2.1). Chạy: npm run db:seed  (đã có sản phẩm thì bỏ qua – chạy lại nhiều lần vẫn an toàn)
// Trong Docker: node dist/seed.js (tự chạy khi container backend khởi động).
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

// Tên, mô tả, giá giống bản backup của nhánh Loc. Ảnh nằm ở frontend/public/products/.
const PRODUCTS = [
  ['ca-phe-den', 'Cà phê đen', 'Cà phê đen đậm vị, thơm ngon', 20000, 'Cà phê'],
  ['ca-phe-sua', 'Cà phê sữa', 'Cà phê kết hợp với sữa đặc', 25000, 'Cà phê'],
  ['bac-xiu', 'Bạc xỉu', 'Sữa nhiều, cà phê nhẹ', 28000, 'Cà phê'],
  ['latte', 'Latte', 'Espresso kết hợp với sữa tươi', 35000, 'Cà phê'],
  ['tra-sua', 'Trà sữa trân châu', 'Trà sữa béo thơm kèm trân châu', 30000, 'Trà sữa'],
  ['tra-dao', 'Trà đào', 'Trà đào thanh mát', 30000, 'Trà'],
  ['matcha-latte', 'Matcha Latte', 'Matcha kết hợp với sữa tươi', 35000, 'Matcha'],
  ['chocolate-da', 'Chocolate đá', 'Chocolate đậm vị, uống cùng đá mát', 32000, 'Chocolate'],
] as const;

// Kho nguyên liệu: [tên, đơn vị, số lượng ban đầu, ngưỡng báo sắp hết]
const STOCKS = [
  ['Cà phê hạt', 'g', 2000, 200],
  ['Sữa đặc', 'ml', 3000, 300],
  ['Sữa tươi', 'ml', 10000, 1000],
  ['Trà đen', 'g', 1000, 100],
  ['Siro đào', 'ml', 2000, 200],
  ['Bột matcha', 'g', 500, 50],
  ['Bột cacao', 'g', 1000, 100],
  ['Trân châu', 'g', 3000, 300],
  ['Pudding', 'g', 2000, 200],
  ['Kem cheese', 'g', 2000, 200],
  ['Ly nhựa', 'cái', 500, 50],
] as const;
type StockName = (typeof STOCKS)[number][0];

// Công thức cho 1 ly size M. Size S = 80%, L = 130% (ly nhựa luôn là 1 cái).
const RECIPES: Record<string, [StockName, number][]> = {
  'Cà phê đen': [['Cà phê hạt', 18]],
  'Cà phê sữa': [['Cà phê hạt', 18], ['Sữa đặc', 30]],
  'Bạc xỉu': [['Cà phê hạt', 10], ['Sữa đặc', 30], ['Sữa tươi', 60]],
  Latte: [['Cà phê hạt', 18], ['Sữa tươi', 150]],
  'Trà sữa trân châu': [['Trà đen', 8], ['Sữa tươi', 100], ['Trân châu', 30]],
  'Trà đào': [['Trà đen', 6], ['Siro đào', 30]],
  'Matcha Latte': [['Bột matcha', 5], ['Sữa tươi', 150]],
  'Chocolate đá': [['Bột cacao', 20], ['Sữa tươi', 100]],
};
// Mỗi phần topping (không theo size)
const TOPPING_RECIPES: Record<string, [StockName, number]> = {
  'Trân châu': ['Trân châu', 30],
  Pudding: ['Pudding', 40],
  'Kem cheese': ['Kem cheese', 30],
};
const SIZE_FACTOR = { S: 0.8, M: 1, L: 1.3 } as const;

/** Thêm kho nguyên liệu + công thức nếu chưa có (chạy được cả trên database đã seed trước khi có 2 bảng này). */
export async function seedStock(prisma: PrismaClient) {
  if ((await prisma.stocks.count()) > 0) return false;
  await prisma.stocks.createMany({
    data: STOCKS.map(([name, unit, quantity, low_threshold]) => ({ name, unit, quantity, low_threshold })),
  });
  const stockId = new Map((await prisma.stocks.findMany()).map((s) => [s.name, s.id]));
  const cup = stockId.get('Ly nhựa')!;

  const data = [];
  for (const p of await prisma.products.findMany()) {
    for (const size of ['S', 'M', 'L'] as const) {
      for (const [name, qty] of RECIPES[p.name] ?? []) {
        data.push({ product_id: p.id, size, stock_id: stockId.get(name)!, quantity: Math.round(qty * SIZE_FACTOR[size]) });
      }
      if (RECIPES[p.name]) data.push({ product_id: p.id, size, stock_id: cup, quantity: 1 });
    }
  }
  for (const t of await prisma.toppings.findMany()) {
    const r = TOPPING_RECIPES[t.name];
    if (r) data.push({ topping_id: t.id, stock_id: stockId.get(r[0])!, quantity: r[1] });
  }
  await prisma.recipes.createMany({ data });
  return true;
}

export async function seed(prisma: PrismaClient) {
  if ((await prisma.products.count()) > 0) return seedStock(prisma);

  await prisma.products.createMany({
    data: PRODUCTS.map(([slug, name, description, price, category]) => ({
      name,
      description,
      price,
      category,
      image_url: `/products/${slug}.svg`,
    })),
  });
  await prisma.toppings.createMany({
    data: [
      { name: 'Trân châu', price: 7000 },
      { name: 'Pudding', price: 8000 },
      { name: 'Kem cheese', price: 10000 },
    ],
  });
  await prisma.promotions.create({
    data: { code: 'WELCOME10', type: 'PERCENT', value: 10, min_order: 50000, usage_limit: 1000, ends_at: new Date('2027-12-31T23:59:59') },
  });
  await prisma.users.createMany({
    data: [
      { full_name: 'Nhân viên quầy', email: 'staff@brewlite.local', password_hash: await bcrypt.hash('staff123', 10), role: 'STAFF' },
      { full_name: 'Khách demo', email: 'demo@brewlite.local', password_hash: await bcrypt.hash('demo123', 10) },
    ],
  });
  await seedStock(prisma);
  return true;
}

// Chạy trực tiếp file này (không phải được import trong test)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.loadEnvFile();
  } catch {
    // không có .env → dùng biến môi trường
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const created = await seed(prisma);
  console.log(created ? 'Đã thêm dữ liệu mẫu (món, topping, kho nguyên liệu, công thức, mã WELCOME10, 2 tài khoản).' : 'Đã có dữ liệu, bỏ qua seed.');
  await prisma.$disconnect();
}
