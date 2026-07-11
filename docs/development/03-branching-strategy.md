# Branching strategy

## Mô hình

- `main` chỉ chứa phiên bản ổn định đã phát hành; không commit hoặc push trực tiếp.
- `develop` là nhánh tích hợp mặc định cho phiên bản tiếp theo.
- `feature/*`, `fix/*`, `docs/*` và `refactor/*` tách từ `develop` và merge lại `develop` qua Pull Request.
- `release/<version>` tách từ `develop`, merge vào `main`, tạo tag rồi đồng bộ trở lại `develop`.
- `hotfix/*` tách từ `main` và phải merge vào cả `main` lẫn `develop`.
- Codex branch dùng `codex/<type>-<short-name>`, tách từ `develop` và mở PR vào `develop`.

## Pull request

- PR feature/fix/docs/refactor mặc định nhắm vào `develop`; PR release/hotfix mới được nhắm vào `main`.
- Một PR cho một story hoặc vertical slice nhỏ.
- PR mô tả goal, thay đổi, kiểm thử, ảnh UI nếu có và migration impact.
- Ít nhất một reviewer; tác giả tự review diff trước.
- Không merge khi CI lỗi, acceptance criteria chưa đạt hoặc có P0/P1 security issue.
- `main` và `develop` phải bật branch protection, chặn direct push và force push.

## Commit

Commit nhỏ, có thể review, theo dạng `type(scope): summary`, ví dụ `feat(order): enforce status transitions`. Không force-push sau khi review nếu không báo reviewer.

Quy trình chi tiết, release, hotfix và PR checklist nằm trong `CONTRIBUTING.md` ở thư mục gốc.
