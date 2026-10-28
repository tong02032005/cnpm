import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentRefunded1793148516531 implements MigrationInterface {
    name = 'PaymentRefunded1793148516531'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."payment_status_enum" RENAME TO "payment_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('SUCCEEDED', 'FAILED', 'REFUNDED')`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "status" TYPE "public"."payment_status_enum" USING "status"::"text"::"public"."payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum_old" AS ENUM('SUCCEEDED', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "status" TYPE "public"."payment_status_enum_old" USING "status"::"text"::"public"."payment_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_status_enum_old" RENAME TO "payment_status_enum"`);
    }

}
