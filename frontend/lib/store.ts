'use client';

// Trạng thái phía trình duyệt (Task 5): giỏ hàng + đăng nhập, lưu vào localStorage bằng Zustand.
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';
import type { Size, User } from './types';

export interface CartLine {
  key: string;
  productId: number;
  name: string;
  imageUrl: string;
  size: Size;
  toppingIds: number[];
  toppingNames: string[];
  unitPrice: number;
  quantity: number;
}

/** Cùng món + cùng size + cùng topping → cùng một dòng (cộng dồn số lượng). */
export const lineKey = (productId: number, size: Size, toppingIds: number[]) =>
  `${productId}-${size}-${[...toppingIds].sort((a, b) => a - b).join('.')}`;

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'brewlite-auth' },
  ),
);

interface CartState {
  lines: CartLine[];
  /** Đơn đã tạo cho giỏ hiện tại nhưng chưa thanh toán xong (để thanh toán lại không tạo đơn mới). */
  pendingOrderId: number | null;
  add: (line: Omit<CartLine, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  setPendingOrder: (id: number | null) => void;
  clear: () => void;
}

/** Giỏ đổi sau khi đã tạo đơn → hủy đơn cũ (trả lại tồn kho), lần thanh toán sau tạo đơn mới. */
function releasePendingOrder(orderId: number | null): null {
  const token = useAuth.getState().token;
  if (orderId && token) {
    api(`/orders/${orderId}/status`, { method: 'PATCH', token, body: { status: 'CANCELLED' } }).catch(() => {});
  }
  return null;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      pendingOrderId: null,
      add: (line) =>
        set((s) => {
          const key = lineKey(line.productId, line.size, line.toppingIds);
          const exists = s.lines.some((l) => l.key === key);
          return {
            pendingOrderId: releasePendingOrder(s.pendingOrderId),
            lines: exists
              ? s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l))
              : [...s.lines, { ...line, key }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          pendingOrderId: releasePendingOrder(s.pendingOrderId),
          lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(20, quantity)) } : l)),
        })),
      remove: (key) =>
        set((s) => ({ pendingOrderId: releasePendingOrder(s.pendingOrderId), lines: s.lines.filter((l) => l.key !== key) })),
      setPendingOrder: (pendingOrderId) => set({ pendingOrderId }),
      clear: () => set({ lines: [], pendingOrderId: null }),
    }),
    { name: 'brewlite-cart' },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

/** false khi render trên server, true trên trình duyệt – tránh lệch giao diện khi đọc localStorage. */
export const useHydrated = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
