import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';

export enum Role {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
}

export enum LoyaltyType {
  EARN = 'EARN',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) email: string;
  @Column() passwordHash: string;
  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER }) role: Role;
  @Column('int', { default: 0 }) loyaltyPoints: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity()
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn() id: number;
  @Column() userId: number;
  // unique: mỗi đơn chỉ được cộng điểm một lần
  @Column({ unique: true }) orderId: number;
  @Column('int') points: number;
  @Column({ type: 'enum', enum: LoyaltyType, default: LoyaltyType.EARN }) type: LoyaltyType;
  @CreateDateColumn() createdAt: Date;
  @ManyToOne(() => User) user: Relation<User>;
}
