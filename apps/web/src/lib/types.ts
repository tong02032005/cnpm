export type Size = 'S' | 'M' | 'L';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PAYMENT_FAILED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Product {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  stock: number;
  sizes: { size: Size; priceDelta: number }[];
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  items: {
    id: number;
    size: Size;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string };
    toppings?: { topping: { name: string } }[];
  }[];
}

export interface PaymentResult {
  orderId: number;
  paymentStatus: 'SUCCEEDED' | 'FAILED';
  orderStatus: OrderStatus;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng tại quầy',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
