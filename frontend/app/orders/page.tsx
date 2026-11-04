'use client';

// Task 9: lịch sử đơn – GET /orders/me.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Empty, ErrorBox, Loading, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/pricing';
import { useAuth, useHydrated } from '@/lib/store';
import type { Order } from '@/lib/types';

export default function OrdersPage() {
  const hydrated = useHydrated();
  const token = useAuth((s) => s.token);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<Order[]>('/orders/me', { token })
      .then(setOrders)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  if (!hydrated) return <Loading />;
  if (!token) return <Empty title="Bạn chưa đăng nhập" href="/login?next=/orders" cta="Đăng nhập" />;
  if (error) return <ErrorBox message={error} />;
  if (!orders) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Đơn của tôi</h1>
      {!orders.length ? (
        <Empty title="Chưa có đơn nào" href="/" cta="Đặt món đầu tiên" />
      ) : (
        <ul className="divide-y divide-foam rounded-2xl bg-white">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-cream">
                <div>
                  <p className="font-bold">Đơn #{o.id}</p>
                  <p className="text-sm text-brew/70">
                    {new Date(o.created_at).toLocaleString('vi-VN')} · {o.items.reduce((n, i) => n + i.quantity, 0)} ly
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatVnd(o.total)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
