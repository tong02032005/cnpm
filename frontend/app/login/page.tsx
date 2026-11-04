'use client';

// Task 7: đăng nhập / đăng ký (JWT lưu ở trình duyệt).
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ErrorBox, Loading, PrimaryButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import type { User } from '@/lib/types';

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading rows={2} />}>
      <LoginForm />
    </Suspense>
  );
}

const input = 'mt-1 w-full rounded-xl border border-foam bg-white px-4 py-3 outline-none focus:border-brew';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const setAuth = useAuth((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === 'register' ? { fullName, email, password } : { email, password };
      const res = await api<{ accessToken: string; user: User }>(`/auth/${mode}`, { body });
      setAuth(res.accessToken, res.user);
      // Chỉ chuyển hướng trong site
      router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-extrabold tracking-tight">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
      {mode === 'register' && (
        <label className="block">
          <span className="text-sm font-semibold">Họ tên</span>
          <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Mật khẩu (tối thiểu 6 ký tự)</span>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      {error && <ErrorBox message={error} />}
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </PrimaryButton>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        className="w-full text-sm font-semibold text-brew hover:underline"
      >
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
      {mode === 'login' && <p className="text-center text-xs text-brew/60">Tài khoản demo: demo@brewlite.local / demo123</p>}
    </form>
  );
}
