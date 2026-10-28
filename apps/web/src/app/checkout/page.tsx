'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Empty, ErrorBox, Loading, PrimaryButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { cartTotal, useAuth, useCart, useHydrated } from '@/lib/store';
import { vnd, type Order, type PaymentResult } from '@/lib/types';

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { lines, clear, pendingOrderId: orderId, setPendingOrder } = useCart();
  const { token, logout } = useAuth();
  const [method, setMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Giữ key cho tới khi nhận được phản hồi: mất mạng rồi bấm lại vẫn dùng key cũ, không trả tiền 2 lần.
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/checkout');
  }, [hydrated, token, router]);

  if (!hydrated || !token) return <Loading />;
  if (!lines.length && !orderId) return <Empty href="/" cta="Xem menu">Giỏ hàng đang trống.</Empty>;

  const subtotal = cartTotal(lines);
  // Sau khi tạo đơn, hiển thị đúng số tiền backend tính.
  const total = serverTotal ?? subtotal - (promo?.discount ?? 0);

  const fail = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      router.replace('/login?next=/checkout');
      return;
    }
    setError(err instanceof Error ? err.message : 'Không kết nối được máy chủ');
  };

  const applyPromo = async () => {
    setError(null);
    try {
      setPromo(await api('/promotions/validate', { body: { code: promoInput, subtotal } }));
    } catch (err) {
      setPromo(null);
      fail(err);
    }
  };

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      let id = orderId;
      if (!id) {
        const order = await api<Order>('/orders', {
          token,
          body: {
            items: lines.map((l) => ({ productId: l.productId, size: l.size, qty: l.qty, toppingIds: l.toppingIds })),
            promoCode: promo?.code,
          },
        });
        id = order.id;
        setPendingOrder(id);
        setServerTotal(order.total);
      }
      idempotencyKey.current ??= crypto.randomUUID();
      const result = await api<PaymentResult>('/payments', {
        token,
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: { orderId: id, method, simulateFailure },
      });
      idempotencyKey.current = null;
      if (result.paymentStatus === 'SUCCEEDED') {
        clear();
        router.push(`/orders/${id}`);
      } else {
        setError('Thanh toán thất bại. Giỏ hàng vẫn được giữ nguyên, bạn có thể thử lại.');
      }
    } catch (err) {
      // Lỗi 5xx / mất mạng: có thể server đã trừ tiền, nên giữ key để lần bấm sau trả đúng kết quả cũ.
      if (err instanceof ApiError && err.status < 500) idempotencyKey.current = null;
      if (err instanceof ApiError && err.status === 409 && orderId) {
        const current = await api<Order>(`/orders/${orderId}`, { token }).catch(() => null);
        if (current && ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(current.status)) {
          clear(); // đơn thật ra đã được thanh toán
          return router.push(`/orders/${orderId}`);
        }
        // Đơn không thanh toán được nữa (vd: mã khuyến mãi hết lượt): hủy để trả tồn kho, lần sau tạo đơn mới.
        if (current && current.status !== 'CANCELLED') {
          await api(`/orders/${orderId}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }).catch(() => {});
        }
        setPendingOrder(null);
        setServerTotal(null);
        setPromo(null);
      }
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Thanh toán</h1>

      <div className="space-y-1 rounded-xl bg-white p-4">
        <p className="flex justify-between">
          <span>Tạm tính</span>
          <span>{vnd(subtotal)}</span>
        </p>
        {promo && (
          <p className="flex justify-between text-green-700">
            <span>Mã {promo.code}</span>
            <span>−{vnd(promo.discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-lg font-bold">
          <span>Tổng</span>
          <span data-testid="checkout-total">{vnd(total)}</span>
        </p>
      </div>

      {!orderId && (
        <div className="flex gap-2">
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="Mã khuyến mãi (vd: WELCOME10)"
            className="flex-1 rounded-lg border border-brew-100 px-3 py-2"
          />
          <button onClick={applyPromo} disabled={!promoInput} className="rounded-lg bg-brew-100 px-4 font-semibold disabled:opacity-50">
            Áp dụng
          </button>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">Phương thức</legend>
        {(
          [
            ['WALLET', 'Ví điện tử'],
            ['CARD', 'Thẻ ngân hàng'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-2 px-1 text-sm text-brew-500">
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
          Giả lập thanh toán lỗi (demo)
        </label>
      </fieldset>

      {error && <ErrorBox message={error} />}
      <PrimaryButton onClick={pay} disabled={busy}>
        {busy ? 'Đang xử lý…' : orderId ? 'Thanh toán lại' : `Xác nhận trả ${vnd(total)}`}
      </PrimaryButton>
      <p className="text-center text-xs text-brew-500">Không dùng tiền mặt · cổng thanh toán mô phỏng</p>
    </div>
  );
}
