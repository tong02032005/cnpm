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

export async function seed(prisma: PrismaClient) {
  if ((await prisma.products.count()) > 0) return false;

  await prisma.products.createMany({
    data: PRODUCTS.map(([slug, name, description, price, category]) => ({
      name,
      description,
      price,
      category,
      image_url: `/products/${slug}.svg`,
      stock: 100,
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
  console.log(created ? 'Đã thêm dữ liệu mẫu: 8 món, 3 topping, mã WELCOME10, 2 tài khoản.' : 'Đã có dữ liệu, bỏ qua seed.');
  await prisma.$disconnect();
}
