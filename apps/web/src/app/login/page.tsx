'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ErrorBox, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const setAuth = useAuth((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string; user: { email: string } }>(`/auth/${mode}`, {
        body: { email, password },
      });
      setAuth(res.accessToken, res.user.email);
      // chỉ cho chuyển hướng trong site
      router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
      <label className="block">
        <span className="text-sm">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-brew-100 px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm">Mật khẩu (tối thiểu 6 ký tự)</span>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-brew-100 px-3 py-2" />
      </label>
      {error && <ErrorBox message={error} />}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </PrimaryButton>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-sm text-brew-500 underline">
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
