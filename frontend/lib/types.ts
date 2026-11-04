// Kiểu dữ liệu trả về từ backend (khớp với backend/src).

export type Size = 'S' | 'M' | 'L';
export type OrderStatus = 'PENDING' | 'PAID' | 'PAYMENT_FAILED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
}

export interface ProductDetail extends Product {
  sizes: { size: Size; extra: number }[];
  toppings: Topping[];
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'CUSTOMER' | 'STAFF';
  loyaltyPoints: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  items: {
    id: number;
    product_name: string;
    size: Size;
    quantity: number;
    unit_price: number;
    line_total: number;
    toppings: Topping[];
  }[];
  payments?: { id: number; method: 'WALLET' | 'CARD'; status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED'; amount: number }[];
}

export interface PaymentResult {
  paymentId: number;
  orderId: number;
  amount: number;
  paymentStatus: 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  orderStatus: OrderStatus;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng tại quầy',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};
