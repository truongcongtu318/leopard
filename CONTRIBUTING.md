# Đóng góp cho LEOPARD

Cảm ơn bạn đã đóng góp cho LEOPARD. Dự án sử dụng Git Flow rút gọn: mọi thay đổi được phát triển trên nhánh riêng, tích hợp qua `develop` và chỉ phát hành phiên bản ổn định lên `main`.

## Quy tắc nhánh

| Nhánh | Mục đích | Tách từ | Merge vào |
| --- | --- | --- | --- |
| `main` | Phiên bản ổn định đã phát hành | Không áp dụng | Không merge trực tiếp từ feature |
| `develop` | Nhánh tích hợp cho phiên bản tiếp theo | `main` | `main` qua release PR |
| `feature/<issue>-<name>` | Tính năng hoặc vertical slice | `develop` | `develop` |
| `fix/<issue>-<name>` | Sửa lỗi chưa phát hành | `develop` | `develop` |
| `docs/<issue>-<name>` | Thay đổi tài liệu | `develop` | `develop` |
| `refactor/<issue>-<name>` | Refactor không đổi behavior | `develop` | `develop` |
| `release/<version>` | Ổn định release candidate | `develop` | `main` và quay lại `develop` |
| `hotfix/<version>-<name>` | Sửa khẩn cấp bản đang phát hành | `main` | `main` và `develop` |

Không commit hoặc push trực tiếp lên `main` và `develop`. Hai nhánh phải được bảo vệ trên Git hosting.

## Bắt đầu một thay đổi

Đồng bộ `develop` rồi tạo nhánh mới:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/LEO-123-create-order
```

Thay `feature` bằng `fix`, `docs` hoặc `refactor` theo mục đích. Agent Codex dùng `codex/<type>-<short-name>`, tách từ `develop` và vẫn mở PR vào `develop`.

Không trộn nhiều story độc lập trong một nhánh. Nếu phát hiện thay đổi ngoài phạm vi, tách sang issue và branch khác.

## Commit convention

Commit theo Conventional Commits:

```text
<type>(<scope>): <summary>
```

Các `type` được chấp nhận: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`.

Ví dụ:

```text
feat(order): enforce valid status transitions
fix(auth): revoke rotated refresh sessions
docs(workflow): define release branch process
```

Summary viết ở thể mệnh lệnh, ngắn gọn, không có dấu chấm cuối. Commit phải nhỏ, có một mục đích rõ và không chứa generated file hoặc refactor không liên quan.

## Chuẩn bị Pull Request

Trước khi mở PR:

1. Rebase nhánh lên `origin/develop` và xử lý conflict trên nhánh của bạn.
2. Chạy lint, typecheck, test và build phù hợp với phạm vi.
3. Tự review toàn bộ diff và loại bỏ secret hoặc thay đổi ngoài phạm vi.
4. Cập nhật API, data, UI hoặc setup docs nếu behavior thay đổi.
5. Xác nhận acceptance criteria và Definition of Done.

```bash
git fetch origin
git rebase origin/develop
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git push --force-with-lease
```

Chỉ dùng `--force-with-lease` cho nhánh cá nhân sau rebase; không force-push nhánh dùng chung.

## Nội dung Pull Request

PR phải nhắm vào `develop` và bao gồm:

- Issue/story liên quan và mục tiêu thay đổi.
- Tóm tắt behavior, API/schema/migration impact.
- Các lệnh kiểm thử đã chạy và kết quả.
- Ảnh hoặc video cho UI thay đổi ở mobile và desktop.
- Rủi ro, giới hạn hoặc bước vận hành cần lưu ý.
- Checklist acceptance criteria và tài liệu đã cập nhật.

Một PR cần ít nhất một approval, CI thành công và không còn comment blocking trước khi merge. Ưu tiên squash merge để lịch sử `develop` rõ ràng; tên squash commit phải theo commit convention.

## Review checklist

Reviewer tập trung vào correctness, authorization/ownership, transaction, data migration, provider failure, UI states và test coverage. Checklist đầy đủ nằm tại `docs/development/06-code-review-checklist.md`.

Tác giả không tự merge khi reviewer chưa duyệt. Thay đổi được yêu cầu sau review phải được phản hồi hoặc xử lý rõ ràng, không chỉ đánh dấu conversation là resolved.

## Release lên `main`

Với release thông thường:

1. Tạo `release/<version>` từ `develop` khi phạm vi release đã đóng.
2. Chỉ cho phép sửa release notes, version, migration issue và release blocker trên nhánh này.
3. Mở PR từ `release/<version>` vào `main`; yêu cầu CI, UAT và approval.
4. Sau merge, tạo annotated tag `v<version>` trên `main`.
5. Merge `main` trở lại `develop` để giữ version và release fixes đồng bộ.

```bash
git switch develop
git switch -c release/0.1.0
git push -u origin release/0.1.0
```

Sau khi release PR đã merge:

```bash
git switch main
git pull --ff-only origin main
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Không merge trực tiếp `develop` vào `main` nếu team đang dùng release branch cho phiên bản đó.

## Hotfix

Hotfix tách từ `main`, chỉ chứa sửa lỗi khẩn cấp và regression test:

```bash
git switch main
git pull --ff-only origin main
git switch -c hotfix/0.1.1-auth-session
```

Sau khi PR hotfix được merge vào `main`, tạo patch tag và merge/cherry-pick cùng thay đổi trở lại `develop`. Không để bản sửa chỉ tồn tại trên `main`.

## Branch protection đề nghị

Thiết lập cho cả `main` và `develop`:

- Chặn direct push và force push.
- Bắt buộc Pull Request và ít nhất một approval.
- Bắt buộc conversation được resolve.
- Bắt buộc status checks: lint, typecheck, test và build khi các job đã tồn tại.
- Chặn merge khi branch chưa cập nhật với target branch.
- Giới hạn quyền bypass cho maintainer chịu trách nhiệm release.

## Báo lỗi và thay đổi phạm vi

Issue cần có steps to reproduce hoặc user story, expected/actual behavior, environment và evidence phù hợp. Feature ngoài `docs/product/05-out-of-scope.md` cần Product Owner duyệt change request trước khi bắt đầu.
