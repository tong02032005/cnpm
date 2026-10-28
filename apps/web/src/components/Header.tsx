'use client';

import Link from 'next/link';
import { cartCount, useAuth, useCart, useHydrated } from '@/lib/store';

export function Header() {
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const { token, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-brew-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brew-700">
          ☕ BrewLite
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {hydrated && token ? (
            <>
              <Link href="/orders">Đơn của tôi</Link>
              <button onClick={logout} className="text-brew-500">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login">Đăng nhập</Link>
          )}
          <Link href="/cart" className="rounded-full bg-brew-700 px-3 py-1 font-semibold text-white">
            Giỏ <span data-testid="cart-count">{hydrated ? count : 0}</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
