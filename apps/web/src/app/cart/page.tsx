'use client';

import { useRouter } from 'next/navigation';
import { Empty, Loading, PrimaryButton } from '@/components/ui';
import { cartTotal, useAuth, useCart, useHydrated } from '@/lib/store';
import { vnd } from '@/lib/types';

export default function CartPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { lines, setQty } = useCart();
  const token = useAuth((s) => s.token);

  if (!hydrated) return <Loading />;
  if (!lines.length) return <Empty href="/" cta="Xem menu">Giỏ hàng đang trống.</Empty>;

  const total = cartTotal(lines);
  const checkout = () => router.push(token ? '/checkout' : '/login?next=/checkout');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Giỏ hàng</h1>
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between rounded-xl bg-white p-3">
            <div>
              <p className="font-semibold">
                {l.name} <span className="text-sm font-normal">({l.size})</span>
              </p>
              {l.toppingNames.length > 0 && <p className="text-xs text-brew-500">{l.toppingNames.join(', ')}</p>}
              <p className="text-sm">{vnd(l.unitPrice * l.qty)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(l.key, l.qty - 1)} className="h-8 w-8 rounded-full bg-brew-100" aria-label={`Giảm ${l.name}`}>
                −
              </button>
              <span>{l.qty}</span>
              <button onClick={() => setQty(l.key, l.qty + 1)} className="h-8 w-8 rounded-full bg-brew-100" aria-label={`Tăng ${l.name}`}>
                +
              </button>
              <button onClick={() => setQty(l.key, 0)} className="ml-1 text-sm text-red-600">
                Xóa
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex justify-between text-lg font-bold">
        <span>Tổng</span>
        <span data-testid="cart-total">{vnd(total)}</span>
      </p>
      <PrimaryButton onClick={checkout}>Thanh toán · {vnd(total)}</PrimaryButton>
    </div>
  );
}
