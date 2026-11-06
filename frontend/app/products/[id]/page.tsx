'use client';

// Task 4: chi tiết sản phẩm – chọn size, topping, số lượng; giá cập nhật ngay.
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ErrorBox, Loading, PrimaryButton, QuantityStepper } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { calculatePrice, formatVnd } from '@/lib/pricing';
import { useCart } from '@/lib/store';
import type { ProductDetail, Size } from '@/lib/types';

type State = { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error'; message: string } | { kind: 'ready'; product: ProductDetail };

export default function ProductPage() {
  // useParams phải nằm trong Suspense khi bật cacheComponents (next.config.ts)
  return (
    <Suspense fallback={<Loading />}>
      <ProductDetailView />
    </Suspense>
  );
}

function ProductDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const productId = Number(id);
  const validId = Number.isInteger(productId) && productId > 0;
  const [state, setState] = useState<State>(validId ? { kind: 'loading' } : { kind: 'not-found' });
  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!validId) return;
    api<ProductDetail>(`/products/${productId}`)
      .then((product) => setState({ kind: 'ready', product }))
      .catch((err: Error) =>
        setState(err instanceof ApiError && err.status === 404 ? { kind: 'not-found' } : { kind: 'error', message: err.message }),
      );
  }, [productId, validId]);

  const back = (
    <Link href="/" className="text-sm font-semibold text-brew hover:underline">
      ← Quay lại menu
    </Link>
  );

  if (state.kind === 'loading') return <Loading />;
  if (state.kind !== 'ready') {
    return (
      <>
        {back}
        <div className="mt-6">
          <ErrorBox message={state.kind === 'not-found' ? 'Không tìm thấy món này, có thể món đã ngừng bán.' : state.message} />
        </div>
      </>
    );
  }

  const { product } = state;
  const sizeExtra = product.sizes.find((s) => s.size === size)?.extra ?? 0;
  const chosen = product.toppings.filter((t) => toppingIds.includes(t.id));
  const unitPrice = calculatePrice(product.price, sizeExtra, chosen.map((t) => t.price));
  const soldOut = product.stock === 0;

  const toggleTopping = (tid: number) =>
    setToppingIds((cur) => (cur.includes(tid) ? cur.filter((x) => x !== tid) : [...cur, tid]));

  const addToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppingIds,
      toppingNames: chosen.map((t) => t.name),
      unitPrice,
      quantity,
    });
    router.push('/cart');
  };

  return (
    <>
      {back}
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <Image src={product.imageUrl} alt={product.name} width={600} height={450} unoptimized priority className="aspect-[4/3] w-full rounded-3xl bg-foam object-cover" />

        <section>
          <p className="text-sm text-brew/60">{product.category}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-brew/80">{product.description}</p>
          <p className="mt-3">
            Giá gốc: <strong>{formatVnd(product.price)}</strong>
            {product.stock !== null && <span className="ml-3 text-sm text-brew/60">Còn {product.stock} ly</span>}
          </p>

          <fieldset className="mt-6">
            <legend className="mb-2 font-bold">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  aria-pressed={size === s.size}
                  onClick={() => setSize(s.size)}
                  className={`rounded-xl border-2 py-2 font-bold transition-colors ${size === s.size ? 'border-brew bg-brew text-white' : 'border-foam bg-white hover:border-brew/40'}`}
                >
                  {s.size}
                  <span className="block text-xs font-normal">{s.extra ? `+${formatVnd(s.extra)}` : 'Giá gốc'}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 font-bold">Topping</legend>
            <div className="divide-y divide-foam rounded-xl bg-white">
              {product.toppings.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                  <input type="checkbox" checked={toppingIds.includes(t.id)} onChange={() => toggleTopping(t.id)} className="h-5 w-5 accent-brew" />
                  <span className="flex-1">{t.name}</span>
                  <span className="text-sm text-brew/70">+{formatVnd(t.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex items-center justify-between">
            <span className="font-bold">Số lượng</span>
            <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} />
          </div>

          <PrimaryButton onClick={addToCart} disabled={soldOut} className="mt-6">
            {soldOut ? 'Hết hàng' : `Thêm vào giỏ · ${formatVnd(unitPrice * quantity)}`}
          </PrimaryButton>
        </section>
      </div>
    </>
  );
}
