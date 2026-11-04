'use client';

// Task 9: màn hình xác nhận đơn – mã đơn, trạng thái, tự làm mới khi đang pha chế.
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ErrorBox, Loading, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/pricing';
import { useAuth, useHydrated } from '@/lib/store';
import type { Order, OrderStatus } from '@/lib/types';

const ACTIVE: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];
const CANCELLABLE: OrderStatus[] = ['PENDING', 'PAYMENT_FAILED', 'PAID'];

export default function OrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderView />
    </Suspense>
  );
}

function OrderView() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const token = useAuth((s) => s.token);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api<Order>(`/orders/${id}`, { token })
      .then(setOrder)
      .catch((err: Error) => setError(err.message));
  }, [id, token]);
  useEffect(load, [load]);

  // Đơn đang được pha chế: tải lại trạng thái mỗi 5 giây
  useEffect(() => {
    if (!order || !ACTIVE.includes(order.status)) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [order, load]);

  if (!hydrated) return <Loading />;
  if (!token) return <ErrorBox message="Vui lòng đăng nhập để xem đơn." />;
  if (error) return <ErrorBox message={error} />;
  if (!order) return <Loading />;

  const cancel = async () => {
    try {
      setOrder(await api<Order>(`/orders/${order.id}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const paid = ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="rounded-3xl bg-brew p-6 text-center text-white">
        <p className="text-white/80">{paid ? 'Đặt hàng thành công · Mã đơn của bạn' : 'Đơn hàng'}</p>
        <p data-testid="order-id" className="text-6xl font-extrabold tabular-nums">
          #{order.id}
        </p>
        <p className="mt-3">
          <StatusBadge status={order.status} testId="order-status" />
        </p>
        {order.status === 'READY' && <p className="mt-3 text-lg font-bold">Mời bạn tới quầy nhận đồ uống</p>}
      </section>

      <ul className="space-y-2 rounded-2xl bg-white p-5">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span>
              {i.quantity} × {i.product_name} ({i.size})
              {i.toppings.length > 0 && <span className="block text-sm text-brew/70">+ {i.toppings.map((t) => t.name).join(', ')}</span>}
            </span>
            <span className="tabular-nums">{formatVnd(i.line_total)}</span>
          </li>
        ))}
        {order.discount > 0 && (
          <li className="flex justify-between text-emerald-700">
            <span>Giảm giá</span>
            <span>−{formatVnd(order.discount)}</span>
          </li>
        )}
        <li className="flex justify-between border-t border-foam pt-2 text-lg font-extrabold">
          <span>Tổng</span>
          <span>{formatVnd(order.total)}</span>
        </li>
      </ul>

      {CANCELLABLE.includes(order.status) && (
        <button onClick={cancel} className="block w-full text-center text-sm font-semibold text-red-700 hover:underline">
          Hủy đơn{order.status === 'PAID' ? ' và hoàn tiền' : ''}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders" className="rounded-full bg-foam py-3 text-center font-bold text-brew">
          Lịch sử đơn
        </Link>
        <Link href="/" className="rounded-full bg-brew py-3 text-center font-bold text-white">
          Về menu
        </Link>
      </div>
    </div>
  );
}
