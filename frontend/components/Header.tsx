'use client';

import Link from 'next/link';
import { cartCount, useAuth, useCart, useHydrated } from '@/lib/store';

/** Thanh điều hướng + badge số lượng giỏ hàng (Task 5). */
export function Header() {
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-foam bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/" className="whitespace-nowrap text-xl font-extrabold tracking-tight text-brew">
          ☕ BrewLite
        </Link>
        <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-sm font-medium sm:gap-4">
          {hydrated && user ? (
            <>
              <Link href="/orders" className="hover:text-brew">
                Đơn của tôi
              </Link>
              <span className="hidden text-brew/70 sm:inline">
                {user.fullName} · {user.loyaltyPoints} điểm
              </span>
              <button onClick={logout} className="hover:text-brew">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="hover:text-brew">
              Đăng nhập
            </Link>
          )}
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full bg-brew px-4 py-2 font-semibold text-white hover:bg-brew-dark"
            aria-label={`Giỏ hàng, ${hydrated ? count : 0} món`}
          >
            Giỏ
            <span data-testid="cart-count" className="rounded-full bg-white px-2 text-xs leading-5 text-brew">
              {hydrated ? count : 0}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
