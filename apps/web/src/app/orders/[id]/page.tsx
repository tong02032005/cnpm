'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorBox, Loading } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { useAuth, useHydrated } from '@/lib/store';
import { STATUS_LABEL, vnd, type Order } from '@/lib/types';

const ACTIVE = ['PAID', 'PREPARING', 'READY'];
const CANCELLABLE = ['PENDING', 'PAYMENT_FAILED', 'PAID'];

export default function OrderPage() {
  const hydrated = useHydrated();
  const { id } = useParams<{ id: string }>();
  const token = useAuth((s) => s.token);
  const { data: order, error, loading, reload } = useApi<Order>(hydrated && token ? `/orders/${id}` : null, token);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Theo dõi đơn: tải lại trạng thái mỗi 5 giây khi đơn đang được pha chế.
  useEffect(() => {
    if (!order || !ACTIVE.includes(order.status)) return;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [order, reload]);

  if (hydrated && !token) return <ErrorBox message="Vui lòng đăng nhập để xem đơn." />;
  if (!hydrated || loading) return <Loading />;
  if (error || !order) return <ErrorBox message={error ?? 'Không tìm thấy đơn'} onRetry={reload} />;

  const cancel = async () => {
    try {
      await api(`/orders/${order.id}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } });
      setCancelError(null);
      reload();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Không hủy được đơn');
    }
  };

  return (
    <div className="space-y-4 text-center">
      {ACTIVE.includes(order.status) || order.status === 'COMPLETED' ? (
        <>
          <p className="text-5xl text-green-600">✓</p>
          <h1 className="text-xl font-bold">Đặt hàng thành công</h1>
        </>
      ) : (
        <h1 className="text-xl font-bold">Chi tiết đơn</h1>
      )}
      <p className="rounded-xl bg-white py-2">
        Mã đơn: <strong data-testid="order-id">#{order.id}</strong>
      </p>
      <p className="rounded-xl bg-white py-2">
        Trạng thái: <strong data-testid="order-status">{STATUS_LABEL[order.status]}</strong>
      </p>
      {order.status === 'READY' && <p className="font-semibold text-green-700">Mời bạn tới quầy lấy nước</p>}

      <ul className="space-y-1 rounded-xl bg-white p-4 text-left text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between">
            <span>
              {i.qty} × {i.product.name} ({i.size})
              {i.toppings?.length ? ` + ${i.toppings.map((t) => t.topping.name).join(', ')}` : ''}
            </span>
            <span>{vnd(i.lineTotal)}</span>
          </li>
        ))}
        {order.discount > 0 && (
          <li className="flex justify-between text-green-700">
            <span>Giảm giá</span>
            <span>−{vnd(order.discount)}</span>
          </li>
        )}
        <li className="flex justify-between border-t border-brew-100 pt-1 font-bold">
          <span>Tổng</span>
          <span>{vnd(order.total)}</span>
        </li>
      </ul>

      {cancelError && <ErrorBox message={cancelError} />}
      {CANCELLABLE.includes(order.status) && (
        <button onClick={cancel} className="text-sm text-red-600 underline">
          Hủy đơn
        </button>
      )}
      <Link href="/" className="block rounded-xl bg-brew-700 py-3 font-semibold text-white">
        Về trang chủ
      </Link>
    </div>
  );
}
