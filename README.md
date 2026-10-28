# BrewLite

Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt. Một codebase dùng chung cho **Assignment 1** (Scrum, 10 task) và **Assignment 2** (Requirements → Deployment) môn Công nghệ Phần mềm.

| Thành phần | Công nghệ |
| --- | --- |
| Frontend `apps/web` | Next.js 15 (App Router, mobile-first, PWA manifest), TailwindCSS, Zustand |
| Backend `apps/api` | NestJS 11, TypeORM, class-validator, JWT, bcrypt |
| CSDL | PostgreSQL 16, migration bằng TypeORM |
| Test | Jest + Supertest (API, chạy với PostgreSQL thật), Vitest (web), Playwright (E2E) |
| CI/CD | GitHub Actions, GitHub Container Registry, Render (API + DB), Vercel (web) |

## Cấu trúc

```
brewlite/
├── apps/
│   ├── api/                 # NestJS
│   │   ├── src/
│   │   │   ├── auth/        # đăng ký, đăng nhập, JWT guard
│   │   │   ├── products/    # menu, size, topping
│   │   │   ├── orders/      # tạo đơn, state machine, tính giá
│   │   │   ├── payments/    # thanh toán idempotent, cổng mô phỏng
│   │   │   ├── promotions/  # mã khuyến mãi
│   │   │   ├── users/       # thông tin + điểm thưởng
│   │   │   ├── migrations/  # migration TypeORM
│   │   │   └── seed.ts      # dữ liệu mẫu
│   │   └── test/            # integration test
│   └── web/                 # Next.js
├── tests/e2e/               # Playwright
├── .github/workflows/       # ci.yml, cd.yml
├── docker-compose.yml
└── .env.example
```

## Chạy nhanh bằng Docker

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3001/health

## Chạy local không dùng Docker

Cần Node 22, pnpm 10 (`corepack enable`) và PostgreSQL 16.

```bash
pnpm install
createdb brewlite                    # hoặc tạo database bằng công cụ khác
cp .env.example apps/api/.env        # sửa DATABASE_URL nếu cần
echo "NEXT_PUBLIC_API_URL=https://localhost:3001" > apps/web/.env.local

pnpm --filter api migrate            # tạo bảng
pnpm --filter api seed               # 8 đồ uống, 3 topping, tài khoản mẫu, mã WELCOME10
pnpm --filter web dev                # lần đầu: tạo chứng chỉ HTTPS vào apps/web/certificates, rồi Ctrl+C
pnpm dev                             # API https://localhost:3001 và web https://localhost:3000
```

Chứng chỉ local do mkcert (Next.js tự tải) tạo ra; lần đầu Windows/macOS sẽ hỏi cho phép cài CA, hãy đồng ý. Muốn chạy API bằng HTTP thì bỏ `SSL_KEY`/`SSL_CERT` trong `apps/api/.env` và đổi các URL về `http://`.

### Tài khoản mẫu (từ seed)

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| `demo@brewlite.local` | `demo123` | Khách hàng |
| `staff@brewlite.local` | `staff123` (đổi bằng biến `SEED_STAFF_PASSWORD`) | Nhân viên |

Mã khuyến mãi mẫu: `WELCOME10`, giảm 10% cho đơn từ 50.000đ.

## Kiểm thử

```bash
createdb brewlite_test               # database riêng cho test, bị xóa sạch mỗi lần chạy
pnpm lint
pnpm test                            # unit + integration (API), unit (web)
pnpm build
pnpm e2e                             # Playwright; cần build trước và DB dev đã migrate + seed
```

Integration test đọc `TEST_DATABASE_URL` (mặc định `postgresql://brewlite:brewlite@localhost:5432/brewlite_test`).

| Mã | Nội dung | File |
| --- | --- | --- |
| UNIT-T01 | Tính giá size/topping/khuyến mãi, điểm thưởng | `apps/api/src/orders/pricing.spec.ts` |
| UNIT-T02 | State machine chặn chuyển trạng thái sai (A1 Task 10a) | `apps/api/src/orders/order-state.spec.ts` |
| API-T01, API-T02 | Menu, chi tiết, 404, health | `apps/api/test/products.int.spec.ts` |
| INT-T01, INT-T02 | Đăng ký/đăng nhập, JWT, tạo đơn và validate | `apps/api/test/orders.int.spec.ts` |
| INT-T03 | Cùng Idempotency-Key gửi lặp và gửi song song chỉ tạo 1 giao dịch (A1 Task 10b) | `apps/api/test/payments.int.spec.ts` |
| INT-T04 | 20 khách đặt cùng lúc khi còn 5 ly, đúng 5 đơn thành công (A1 Task 10c) | `apps/api/test/orders.int.spec.ts` |
| INT-T05 | Cộng điểm đúng một lần; hủy đơn PAID thu hồi điểm, hoàn tiền; mã không vượt lượt; STAFF không tự đặt PAID | `apps/api/test/payments.int.spec.ts` |
| E2E-T01 | Menu → giỏ → đăng ký → thanh toán → xác nhận; nhánh thanh toán lỗi và thử lại | `tests/e2e/checkout.spec.ts` |

## API

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | `/health` | – | Kiểm tra API và DB, trả `version` = commit SHA |
| GET | `/products` | – | Menu |
| GET | `/products/:id` | – | Chi tiết, size, topping |
| POST | `/auth/register` | – | Đăng ký, trả JWT |
| POST | `/auth/login` | – | Đăng nhập, trả JWT |
| GET | `/users/me` | JWT | Thông tin, điểm thưởng |
| POST | `/promotions/validate` | – | Xem trước số tiền giảm |
| POST | `/orders` | JWT | Tạo đơn PENDING, trừ tồn kho |
| GET | `/orders/me` | JWT | Lịch sử đơn |
| GET | `/orders/:id` | JWT (chủ đơn hoặc STAFF) | Chi tiết đơn |
| PATCH | `/orders/:id/status` | STAFF; khách chỉ được hủy | Chuyển trạng thái theo state machine |
| POST | `/payments` | JWT + header `Idempotency-Key` | Thanh toán Ví/Thẻ mô phỏng |

### Nghiệp vụ chính (A1 Task 10)

- **State machine** (`orders/order-state.ts`): PENDING → PAID → PREPARING → READY → COMPLETED; PENDING ⇄ PAYMENT_FAILED; hủy được từ PENDING, PAYMENT_FAILED, PAID. PAID/PAYMENT_FAILED chỉ do thanh toán đặt; STAFF chỉ chuyển PREPARING/READY/COMPLETED/CANCELLED; khách chỉ được hủy. Hủy đơn thì hoàn tồn kho; hủy đơn đã PAID thì đánh dấu payment `REFUNDED`, thu hồi điểm và trả lượt dùng mã.
- **Thanh toán idempotent** (`payments/payments.service.ts`): `Idempotency-Key` unique trong DB; gửi lại cùng key trả nguyên kết quả cũ. Dòng đơn được khóa nên hai key khác nhau cũng không trả tiền hai lần.
- **Tồn kho khi đặt đồng thời** (`orders/orders.service.ts`): transaction + optimistic locking bằng cột `version`, tối đa 10 lần thử lại. Tồn kho tính theo sản phẩm (`Product.stock`).
- **Khuyến mãi và điểm thưởng**: kiểm tra hạn và đơn tối thiểu khi tạo đơn; lượt dùng được giữ bằng `UPDATE ... WHERE usedCount < usageLimit` ngay lúc thanh toán nên không vượt giới hạn. Cộng 1 điểm cho mỗi 10.000đ khi đơn chuyển PAID.
- **Cổng thanh toán mô phỏng**: luôn thành công, trừ khi gửi `simulateFailure: true` (ô "Giả lập thanh toán lỗi" trên màn hình thanh toán).

## CI/CD

- **`ci.yml`** chạy khi mở pull request: install → lint → test (có PostgreSQL) → build → E2E. Bật *Settings → Branches → Require status checks* cho `main` để PR lỗi không merge được.
- **`cd.yml`** chạy khi push lên `main` hoặc tag `v*`: chạy lại CI → build image API (tag `sha-<commit>` và version) → push GHCR → gọi deploy hook Render → smoke test `/health` (đợi đúng commit SHA mới) và `/products` → gắn tag `:prod` cho image vừa qua smoke test. Nếu smoke test lỗi, pipeline dừng và tự deploy lại image `:prod` (bản tốt gần nhất).

### Thiết lập production (làm một lần)

1. **Render PostgreSQL**: tạo database, chỉ dùng *Internal Database URL* (không mở public).
2. **Render Web Service** chạy từ image `ghcr.io/<owner>/<repo>-api:sha-<commit>`:
   - Nếu package GHCR để private, thêm registry credential (GitHub token có quyền `read:packages`).
   - Biến môi trường: `DATABASE_URL` (internal URL), `JWT_SECRET` (chuỗi ngẫu nhiên dài), `CORS_ORIGIN` (URL web trên Vercel).
   - Health check path: `/health`. Container tự chạy migration trước khi khởi động.
   - Seed dữ liệu lần đầu: mở Shell của service, chạy `SEED_STAFF_PASSWORD=<mật khẩu mạnh> node dist/seed.js`.
3. **GitHub → Settings → Environments → `production`**:
   - Secret `RENDER_DEPLOY_HOOK`: deploy hook URL của service Render.
   - Variable `API_URL`: URL HTTPS của API, ví dụ `https://brewlite-api.onrender.com`.
4. **Vercel**: import repo, Root Directory `apps/web`, biến `NEXT_PUBLIC_API_URL` = URL API. Vercel tự deploy mỗi lần push.

Secret chỉ nằm trong GitHub Secrets/Render/Vercel, không commit vào repo.

### Rollback thủ công

- **API**: Render → service → *Deploys*, chọn bản trước rồi *Redeploy*; hoặc gọi lại deploy hook với image cũ:
  `curl -X POST "$RENDER_DEPLOY_HOOK&imgURL=ghcr.io/<owner>/<repo>-api:sha-<commit cũ>"`
- **Web**: Vercel → *Deployments*, chọn bản trước → *Promote to Production*.
- Migration chỉ thêm bảng/cột, không xóa trong cùng một bản phát hành, nên image cũ vẫn chạy được với DB mới.

## Phát hành

- Assignment 1: tag `a1-final`.
- Assignment 2: tag `v1.0.0` và GitHub Release kèm release notes.

## Ghi chú so với tài liệu hướng dẫn

- Dùng **TypeORM** thay cho Prisma (A1 cho phép cả hai). Cập nhật ADR-002 và các chỗ nhắc `prisma migrate deploy` trong tài liệu nhóm cho khớp.
- Mã đơn hiển thị là `#<id>`, không có cột `code` riêng.
- Đơn bỏ dở: web tự hủy đơn cũ khi khách sửa giỏ, nhưng chưa có job tự hủy đơn PENDING quá hạn ở backend. Nên bổ sung nếu còn thời gian.
- Vai trò người dùng được đọc lại từ DB mỗi request, nên đổi quyền hay xóa tài khoản có hiệu lực ngay.
- Thư mục `docs/` (SRS, sơ đồ, ADR, ma trận truy vết – A2 Task 1–3) cần được commit **trước** code để đúng quy tắc tuần tự của Assignment 2.
