# Coding standards

## TypeScript

- Bật strict mode; không dùng `any` nếu không có lý do được ghi rõ.
- DTO/schema tại boundary; domain/application code không nhận object tùy ý.
- Enum và contract dùng chung nằm trong `packages/shared` khi không phụ thuộc framework.
- Tên biến và code bằng tiếng Anh; UI copy và tài liệu bằng tiếng Việt.

## Backend

- Controller mỏng, service sở hữu business rule, repository/Prisma query có scope rõ.
- Authorization và ownership kiểm tra phía API.
- Provider SDK chỉ xuất hiện trong adapter implementation.
- Error code ổn định; không trả stack trace cho client.

## Frontend

- Server state qua một query abstraction thống nhất; không nhân bản business rule backend.
- Component theo design system và hỗ trợ keyboard/focus.
- Form dùng schema validation đồng bộ với API contract ở mức có thể.
- Mọi màn hình có đầy đủ UI states trước khi merge.

## Chung

- Comment giải thích quyết định khó, không diễn giải dòng code hiển nhiên.
- Không refactor ngoài phạm vi story.
- Không log secret, token, phone đầy đủ hoặc địa chỉ chi tiết.
