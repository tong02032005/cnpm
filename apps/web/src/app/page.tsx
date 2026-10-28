'use client';

import Link from 'next/link';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';
import { vnd, type Product } from '@/lib/types';

export default function MenuPage() {
  const { data, error, loading, reload } = useApi<Product[]>('/products');

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Menu</h1>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty>Menu đang được cập nhật, bạn quay lại sau nhé.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="block rounded-xl bg-white p-3 shadow-sm transition hover:shadow-md"
              >
                <img src={p.imageUrl} alt="" className="mb-2 aspect-[4/3] w-full rounded-lg bg-brew-100 object-contain" />
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-brew-500">{vnd(p.basePrice)}</p>
                {p.stock === 0 && <p className="text-xs text-red-600">Hết hàng</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
