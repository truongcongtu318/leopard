# Test strategy

## Mục tiêu

Tập trung rủi ro vào authorization, order lifecycle, concurrent acceptance, tracking, provider fallback, upload và payment confirmation.

## Test pyramid

- Unit: state machine, pricing/ETA demo, permission policy và validation thuần.
- Integration: NestJS module với test database, Prisma transaction, provider adapter fake và Socket gateway.
- E2E: luồng theo role qua UI/API ở staging-like environment.
- UAT: Product Owner/Admin thực hiện kịch bản nghiệp vụ.

## Môi trường và dữ liệu

Test database tách biệt, migrate từ đầu và seed xác định. External provider được mock trong CI; staging có smoke test provider thật riêng khi credential tồn tại.

## Gate

- PR: lint, typecheck, unit và integration liên quan.
- Merge/release: toàn bộ unit/integration, E2E P0, build và regression checklist.
- Không bỏ qua test authorization vì UI đã ẩn action.
