import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Relation, Unique } from 'typeorm';

export enum Size {
  S = 'S',
  M = 'M',
  L = 'L',
}

@Entity()
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ default: '' }) description: string;
  @Column('int') basePrice: number;
  @Column() imageUrl: string;
  @Column('int') stock: number;
  // Optimistic locking: mỗi lần trừ tồn kho tăng version (xem OrdersService.reserveStock)
  @Column('int', { default: 0 }) version: number;
  @Column({ default: true }) isActive: boolean;
  @OneToMany(() => ProductSize, (s) => s.product, { cascade: true }) sizes: Relation<ProductSize>[];
}

@Entity()
@Unique(['productId', 'size'])
export class ProductSize {
  @PrimaryGeneratedColumn() id: number;
  @Column() productId: number;
  @Column({ type: 'enum', enum: Size }) size: Size;
  @Column('int') priceDelta: number;
  @ManyToOne(() => Product, (p) => p.sizes, { onDelete: 'CASCADE' }) product: Relation<Product>;
}

@Entity()
export class Topping {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column('int') price: number;
  @Column({ default: true }) isActive: boolean;
}
