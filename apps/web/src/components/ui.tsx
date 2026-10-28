import Link from 'next/link';
import type { ReactNode } from 'react';

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Đang tải">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-brew-100" />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline">
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Empty({ children, href, cta }: { children: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center text-brew-700">
      <p>{children}</p>
      {href && (
        <Link href={href} className="mt-3 inline-block font-semibold text-brew-500 underline">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-xl bg-brew-700 py-3 font-semibold text-white transition hover:bg-brew-900 disabled:opacity-50 ${props.className ?? ''}`}
    />
  );
}
