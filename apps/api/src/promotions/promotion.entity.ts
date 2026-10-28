import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity()
export class Promotion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) code: string;
  @Column({ type: 'enum', enum: PromotionType }) type: PromotionType;
  @Column('int') value: number;
  @Column('int', { default: 0 }) minOrder: number;
  @Column('timestamptz') startsAt: Date;
  @Column('timestamptz') endsAt: Date;
  @Column('int') usageLimit: number;
  @Column('int', { default: 0 }) usedCount: number;
  @Column({ default: true }) isActive: boolean;
}
