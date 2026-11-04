/** Lỗi vi phạm ràng buộc UNIQUE của Prisma (P2002), vd: email trùng, Idempotency-Key trùng. */
export const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
