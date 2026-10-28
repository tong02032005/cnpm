'use client';

import Link from 'next/link';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';
import { useAuth, useHydrated } from '@/lib/store';
import { STATUS_LABEL, vnd, type Order } from '@/lib/types';

export default function OrdersPage() {
  const hydrated = useHydrated();
  const token = useAuth((s) => s.token);
  const { data, error, loading, reload } = useApi<Order[]>(hydrated && token ? '/orders/me' : null, token);

  if (hydrated && !token) return <Empty href="/login?next=/orders" cta="Đăng nhập">Đăng nhập để xem lịch sử đơn.</Empty>;
  if (!hydrated || loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lịch sử đơn</h1>
      {!data?.length ? (
        <Empty href="/" cta="Đặt món đầu tiên">Bạn chưa có đơn nào.</Empty>
      ) : (
        <ul className="space-y-2">
          {data.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex justify-between rounded-xl bg-white p-3">
                <div>
                  <p className="font-semibold">#{o.id}</p>
                  <p className="text-xs text-brew-500">{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="text-right">
                  <p>{vnd(o.total)}</p>
                  <p className="text-xs">{STATUS_LABEL[o.status]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
