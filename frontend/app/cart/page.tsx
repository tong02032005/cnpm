'use client';

// Task 5: giỏ hàng – sửa số lượng, xóa, tự tính tổng tiền.
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Empty, Loading, PrimaryButton, QuantityStepper } from '@/components/ui';
import { cartTotal, formatVnd } from '@/lib/pricing';
import { useAuth, useCart, useHydrated } from '@/lib/store';

export default function CartPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { lines, setQuantity, remove } = useCart();
  const token = useAuth((s) => s.token);

  if (!hydrated) return <Loading />;
  if (!lines.length) return <Empty title="Giỏ hàng đang trống" href="/" cta="Xem menu">Chọn một món để bắt đầu.</Empty>;

  const total = cartTotal(lines);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Giỏ hàng</h1>
      <ul className="divide-y divide-foam rounded-2xl bg-white">
        {lines.map((l) => (
          <li key={l.key} className="flex gap-3 p-4">
            <Image src={l.imageUrl} alt="" width={80} height={60} unoptimized className="h-16 w-20 shrink-0 rounded-xl bg-foam object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {l.name} <span className="font-normal text-brew/70">· size {l.size}</span>
              </p>
              {l.toppingNames.length > 0 && <p className="text-sm text-brew/70">+ {l.toppingNames.join(', ')}</p>}
              <div className="mt-2 flex items-center gap-4">
                <QuantityStepper value={l.quantity} onChange={(q) => setQuantity(l.key, q)} label={l.name} />
                <button onClick={() => remove(l.key)} className="text-sm font-medium text-red-700 hover:underline">
                  Xóa
                </button>
              </div>
            </div>
            <p className="shrink-0 font-bold tabular-nums">{formatVnd(l.unitPrice * l.quantity)}</p>
          </li>
        ))}
      </ul>
      <Link href="/" className="inline-block font-semibold text-brew hover:underline">
        + Thêm món khác
      </Link>
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-lg font-bold">
        <span>Tạm tính</span>
        <span data-testid="cart-total">{formatVnd(total)}</span>
      </div>
      <PrimaryButton onClick={() => router.push(token ? '/checkout' : '/login?next=/checkout')}>
        Thanh toán · {formatVnd(total)}
      </PrimaryButton>
    </div>
  );
}
