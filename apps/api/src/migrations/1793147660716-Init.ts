import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1793147660716 implements MigrationInterface {
    name = 'Init1793147660716'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying NOT NULL DEFAULT '', "basePrice" integer NOT NULL, "imageUrl" character varying NOT NULL, "stock" integer NOT NULL, "version" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."product_size_size_enum" AS ENUM('S', 'M', 'L')`);
        await queryRunner.query(`CREATE TABLE "product_size" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "size" "public"."product_size_size_enum" NOT NULL, "priceDelta" integer NOT NULL, CONSTRAINT "UQ_b1c5ec1a820eb17d1c17264cbd4" UNIQUE ("productId", "size"), CONSTRAINT "PK_3210db31599e5c505183be05896" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "topping" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "price" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_00dfdd569594e8162447ec4b629" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."promotion_type_enum" AS ENUM('PERCENT', 'FIXED')`);
        await queryRunner.query(`CREATE TABLE "promotion" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "type" "public"."promotion_type_enum" NOT NULL, "value" integer NOT NULL, "minOrder" integer NOT NULL DEFAULT '0', "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usageLimit" integer NOT NULL, "usedCount" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_969359329a22440d2b8f7d491d4" UNIQUE ("code"), CONSTRAINT "PK_fab3630e0789a2002f1cadb7d38" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('CUSTOMER', 'STAFF')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'CUSTOMER', "loyaltyPoints" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."loyalty_transaction_type_enum" AS ENUM('EARN')`);
        await queryRunner.query(`CREATE TABLE "loyalty_transaction" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "orderId" integer NOT NULL, "points" integer NOT NULL, "type" "public"."loyalty_transaction_type_enum" NOT NULL DEFAULT 'EARN', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_04407709971a5f1d7799eb17f0b" UNIQUE ("orderId"), CONSTRAINT "PK_bd11fc39ae5ebd6039fcb3cb1c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."order_status_enum" AS ENUM('PENDING', 'PAID', 'PAYMENT_FAILED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "order" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "status" "public"."order_status_enum" NOT NULL DEFAULT 'PENDING', "subtotal" integer NOT NULL, "discount" integer NOT NULL DEFAULT '0', "total" integer NOT NULL, "promotionId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."order_item_size_enum" AS ENUM('S', 'M', 'L')`);
        await queryRunner.query(`CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "productId" integer NOT NULL, "size" "public"."order_item_size_enum" NOT NULL, "qty" integer NOT NULL, "unitPrice" integer NOT NULL, "lineTotal" integer NOT NULL, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_item_topping" ("id" SERIAL NOT NULL, "orderItemId" integer NOT NULL, "toppingId" integer NOT NULL, "price" integer NOT NULL, CONSTRAINT "PK_f98dbbb753cde75327263aa9101" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payment_method_enum" AS ENUM('WALLET', 'CARD')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('SUCCEEDED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "payment" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "idempotencyKey" character varying NOT NULL, "amount" integer NOT NULL, "method" "public"."payment_method_enum" NOT NULL, "status" "public"."payment_status_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0c15152447734f98ae91cb945c2" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product_size" ADD CONSTRAINT "FK_013d7ffd083e76fcd6fe815017c" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loyalty_transaction" ADD CONSTRAINT "FK_de24c327654631a217ce7fa39be" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_caabe91507b3379c7ba73637b84" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order" ADD CONSTRAINT "FK_6a6e5cee4d0f7f9f624fe68bc7e" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_904370c093ceea4369659a3c810" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item_topping" ADD CONSTRAINT "FK_411d2475688192aed75f9f88547" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item_topping" ADD CONSTRAINT "FK_7369b472e4cc39a951fd1bfa5bc" FOREIGN KEY ("toppingId") REFERENCES "topping"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment" ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment" DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293"`);
        await queryRunner.query(`ALTER TABLE "order_item_topping" DROP CONSTRAINT "FK_7369b472e4cc39a951fd1bfa5bc"`);
        await queryRunner.query(`ALTER TABLE "order_item_topping" DROP CONSTRAINT "FK_411d2475688192aed75f9f88547"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_904370c093ceea4369659a3c810"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`);
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_6a6e5cee4d0f7f9f624fe68bc7e"`);
        await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "FK_caabe91507b3379c7ba73637b84"`);
        await queryRunner.query(`ALTER TABLE "loyalty_transaction" DROP CONSTRAINT "FK_de24c327654631a217ce7fa39be"`);
        await queryRunner.query(`ALTER TABLE "product_size" DROP CONSTRAINT "FK_013d7ffd083e76fcd6fe815017c"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method_enum"`);
        await queryRunner.query(`DROP TABLE "order_item_topping"`);
        await queryRunner.query(`DROP TABLE "order_item"`);
        await queryRunner.query(`DROP TYPE "public"."order_item_size_enum"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
        await queryRunner.query(`DROP TABLE "loyalty_transaction"`);
        await queryRunner.query(`DROP TYPE "public"."loyalty_transaction_type_enum"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "promotion"`);
        await queryRunner.query(`DROP TYPE "public"."promotion_type_enum"`);
        await queryRunner.query(`DROP TABLE "topping"`);
        await queryRunner.query(`DROP TABLE "product_size"`);
        await queryRunner.query(`DROP TYPE "public"."product_size_size_enum"`);
        await queryRunner.query(`DROP TABLE "product"`);
    }

}
