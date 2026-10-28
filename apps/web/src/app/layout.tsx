import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite',
  description: 'Đặt và thanh toán đồ uống không dùng tiền mặt',
  appleWebApp: { capable: true, title: 'BrewLite' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#5c3b22' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto max-w-xl px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
