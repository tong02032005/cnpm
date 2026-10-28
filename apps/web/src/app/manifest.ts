import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BrewLite',
    short_name: 'BrewLite',
    description: 'Đặt và thanh toán đồ uống không dùng tiền mặt',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf6f2',
    theme_color: '#5c3b22',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
