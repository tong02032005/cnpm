'use client';

import { useCallback, useEffect, useState } from 'react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Options {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, { method, body, token, headers }: Options = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new ApiError(res.status, msg ?? 'Có lỗi xảy ra, vui lòng thử lại');
  }
  return data as T;
}

// Gọi API khi mount; trả về dữ liệu, lỗi, trạng thái loading và hàm tải lại.
export function useApi<T>(path: string | null, token?: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path, { token }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setLoading(false);
    }
  }, [path, token]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
