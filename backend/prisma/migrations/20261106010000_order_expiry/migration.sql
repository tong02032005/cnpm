-- Hạn thanh toán của đơn: quá hạn mà vẫn PENDING / PAYMENT_FAILED thì tự chuyển CANCELLED và trả nguyên liệu.

-- AlterTable (đơn cũ: hạn = lúc tạo + 15 phút)
ALTER TABLE "orders" ADD COLUMN "expires_at" TIMESTAMP(6);
UPDATE "orders" SET "expires_at" = "created_at" + INTERVAL '15 minutes';
ALTER TABLE "orders" ALTER COLUMN "expires_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");
