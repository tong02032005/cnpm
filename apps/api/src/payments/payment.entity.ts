import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Order } from '../orders/order.entity';

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
}

export enum PaymentStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity()
export class Payment {
  @PrimaryGeneratedColumn() id: number;
  @Column() orderId: number;
  // unique ở DB: hai request cùng key chạy song song thì chỉ một request ghi được
  @Column({ unique: true }) idempotencyKey: string;
  @Column('int') amount: number;
  @Column({ type: 'enum', enum: PaymentMethod }) method: PaymentMethod;
  @Column({ type: 'enum', enum: PaymentStatus }) status: PaymentStatus;
  @CreateDateColumn() createdAt: Date;
  @ManyToOne(() => Order, (o) => o.payments) order: Relation<Order>;
}
