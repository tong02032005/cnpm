import Link from 'next/link';
import type { ReactNode } from 'react';
import { STATUS_LABEL, type OrderStatus } from '@/lib/types';

/** Khung chờ khi đang tải. */
export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-foam" />
      ))}
    </div>
  );
}

/** Thông báo lỗi, có nút thử lại nếu truyền onRetry. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
          Thử lại
        </button>
      )}
    </div>
  );
}

/** Màn hình trống, chỉ rõ việc tiếp theo. */
export function Empty({ title, children, href, cta }: { title: string; children?: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brew/30 bg-white p-10 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <p className="mt-1 text-brew/70">{children}</p>}
      {href && (
        <Link href={href} className="mt-5 inline-block rounded-full bg-brew px-5 py-2.5 font-semibold text-white hover:bg-brew-dark">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function PrimaryButton({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-full bg-brew py-3.5 font-bold text-white transition-colors hover:bg-brew-dark disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  PAYMENT_FAILED: 'bg-red-100 text-red-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  PREPARING: 'bg-sky-100 text-sky-800',
  READY: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-zinc-100 text-zinc-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500 line-through',
};

export function StatusBadge({ status, testId }: { status: OrderStatus; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Nút tăng/giảm số lượng 1–20. */
export function QuantityStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-foam bg-white">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="h-9 w-9 rounded-full text-lg hover:bg-foam" aria-label={`Giảm ${label}`}>
        −
      </button>
      <span className="w-8 text-center font-bold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(20, value + 1))} className="h-9 w-9 rounded-full text-lg hover:bg-foam" aria-label={`Tăng ${label}`}>
        +
      </button>
    </div>
  );
}
