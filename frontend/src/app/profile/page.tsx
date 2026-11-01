'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Profile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('access_token') ?? ''}`,
    };
  }

  function logoutAndGoLogin() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    router.push('/login');
  }

  useEffect(() => {
    if (!sessionStorage.getItem('access_token')) {
      router.push('/login');
      return;
    }

    fetch(`${API_URL}/auth/me`, { headers: authHeaders() })
      .then(async (res) => {
        if (res.status === 401) return logoutAndGoLogin();
        if (!res.ok) throw new Error();
        const data: Profile = await res.json();
        setProfile(data);
        setFullName(data.fullName);
        setPhone(data.phone ?? '');
      })
      .catch(() => setError('Không thể tải thông tin tài khoản.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() }),
      });

      if (res.status === 401) return logoutAndGoLogin();

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message;
        throw new Error(msg || 'Cập nhật thất bại.');
      }

      setProfile(data.user);
      // Cập nhật tên hiển thị ở trang chủ.
      sessionStorage.setItem('user', JSON.stringify(data.user));
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f8f3ed',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          padding: '36px',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          color: '#333',
        }}
      >
        <h1 style={{ textAlign: 'center', color: '#6f422b', fontSize: '28px' }}>
          Thông tin tài khoản
        </h1>

        {!profile && !error && <p>Đang tải...</p>}

        {profile && (
          <form onSubmit={handleSave} style={{ marginTop: '24px' }}>
            <label htmlFor="email">Email</label>
            <input id="email" value={profile.email} disabled style={inputStyle} />

            <label htmlFor="role">Vai trò</label>
            <input
              id="role"
              value={profile.role === 'ADMIN' ? 'Nhân viên / Quản trị' : 'Khách hàng'}
              disabled
              style={inputStyle}
            />

            <label htmlFor="fullName">Họ và tên</label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
              style={inputStyle}
            />

            <label htmlFor="phone">Số điện thoại</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              style={inputStyle}
            />

            {message && <p style={{ color: '#2e7d32' }}>{message}</p>}

            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                background: saving ? '#a58b7d' : '#6f422b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'wait' : 'pointer',
                fontSize: '16px',
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        )}

        {error && <p style={{ color: '#c62828', marginTop: '12px' }}>{error}</p>}

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#777' }}>
            ← Quay lại trang chủ
          </Link>
        </p>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px',
  marginTop: '8px',
  marginBottom: '18px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxSizing: 'border-box',
};
