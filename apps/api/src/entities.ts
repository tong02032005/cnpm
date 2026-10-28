import { Order, OrderItem, OrderItemTopping } from './orders/order.entity';
import { Payment } from './payments/payment.entity';
import { Product, ProductSize, Topping } from './products/product.entity';
import { Promotion } from './promotions/promotion.entity';
import { LoyaltyTransaction, User } from './users/user.entity';

export const entities = [
  User,
  LoyaltyTransaction,
  Product,
  ProductSize,
  Topping,
  Promotion,
  Order,
  OrderItem,
  OrderItemTopping,
  Payment,
];
