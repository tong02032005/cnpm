'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorBox, Loading, PrimaryButton } from '@/components/ui';
import { useApi } from '@/lib/api';
import { useCart } from '@/lib/store';
import { vnd, type Product, type Size, type Topping } from '@/lib/types';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const { data: product, error, loading, reload } = useApi<Product & { toppings: Topping[] }>(`/products/${id}`);
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);

  if (loading) return <Loading />;
  if (error || !product) return <ErrorBox message={error ?? 'Không tìm thấy sản phẩm'} onRetry={reload} />;

  const delta = product.sizes.find((s) => s.size === size)?.priceDelta ?? 0;
  const chosen = product.toppings.filter((t) => toppingIds.includes(t.id));
  const unitPrice = product.basePrice + delta + chosen.reduce((sum, t) => sum + t.price, 0);
  const toggle = (tid: number) =>
    setToppingIds((ids) => (ids.includes(tid) ? ids.filter((x) => x !== tid) : [...ids, tid]));

  const addToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      size,
      toppingIds,
      toppingNames: chosen.map((t) => t.name),
      unitPrice,
      qty,
    });
    router.push('/cart');
  };

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="text-sm text-brew-500">
        ← Quay lại
      </button>
      <img src={product.imageUrl} alt="" className="aspect-video w-full rounded-xl bg-brew-100 object-contain" />
      <div>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-brew-700">{product.description}</p>
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">Size</legend>
        <div className="grid grid-cols-3 gap-2">
          {product.sizes.map((s) => (
            <button
              key={s.size}
              onClick={() => setSize(s.size)}
              aria-pressed={size === s.size}
              className={`rounded-lg border py-2 ${size === s.size ? 'border-brew-700 bg-brew-700 text-white' : 'border-brew-100 bg-white'}`}
            >
              {s.size} {s.priceDelta > 0 && <span className="text-xs">+{vnd(s.priceDelta)}</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">Topping</legend>
        <div className="space-y-2">
          {product.toppings.map((t) => (
            <label key={t.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>
                <input type="checkbox" checked={toppingIds.includes(t.id)} onChange={() => toggle(t.id)} className="mr-2" />
                {t.name}
              </span>
              <span className="text-sm text-brew-500">+{vnd(t.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <span className="font-semibold">Số lượng</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-full bg-white" aria-label="Giảm">
            −
          </button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-8 w-8 rounded-full bg-white" aria-label="Tăng">
            +
          </button>
        </div>
      </div>

      <PrimaryButton onClick={addToCart} disabled={product.stock === 0}>
        {product.stock === 0 ? 'Hết hàng' : `Thêm vào giỏ · ${vnd(unitPrice * qty)}`}
      </PrimaryButton>
    </div>
  );
}
