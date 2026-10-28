'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';
import type { Size } from './types';

export interface CartLine {
  key: string;
  productId: number;
  name: string;
  size: Size;
  toppingIds: number[];
  toppingNames: string[];
  unitPrice: number;
  qty: number;
}

export const lineKey = (productId: number, size: Size, toppingIds: number[]) =>
  `${productId}-${size}-${[...toppingIds].sort((a, b) => a - b).join('.')}`;

// Cùng món, cùng size, cùng topping thì gộp số lượng.
export function addLine(lines: CartLine[], line: Omit<CartLine, 'key'>): CartLine[] {
  const key = lineKey(line.productId, line.size, line.toppingIds);
  const existing = lines.find((l) => l.key === key);
  if (existing) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l));
  return [...lines, { ...line, key }];
}

export const cartTotal = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.qty, 0);

// Giỏ đổi sau khi đã tạo đơn: hủy đơn cũ (best-effort) để trả lại tồn kho.
function releasePending(orderId: number | null): null {
  const token = useAuth.getState().token;
  if (orderId && token) {
    api(`/orders/${orderId}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }).catch(() => {});
  }
  return null;
}

interface CartState {
  lines: CartLine[];
  // Đơn đã tạo cho giỏ hiện tại (chưa thanh toán xong). Giỏ đổi thì tạo đơn mới.
  pendingOrderId: number | null;
  setPendingOrder: (id: number | null) => void;
  add: (line: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      pendingOrderId: null,
      setPendingOrder: (pendingOrderId) => set({ pendingOrderId }),
      add: (line) => set((s) => ({ lines: addLine(s.lines, line), pendingOrderId: releasePending(s.pendingOrderId) })),
      setQty: (key, qty) =>
        set((s) => ({
          pendingOrderId: releasePending(s.pendingOrderId),
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        })),
      clear: () => set({ lines: [], pendingOrderId: null }),
    }),
    { name: 'brewlite-cart' },
  ),
);

interface AuthState {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      setAuth: (token, email) => set({ token, email }),
      logout: () => set({ token: null, email: null }),
    }),
    { name: 'brewlite-auth' },
  ),
);

// localStorage chỉ có ở trình duyệt: chờ mount xong mới đọc giỏ hàng/đăng nhập để tránh lệch SSR.
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
