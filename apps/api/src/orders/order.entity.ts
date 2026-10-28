import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Product, Size, Topping } from '../products/product.entity';
import { Promotion } from '../promotions/promotion.entity';
import { User } from '../users/user.entity';
import type { Payment } from '../payments/payment.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column() userId: number;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) status: OrderStatus;
  @Column('int') subtotal: number;
  @Column('int', { default: 0 }) discount: number;
  @Column('int') total: number;
  @Column({ type: 'int', nullable: true }) promotionId: number | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @ManyToOne(() => User) user: Relation<User>;
  @ManyToOne(() => Promotion, { nullable: true }) promotion: Relation<Promotion> | null;
  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true }) items: Relation<OrderItem>[];
  @OneToMany('Payment', 'order') payments: Relation<Payment>[];
}

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn() id: number;
  @Column() orderId: number;
  @Column() productId: number;
  @Column({ type: 'enum', enum: Size }) size: Size;
  @Column('int') qty: number;
  @Column('int') unitPrice: number;
  @Column('int') lineTotal: number;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' }) order: Relation<Order>;
  @ManyToOne(() => Product) product: Relation<Product>;
  @OneToMany(() => OrderItemTopping, (t) => t.orderItem, { cascade: true }) toppings: Relation<OrderItemTopping>[];
}

@Entity()
export class OrderItemTopping {
  @PrimaryGeneratedColumn() id: number;
  @Column() orderItemId: number;
  @Column() toppingId: number;
  // giá topping tại thời điểm mua
  @Column('int') price: number;
  @ManyToOne(() => OrderItem, (i) => i.toppings, { onDelete: 'CASCADE' }) orderItem: Relation<OrderItem>;
  @ManyToOne(() => Topping) topping: Relation<Topping>;
}
