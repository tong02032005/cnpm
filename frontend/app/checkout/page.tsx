'use client';

// Task 8: thanh toán không tiền mặt (Ví / Thẻ – mô phỏng).
// Luồng: POST /orders (nếu chưa có đơn) → POST /payments kèm Idempotency-Key.
// Thanh toán lỗi → giữ nguyên giỏ, cho thanh toán lại cùng đơn trong thời hạn 15 phút.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Empty, ErrorBox, Loading, PrimaryButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { cartTotal, formatVnd } from '@/lib/pricing';
import { useAuth, useCart, useHydrated } from '@/lib/store';
import type { Order, PaymentResult, User } from '@/lib/types';

const EXPIRED_MESSAGE =
  'Đơn đã quá 15 phút chưa thanh toán nên đã tự hủy. Giỏ hàng vẫn còn, bấm "Xác nhận thanh toán" để đặt lại.';

/** Đồng hồ đếm ngược hạn thanh toán của đơn đang chờ; hết giờ thì báo cho trang cha. */
function PaymentDeadline({ orderId, token, onExpired }: { orderId: number; token: string; onExpired: () => void }) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    api<Order>(`/orders/${orderId}`, { token })
      .then((o) => {
        if (!alive) return;
        if (o.status === 'CANCELLED') onExpired();
        else setExpiresAt(Date.parse(o.expires_at));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [orderId, token, onExpired]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = expiresAt === null ? null : Math.max(0, expiresAt - now);
  useEffect(() => {
    if (left === 0) onExpired();
  }, [left, onExpired]);

  if (left === null) return null;
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  return (
    <p role="timer" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      Đơn #{orderId} được giữ trong <strong className="tabular-nums">{mm}:{ss}</strong>. Quá thời gian này đơn sẽ tự hủy.
    </p>
  );
}

const METHODS = [
  { value: 'WALLET', title: 'Ví điện tử', hint: 'MoMo, ZaloPay… (mô phỏng)' },
  { value: 'CARD', title: 'Thẻ ngân hàng', hint: 'ATM / Visa (mô phỏng)' },
] as const;

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { lines, clear, pendingOrderId, setPendingOrder } = useCart();
  const { token, setAuth, logout } = useAuth();
  const [method, setMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Giữ key tới khi nhận được phản hồi: mất mạng rồi bấm lại vẫn dùng key cũ → không trừ tiền 2 lần (Task 10b)
  const idempotencyKey = useRef<string | null>(null);

  // Hết hạn: bỏ đơn cũ (backend đã/ sẽ tự hủy), lần bấm sau tạo đơn mới từ giỏ hàng hiện tại
  const onExpired = useCallback(() => {
    setPendingOrder(null);
    setOrderTotal(null);
    setError(EXPIRED_MESSAGE);
  }, [setPendingOrder]);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/checkout');
  }, [hydrated, token, router]);

  if (!hydrated || !token) return <Loading />;
  if (!lines.length) return <Empty title="Giỏ hàng đang trống" href="/" cta="Xem menu" />;

  const subtotal = cartTotal(lines);
  const total = orderTotal ?? subtotal - (promo?.discount ?? 0);

  const showError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      logout();
      router.replace('/login?next=/checkout');
      return;
    }
    setError((err as Error).message);
  };

  const applyPromo = async () => {
    setError(null);
    try {
      setPromo(await api('/promotions/validate', { body: { code: promoInput, subtotal } }));
    } catch (err) {
      setPromo(null);
      showError(err);
    }
  };

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        const order = await api<Order>('/orders', {
          token,
          body: {
            items: lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity, toppingIds: l.toppingIds })),
            promoCode: promo?.code,
          },
        });
        orderId = order.id;
        setPendingOrder(order.id);
        setOrderTotal(order.total);
      }
      idempotencyKey.current ??= crypto.randomUUID();
      const result = await api<PaymentResult>('/payments', {
        token,
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: { orderId, method, simulateFailure },
      });
      idempotencyKey.current = null;
      if (result.paymentStatus === 'SUCCEEDED') {
        clear();
        // cập nhật điểm thưởng trên thanh điều hướng
        api<User>('/auth/me', { token }).then((u) => setAuth(token, u)).catch(() => {});
        router.push(`/orders/${orderId}`);
      } else {
        setError('Thanh toán thất bại. Giỏ hàng vẫn được giữ nguyên, bạn có thể thanh toán lại.');
      }
    } catch (err) {
      // Lỗi 4xx: yêu cầu đã bị từ chối hẳn → lần sau dùng key mới. Lỗi mạng/5xx: giữ key cũ.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) idempotencyKey.current = null;
      if (err instanceof ApiError && err.status === 409 && err.message.includes('hết hạn')) return onExpired();
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Thanh toán</h1>

      <section className="space-y-2 rounded-2xl bg-white p-5">
        {lines.map((l) => (
          <p key={l.key} className="flex justify-between text-sm">
            <span>
              {l.quantity} × {l.name} ({l.size}){l.toppingNames.length ? ` + ${l.toppingNames.join(', ')}` : ''}
            </span>
            <span className="tabular-nums">{formatVnd(l.unitPrice * l.quantity)}</span>
          </p>
        ))}
        {promo && !pendingOrderId && (
          <p className="flex justify-between text-emerald-700">
            <span>Mã {promo.code}</span>
            <span>−{formatVnd(promo.discount)}</span>
          </p>
        )}
        <p className="flex justify-between border-t border-foam pt-2 text-xl font-extrabold">
          <span>Tổng</span>
          <span data-testid="checkout-total">{formatVnd(total)}</span>
        </p>
      </section>

      {!pendingOrderId && (
        <div className="flex gap-2">
          <label htmlFor="promo" className="sr-only">
            Mã khuyến mãi
          </label>
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Mã khuyến mãi (vd: WELCOME10)"
            className="min-w-0 flex-1 rounded-full border border-foam bg-white px-4 py-3"
          />
          <button onClick={applyPromo} disabled={!promoInput.trim()} className="rounded-full bg-foam px-5 font-semibold text-brew disabled:opacity-50">
            Áp dụng
          </button>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-lg font-bold">Phương thức thanh toán</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {METHODS.map((m) => (
            <label key={m.value} className={`cursor-pointer rounded-2xl border-2 bg-white p-4 ${method === m.value ? 'border-brew' : 'border-transparent'}`}>
              <input type="radio" name="method" className="sr-only" checked={method === m.value} onChange={() => setMethod(m.value)} />
              <span className="block font-bold">{m.title}</span>
              <span className="block text-sm text-brew/70">{m.hint}</span>
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-brew/80">
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} className="accent-brew" />
          Giả lập thanh toán lỗi (để demo)
        </label>
      </fieldset>

      {pendingOrderId && <PaymentDeadline key={pendingOrderId} orderId={pendingOrderId} token={token} onExpired={onExpired} />}
      {error && <ErrorBox message={error} />}
      <PrimaryButton onClick={pay} disabled={busy}>
        {busy ? 'Đang xử lý…' : pendingOrderId ? `Thanh toán lại ${formatVnd(total)}` : `Xác nhận thanh toán ${formatVnd(total)}`}
      </PrimaryButton>
      <p className="text-center text-xs text-brew/60">BrewLite không nhận tiền mặt. Cổng thanh toán trong bản demo là mô phỏng.</p>
    </div>
  );
}
