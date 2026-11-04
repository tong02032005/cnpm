'use client';

// Task 3: trang Menu – lưới sản phẩm, có trạng thái loading / empty / lỗi.
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ErrorBox } from '@/components/ui';
import { api } from '@/lib/api';
import { formatVnd } from '@/lib/pricing';
import type { Product } from '@/lib/types';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; products: Product[] };

export default function MenuPage() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  // Chỉ setState khi có kết quả (không setState đồng bộ trong effect)
  const fetchMenu = useCallback(() => {
    api<Product[]>('/products')
      .then((products) => setState({ kind: 'ready', products }))
      .catch((err: Error) => setState({ kind: 'error', message: err.message }));
  }, []);
  useEffect(fetchMenu, [fetchMenu]);

  return (
    <>
      <section className="mb-8">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Menu đồ uống</h1>
        <p className="mt-2 text-brew/80">Chọn món, size và topping. Thanh toán bằng ví hoặc thẻ, nhận tại quầy.</p>
        <p className="mt-4 inline-block rounded-xl bg-foam px-3 py-2 text-sm">
          Nhập mã <strong>WELCOME10</strong> để giảm 10% cho đơn từ 50.000đ.
        </p>
      </section>

      {state.kind === 'loading' && (
        <ul aria-busy="true" aria-label="Đang tải menu" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white">
              <div className="aspect-[4/3] bg-foam" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-2/3 rounded bg-foam" />
                <div className="h-4 w-1/3 rounded bg-foam" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.kind === 'error' && (
        <ErrorBox
          message={`Không tải được menu. ${state.message}`}
          onRetry={() => {
            setState({ kind: 'loading' });
            fetchMenu();
          }}
        />
      )}

      {state.kind === 'ready' && state.products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-brew/30 bg-white p-10 text-center">
          <p className="text-lg font-bold">Menu đang trống</p>
          <p className="mt-1 text-brew/70">Chưa có đồ uống nào đang bán. Bạn quay lại sau nhé.</p>
        </div>
      )}

      {state.kind === 'ready' && state.products.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {state.products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-foam transition hover:shadow-md hover:ring-brew/40"
              >
                <Image src={p.imageUrl} alt={p.name} width={600} height={450} unoptimized className="aspect-[4/3] w-full bg-foam object-cover" />
                <div className="p-3">
                  <p className="text-xs text-brew/60">{p.category}</p>
                  <h2 className="font-bold group-hover:text-brew">{p.name}</h2>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-bold text-brew">{formatVnd(p.price)}</span>
                    {p.stock === 0 && <span className="text-xs font-semibold text-red-700">Hết hàng</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
