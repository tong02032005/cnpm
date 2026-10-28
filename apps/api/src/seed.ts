import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Product, Size, Topping } from './products/product.entity';
import { Promotion, PromotionType } from './promotions/promotion.entity';
import { Role, User } from './users/user.entity';

const DRINKS: [name: string, price: number, description: string][] = [
  ['Cà phê sữa', 35_000, 'Cà phê phin pha sữa đặc'],
  ['Americano', 40_000, 'Espresso pha loãng với nước nóng'],
  ['Cappuccino', 45_000, 'Espresso, sữa nóng và bọt sữa dày'],
  ['Latte', 45_000, 'Espresso với nhiều sữa tươi'],
  ['Bạc xỉu', 35_000, 'Nhiều sữa, ít cà phê'],
  ['Trà đào', 39_000, 'Trà đen, đào miếng và sả'],
  ['Trà sữa', 42_000, 'Trà đen pha sữa tươi'],
  ['Matcha latte', 49_000, 'Matcha Nhật pha sữa tươi'],
];

// Tạo dữ liệu mẫu. Chạy lại nhiều lần vẫn an toàn: đã có sản phẩm thì bỏ qua.
export async function seed(ds: DataSource) {
  if ((await ds.manager.count(Product)) > 0) return false;

  await ds.manager.save(
    DRINKS.map(([name, basePrice, description]) =>
      ds.manager.create(Product, {
        name,
        basePrice,
        description,
        imageUrl: '/drink.svg',
        stock: 100,
        sizes: [
          { size: Size.S, priceDelta: 0 },
          { size: Size.M, priceDelta: 5_000 },
          { size: Size.L, priceDelta: 10_000 },
        ],
      }),
    ),
  );
  await ds.manager.insert(Topping, [
    { name: 'Trân châu', price: 5_000 },
    { name: 'Kem cheese', price: 10_000 },
    { name: 'Thạch cà phê', price: 7_000 },
  ]);
  await ds.manager.insert(User, [
    { email: 'staff@brewlite.local', passwordHash: await hash(process.env.SEED_STAFF_PASSWORD ?? 'staff123', 10), role: Role.STAFF },
    { email: 'demo@brewlite.local', passwordHash: await hash('demo123', 10) },
  ]);
  const now = Date.now();
  await ds.manager.insert(Promotion, {
    code: 'WELCOME10',
    type: PromotionType.PERCENT,
    value: 10,
    minOrder: 50_000,
    startsAt: new Date(now - 86_400_000),
    endsAt: new Date(now + 365 * 86_400_000),
    usageLimit: 1000,
  });
  return true;
}

if (require.main === module) {
  import('./data-source').then(async ({ default: ds }) => {
    await ds.initialize();
    console.log((await seed(ds)) ? 'Seeded sample data' : 'Data already present, skipped');
    await ds.destroy();
  });
}
