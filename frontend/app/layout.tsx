import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'BrewLite – Đặt đồ uống không tiền mặt',
  description: 'Chọn món, thanh toán bằng ví hoặc thẻ, nhận đồ uống tại quầy.',
};

// Dùng font hệ thống (không tải Google Fonts) để build được cả khi máy không có mạng/proxy chặn.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="py-6 text-center text-sm text-brew/70">BrewLite · Công nghệ Phần mềm 2026</footer>
      </body>
    </html>
  );
}
