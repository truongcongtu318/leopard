# Kiến trúc deployment

## Môi trường

| Môi trường | Mục đích | Provider |
| --- | --- | --- |
| Local | Phát triển và test | Demo/local mặc định |
| Staging | UAT và pilot | Provider thật hoặc demo có cờ rõ ràng |

## Thành phần staging

- Next.js web service.
- NestJS API + Socket.IO service.
- Managed PostgreSQL có PostGIS.
- S3-compatible object storage.
- Reverse proxy/TLS và centralized log.

## Cấu hình

Environment phải có `DATABASE_URL`, JWT keys, origins, provider mode và credential tương ứng. Startup phải fail-fast nếu chọn provider thật nhưng thiếu credential. `/health/live` kiểm tra process; `/health/ready` kiểm tra database và cấu hình bắt buộc.

## Release

1. Tạo `release/<version>` từ `develop` và hoàn tất UAT.
2. Merge release PR vào `main`, tạo version tag và build immutable image theo commit SHA.
3. Backup database trước migration có thay đổi dữ liệu.
4. Chạy migration một lần rồi deploy API và Web.
5. Chạy smoke test login, create order, accept order và health.
6. Rollback image khi smoke test lỗi; migration phải có kế hoạch forward-fix hoặc rollback đã duyệt.
7. Đồng bộ `main` trở lại `develop` sau release hoặc hotfix.

## Pilot operations tối thiểu

- Backup database hằng ngày, retention 7 ngày.
- Alert khi readiness lỗi liên tục 5 phút hoặc error rate vượt 5% trong 10 phút.
- Không lưu upload vào filesystem tạm của container ở staging.
