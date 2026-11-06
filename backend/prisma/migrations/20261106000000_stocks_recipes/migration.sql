-- Kho nguyên liệu + công thức (thay tồn kho theo từng món).
-- Tạo đơn: giữ chỗ (reserved). Đơn COMPLETED: trừ thật (quantity). Đơn CANCELLED: trả chỗ.

-- AlterTable
ALTER TABLE "products" DROP COLUMN "stock",
DROP COLUMN "version";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "stock_usage" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "stocks" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "low_threshold" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id"),
    -- Ràng buộc đặt ở DB: kho không âm, không giữ chỗ vượt số đang có
    CONSTRAINT "stocks_reserved_check" CHECK ("reserved" >= 0 AND "reserved" <= "quantity")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "topping_id" INTEGER,
    "size" VARCHAR(1),
    "stock_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recipes_quantity_check" CHECK ("quantity" > 0),
    -- Món: có product_id + size S/M/L. Topping: có topping_id, không có size.
    CONSTRAINT "recipes_owner_check" CHECK (
        ("product_id" IS NOT NULL AND "topping_id" IS NULL AND "size" IN ('S', 'M', 'L'))
        OR ("product_id" IS NULL AND "topping_id" IS NOT NULL AND "size" IS NULL)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "stocks_name_key" ON "stocks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_product_id_size_stock_id_key" ON "recipes"("product_id", "size", "stock_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_topping_id_stock_id_key" ON "recipes"("topping_id", "stock_id");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_topping_id_fkey" FOREIGN KEY ("topping_id") REFERENCES "toppings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
