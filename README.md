# BrewLite – Assignment 1

Ứng dụng **đặt đồ uống và thanh toán không dùng tiền mặt**, môn Công nghệ Phần mềm (Agile Scrum, 3 Sprint, 10 task).

| Thành phần | Công nghệ |
| --- | --- |
| `frontend/` | Next.js 16, React 19, TailwindCSS 4, Zustand (giỏ hàng + đăng nhập) |
| `backend/` | NestJS 12, Prisma 7, class-validator, JWT, bcryptjs |
| Database | PostgreSQL 16 |
| Test | Vitest + Supertest (backend, chạy với PostgreSQL thật), `node:test` (frontend) |
| Đóng gói | Docker Compose: 3 service `db`, `backend`, `frontend` |

Luồng nghiệp vụ: **Xem menu → Chọn size/topping → Giỏ hàng → Đăng nhập → Đặt đơn → Thanh toán Ví/Thẻ → Xác nhận / Lịch sử đơn**.

## Mục lục

1. [Cách nhanh nhất: chạy bằng Docker](#1-cách-nhanh-nhất-chạy-bằng-docker)
2. [Tài khoản và dữ liệu mẫu](#2-tài-khoản-và-dữ-liệu-mẫu)
3. [Chạy khi đang phát triển (không dùng Docker cho code)](#3-chạy-khi-đang-phát-triển)
4. [Kiểm thử](#4-kiểm-thử)
5. [API](#5-api)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [10 task của Assignment 1](#7-10-task-của-assignment-1)
8. [Làm việc với database](#8-làm-việc-với-database)
9. [Lỗi thường gặp](#9-lỗi-thường-gặp)

---

## 1. Cách nhanh nhất: chạy bằng Docker

Cách này chạy được trên **mọi máy** (Windows, macOS, Linux). Bạn chỉ cần cài **Docker Desktop**, không cần cài Node.js hay PostgreSQL.

1. Cài [Docker Desktop](https://www.docker.com/products/docker-desktop/), mở nó lên và đợi dòng **Engine running**.
2. Mở terminal ở thư mục dự án (thư mục chứa file `docker-compose.yml`) rồi chạy:

   ```bash
   docker compose up --build
   ```

   Lần đầu mất khoảng 3–5 phút để tải và build. Backend sẽ tự **tạo bảng** và **thêm dữ liệu mẫu**.

3. Mở trình duyệt:
   - Web: **http://localhost:3000**
   - API: http://localhost:3001/products, kiểm tra sức khỏe tại http://localhost:3001/health

| Việc | Lệnh |
| --- | --- |
| Chạy ngầm, trả lại terminal | `docker compose up -d --build` |
| Xem log | `docker compose logs -f backend` |
| Dừng | `Ctrl + C` hoặc `docker compose down` |
| Chạy lại sau khi sửa code | `docker compose up --build` |
| Xóa sạch database rồi tạo lại | `docker compose down -v` rồi `docker compose up --build` |

**Trùng cổng?** Nếu báo `port is already allocated`, tức là máy bạn đang có chương trình khác dùng cổng 3000, 3001 hoặc 5432. Cách sửa: tạo file `.env` cạnh `docker-compose.yml` để đổi cổng.

```bash
# Windows PowerShell:  Copy-Item .env.example .env
cp .env.example .env
```

Sau đó sửa `WEB_PORT`, `API_PORT`, `DB_PORT` (ví dụ `4000`, `4001`, `5440`) rồi chạy lại `docker compose up --build`.

## 2. Tài khoản và dữ liệu mẫu

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| `demo@brewlite.local` | `demo123` | Khách hàng |
| `staff@brewlite.local` | `staff123` | Nhân viên (chuyển trạng thái pha chế) |

- **8 đồ uống:** Cà phê đen, Cà phê sữa, Bạc xỉu, Latte, Trà sữa trân châu, Trà đào, Matcha Latte, Chocolate đá. Mỗi món có 100 ly.
- **Size:** S giá gốc, M +5.000đ, L +10.000đ.
- **Topping:** Trân châu 7.000đ, Pudding 8.000đ, Kem cheese 10.000đ.
- **Mã khuyến mãi** `WELCOME10`: giảm 10% cho đơn từ 50.000đ.
- **Demo thanh toán lỗi:** ở trang thanh toán, tick ô **Giả lập thanh toán lỗi**.

**Thử vai nhân viên** đổi trạng thái đơn (PowerShell, thay số `1` bằng mã đơn):

```powershell
$t = (Invoke-RestMethod -Method Post http://localhost:3001/auth/login -ContentType "application/json" -Body '{"email":"staff@brewlite.local","password":"staff123"}').accessToken
Invoke-RestMethod -Method Patch http://localhost:3001/orders/1/status -Headers @{Authorization="Bearer $t"} -ContentType "application/json" -Body '{"status":"PREPARING"}'
```

Lần lượt đổi `PREPARING` → `READY` → `COMPLETED`. Trang xác nhận đơn của khách tự cập nhật mỗi 5 giây.

## 3. Chạy khi đang phát triển

Dùng khi bạn sửa code và muốn thấy kết quả ngay (hot reload). Cần cài **Node.js 22 trở lên** (kiểm tra bằng `node -v`) và Docker để chạy PostgreSQL.

**Bước 1 – Bật PostgreSQL.** Chỉ chạy service `db`:

```bash
docker compose up -d db
```

**Bước 2 – Chạy backend.** Mở terminal thứ nhất:

```bash
cd backend
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm install                 # tự chạy "prisma generate"
npm run db:migrate          # tạo bảng
npm run db:seed             # thêm dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn)
npm run start:dev           # API: http://localhost:3001
```

**Bước 3 – Chạy frontend.** Mở terminal thứ hai:

```bash
cd frontend
npm install
npm run dev                 # Web: http://localhost:3000
```

Nếu backend không chạy ở cổng 3001, tạo file `frontend/.env.local` với nội dung `NEXT_PUBLIC_API_URL=http://localhost:<cổng>`.

> **Lưu ý:** backend dùng lệnh `npm run start:dev`, frontend dùng lệnh `npm run dev`. Chỉ một chương trình được dùng mỗi cổng: nếu `docker compose up` đang chạy cả hệ thống thì phải dừng nó trước (`docker compose down`, rồi `docker compose up -d db` để bật lại riêng DB).

## 4. Kiểm thử

```bash
# Backend
cd backend
npm test                    # unit test: state machine, tính giá, khuyến mãi
npm run test:e2e            # integration test với PostgreSQL thật (cần DB đang chạy)
npm run lint
npm run build

# Frontend
cd frontend
npm test                    # unit test tính giá
npm run lint
npm run build
```

`npm run test:e2e` dùng database **`brewlite_test`** (đặt trong `TEST_DATABASE_URL`). Database này bị **xóa sạch** mỗi lần chạy. Chỉ cần tạo nó một lần:

```bash
docker compose exec db createdb -U brewlite brewlite_test
```

| Mã | Nội dung kiểm thử | File |
| --- | --- | --- |
| UNIT-T01 | Tính giá size/topping, khuyến mãi (hết hạn, hết lượt, đơn tối thiểu), điểm thưởng | `backend/src/orders/pricing.spec.ts` |
| UNIT-T02 | **(a)** State machine chặn chuyển trạng thái sai | `backend/src/orders/order-state.spec.ts` |
| API-T01 | `GET /products` 8 món, phản hồi < 500ms; chi tiết; 404; 400 | `backend/test/products.e2e-spec.ts` |
| INT-T01 | Đăng ký, đăng nhập, JWT, email trùng 409, sai mật khẩu 401, guard | `backend/test/auth.e2e-spec.ts` |
| INT-T02 | Tạo đơn PENDING, backend tự tính giá, validate dữ liệu sai 400, mã khuyến mãi | `backend/test/orders.e2e-spec.ts` |
| INT-T03 | **(b)** Gửi lặp và gửi song song cùng `Idempotency-Key` chỉ tạo 1 giao dịch | `backend/test/payments.e2e-spec.ts` |
| INT-T04 | **(c)** 20 khách đặt cùng lúc khi còn 5 ly: đúng 5 đơn thành công, kho về 0 | `backend/test/orders.e2e-spec.ts` |
| INT-T05 | Thanh toán lỗi rồi thanh toán lại, điểm thưởng cộng 1 lần, hủy đơn đã trả (hoàn tiền, hoàn kho, thu hồi điểm), phân quyền STAFF | `backend/test/payments.e2e-spec.ts` |
| FE-T01 | Tính giá trên trình duyệt, tổng giỏ hàng | `frontend/lib/pricing.test.ts` |

## 5. API

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | `/health` | – | Kiểm tra API + DB |
| GET | `/products` | – | Menu |
| GET | `/products/:id` | – | Chi tiết + size + topping |
| POST | `/auth/register` | – | Đăng ký, trả JWT |
| POST | `/auth/login` | – | Đăng nhập, trả JWT |
| GET | `/auth/me` | JWT | Thông tin tài khoản + điểm thưởng |
| POST | `/promotions/validate` | – | Xem trước số tiền giảm của mã |
| POST | `/orders` | JWT | Tạo đơn PENDING, trừ tồn kho |
| GET | `/orders/me` | JWT | Lịch sử đơn của tôi |
| GET | `/orders/:id` | JWT (chủ đơn hoặc STAFF) | Chi tiết đơn |
| PATCH | `/orders/:id/status` | STAFF; khách chỉ được hủy | Đổi trạng thái theo state machine |
| POST | `/payments` | JWT + header `Idempotency-Key` | Thanh toán Ví/Thẻ (mô phỏng) |

Ví dụ tạo đơn:

```json
POST /orders
Authorization: Bearer <token>
{ "items": [{ "productId": 4, "size": "M", "quantity": 2, "toppingIds": [1] }], "promoCode": "WELCOME10" }
```

## 6. Cấu trúc thư mục

```
├── docker-compose.yml          # db + backend + frontend
├── .env.example                # đổi cổng khi chạy Docker (tùy chọn)
├── backend/
│   ├── Dockerfile
│   ├── prisma.config.ts        # cấu hình Prisma 7 (đọc DATABASE_URL)
│   ├── prisma/
│   │   ├── schema.prisma       # mô hình dữ liệu
│   │   └── migrations/         # SQL tạo bảng (chạy bằng npm run db:migrate)
│   ├── src/
│   │   ├── auth/               # đăng ký, đăng nhập, JWT guard (Task 7)
│   │   ├── products/           # menu, chi tiết (Task 2)
│   │   ├── orders/             # tạo đơn, state machine, tính giá, tồn kho (Task 6, 10)
│   │   ├── payments/           # thanh toán idempotent, cổng mô phỏng (Task 8, 10)
│   │   ├── promotions/         # kiểm tra mã khuyến mãi (Task 10)
│   │   ├── prisma/             # kết nối DB
│   │   ├── seed.ts             # dữ liệu mẫu
│   │   └── main.ts
│   └── test/                   # integration test
└── frontend/
    ├── Dockerfile
    ├── app/                    # các trang: /, /products/[id], /cart, /login, /checkout, /orders, /orders/[id]
    ├── components/             # Header (badge giỏ hàng), UI dùng chung
    ├── lib/                    # api.ts, store.ts (Zustand), pricing.ts
    └── public/products/        # ảnh đồ uống
```

## 7. 10 task của Assignment 1

| # | Task | Ở đâu |
| --- | --- | --- |
| 1 | Khởi tạo dự án: frontend + backend chạy được, README, Git, `.env.example` | toàn repo |
| 2 | API danh sách sản phẩm `GET /products` (+ `GET /products/:id`) | `backend/src/products/` |
| 3 | Trang Menu: lưới sản phẩm, loading / empty / lỗi | `frontend/app/page.tsx` |
| 4 | Chi tiết sản phẩm: chọn size S/M/L, topping, giá cập nhật ngay | `frontend/app/products/[id]/page.tsx`, `frontend/lib/pricing.ts` |
| 5 | Giỏ hàng: thêm/sửa/xóa, Zustand lưu trong trình duyệt, tổng tiền, badge | `frontend/lib/store.ts`, `frontend/app/cart/` |
| 6 | API tạo đơn `POST /orders`: validate, đơn PENDING, trả mã đơn | `backend/src/orders/` |
| 7 | Đăng ký / đăng nhập: bcrypt, JWT, guard bảo vệ route đặt đơn | `backend/src/auth/`, `frontend/app/login/` |
| 8 | Thanh toán không tiền mặt: Ví/Thẻ mô phỏng, PAID hoặc PAYMENT_FAILED, giữ giỏ khi lỗi | `backend/src/payments/`, `frontend/app/checkout/` |
| 9 | Xác nhận đơn, lịch sử `GET /orders/me`, docker-compose 3 service, README | `frontend/app/orders/`, `docker-compose.yml` |
| 10 | Nghiệp vụ backend (xem bên dưới) | `backend/src/orders/`, `backend/src/payments/` |

**Task 10 – chi tiết:**

- **(a) State machine** (`orders/order-state.ts`): `PENDING → PAID → PREPARING → READY → COMPLETED`; `PENDING → PAYMENT_FAILED → PAID` (thanh toán lại); có thể hủy (`CANCELLED`) từ PENDING, PAYMENT_FAILED hoặc PAID. Mọi lần đổi trạng thái đều qua `assertTransition`, chuyển sai trả **409**.
- **(b) Thanh toán idempotent** (`payments/payments.service.ts`): header `Idempotency-Key` được lưu với ràng buộc UNIQUE trong DB. Gửi lại cùng key chỉ trả kết quả cũ. Dòng đơn bị khóa (`SELECT … FOR UPDATE`) nên hai request khác key cũng không trừ tiền hai lần.
- **(c) Tồn kho khi đặt đồng thời** (`orders/orders.service.ts`): trừ kho trong transaction bằng **optimistic locking** (cột `version`), và trừ theo thứ tự `productId` để tránh deadlock. Đặt quá số còn lại trả **409**.
- **(d) Khuyến mãi + điểm thưởng:** kiểm tra hạn, lượt dùng và đơn tối thiểu. Lượt dùng được giữ bằng `UPDATE … WHERE used_count < usage_limit` nên không vượt giới hạn. Cộng **1 điểm cho mỗi 10.000đ** khi đơn PAID. Hủy đơn đã trả thì hoàn tiền, hoàn kho, thu hồi điểm và trả lượt mã.

## 8. Làm việc với database

| Thông tin kết nối | Giá trị |
| --- | --- |
| Host / Port | `localhost` / `5432` (hoặc `DB_PORT` trong `.env`) |
| Database | `brewlite` |
| User / Password | `brewlite` / `brewlite` |

```bash
docker compose exec db psql -U brewlite -d brewlite   # vào psql, gõ \dt để xem bảng, \q để thoát
cd backend && npx prisma studio                         # xem/sửa dữ liệu trên trình duyệt: http://localhost:5555
```

**Đổi cấu trúc bảng:** sửa `backend/prisma/schema.prisma`, chạy `npx prisma migrate dev --name ten_thay_doi`, rồi commit thư mục `prisma/migrations`. **Không** sửa bảng bằng tay trong DB.

**Tiền** lưu bằng số nguyên VND. Backend luôn tự tính lại giá, không tin giá do client gửi lên.

## 9. Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `port is already allocated` / `EADDRINUSE` | Cổng 3000/3001/5432 đang bị chương trình khác dùng | Tắt chương trình đó, hoặc đổi cổng trong `.env` (mục 1) |
| `npm error Missing script: "dev"` ở backend | Backend dùng lệnh khác | `npm run start:dev` |
| API trả `500 Internal server error` | DB chưa bật hoặc chưa tạo bảng | `docker compose up -d db` → `npm run db:migrate` → `npm run db:seed` |
| Web báo *Không kết nối được máy chủ* | Backend chưa chạy hoặc khác cổng | Mở http://localhost:3001/health; sửa `NEXT_PUBLIC_API_URL` |
| `Can't reach database server` | Sai `DATABASE_URL` trong `backend/.env` | Kiểm tra cổng/mật khẩu khớp với DB đang chạy |
| Docker báo *Virtual Machine Platform is not enabled* | Ảo hóa Windows đang tắt | PowerShell (Admin): `bcdedit /set hypervisorlaunchtype auto` rồi khởi động lại |
| `'docker' is not recognized` | Chưa cài hoặc chưa mở Docker Desktop | Cài Docker Desktop, mở lại terminal |
