# HANDOFF — Customer Registration Flow (SDD execution, paused)

> Dán toàn bộ phần trong khối "PROMPT CHO SESSION SAU" bên dưới vào một session Claude Code mới (mở tại `D:\leopard`) để tiếp tục.

## Trạng thái nhanh (2026-09-02)
- Nhánh: `feature/mobile-profile-media-payment`, làm **in-place** (không worktree). HEAD = `64d5006`.
- Đang thực thi theo skill **superpowers:subagent-driven-development**.
- Spec: `docs/superpowers/specs/2026-09-02-customer-registration-flow-design.md`
- Plan: `docs/superpowers/plans/2026-09-02-customer-registration-flow.md` (task headings đánh số 1–9; 1=B1…6=M2, 7=M3, 8=M4, 9=M5)
- Ledger + briefs + reports + review diffs: `.superpowers/sdd/2026-09-02-customer-registration-flow/progress.md`

## Đã xong (6/9, mỗi task đã review sạch)
| Task | Commit | Nội dung |
|---|---|---|
| 1 (B1) | `8686359` | Bắt `name` (Google displayName) → `OtpIdentity.name` |
| 2 (B2) | `d914a24` | Migration: cột `onboardedAt`/consent*/`avatarMediaId` + backfill user cũ |
| 3 (B3) | `ab5f7a6` | `AuthUser` + `profileComplete`(=onboardedAt!=null) + prefill name/email + lưu name khi upsert |
| 4 (B4) | `882ce34` | Module `users` + `PATCH /users/me` (guard phone, set onboardedAt, 409 email) |
| 5 (M1) | `aa43a27` | Luồn `profileComplete` qua `exchangeIdToken` → `login.tsx` điều hướng `/(public)/customer-register` |
| 6 (M2) | `64d5006` | Đổi tên `register.tsx` → `driver-register.tsx` + cập nhật tham chiếu |
(Checkpoint WIP = `5a38b65`; docs spec/plan = `a37c121`.)

## Còn lại
- **Task 7 (M3)** — TẠO `apps/mobile/app/(public)/customer-register.tsx` (prefill GET /me, SĐT khóa, tên/email bắt buộc, 4 consent, submit PATCH /users/me → /customer/home, link → /(public)/driver-register) + test. Brief đã trích sẵn: `.superpowers/sdd/2026-09-02-customer-registration-flow/task-7-brief.md`. **Chưa bắt đầu.**
- **Task 8 (M4)** — Thêm nhánh verify OTP SĐT cho user Google trong `customer-register.tsx` (dùng `sendPhoneOtp` + `POST /auth/phone/link`); nút "Hoàn tất" khóa đến khi SĐT verified.
- **Task 9 (M5, tùy chọn)** — Avatar upload (endpoint `POST /users/me/avatar` + picker). Bỏ qua vẫn có feature hoàn chỉnh.
- **Final review** toàn nhánh + `superpowers:finishing-a-development-branch`.

## Ràng buộc vận hành QUAN TRỌNG (đã học ở session này)
1. **WIP song song của user**: cây có `apps/mobile/src/auth/LoginScreen.tsx` (M), `LoginScreen.test.tsx` (M), `OtpSixCellInput.tsx` (untracked) — đây là redesign ô OTP của user, **KHÔNG được commit**. Mọi task mobile phải `git add` **theo path cụ thể**, KHÔNG BAO GIỜ `git add -A` hay `git add <dir>`. Trước khi commit, `git status` xác nhận các file này không bị stage.
2. **Model override subagent 404**: KHÔNG truyền `model` cho Agent (haiku/sonnet đều map tới model không truy cập được). Bỏ trống để dùng model phiên (đang chạy tốt).
3. **Hook pre-commit** (ECC secret scan, `C:/Users/ADMIN/.codex/git-hooks`) treo khi commit `.docx` (thiếu docx2txt.exe); nhanh với file code. Đừng stage `.docx`. Không dùng `--no-verify`.
4. **DB** đang sống (localhost:5432 "leopard"), prisma migrate chạy được.
5. **Commit** kết thúc bằng trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Minor tồn (fix ở final review, không chặn)
- Task 4: `users.service.spec` Test 2 chưa assert `onboardedAt`/consent thực sự được ghi vào `update`; thiếu test P2002 `EMAIL_ALREADY_USED`. (KHUYẾN NGHỊ fix.)
- Task 1: thiếu test tên toàn khoảng trắng. Task 5: demo-login routing chưa test.
- Task 2: FOLLOW-UP ngoài phạm vi — drift baseline prisma toàn repo (GIST index + gen_random_uuid không model hoá) buộc hand-clean mỗi `migrate dev`.

---

## PROMPT CHO SESSION SAU (copy phần dưới)

```
Tiếp tục thực thi kế hoạch "Customer Registration Flow" bằng skill superpowers:subagent-driven-development. Làm việc tại D:\leopard, nhánh feature/mobile-profile-media-payment (in-place, không worktree).

TRẠNG THÁI: Task 1–6 đã xong và review sạch (HEAD hiện tại là commit của Task 6, "refactor(mobile): rename register route to driver-register"). Cần làm tiếp Task 7 → 8 → (9 tùy chọn) → final review.

TRƯỚC KHI DISPATCH, đọc để khôi phục ngữ cảnh:
- Ledger: .superpowers/sdd/2026-09-02-customer-registration-flow/progress.md (nguồn sự thật; các dòng "Task N: complete" là đã xong — đừng làm lại).
- Spec: docs/superpowers/specs/2026-09-02-customer-registration-flow-design.md
- Plan: docs/superpowers/plans/2026-09-02-customer-registration-flow.md (task headings đánh số 1–9; 7=M3, 8=M4, 9=M5).
- Brief Task 7 đã trích sẵn: .superpowers/sdd/2026-09-02-customer-registration-flow/task-7-brief.md (dùng script task-brief cho task 8/9).

QUY TRÌNH mỗi task: ghi BASE=git rev-parse HEAD → dispatch 1 implementer (Agent general-purpose, KHÔNG truyền model) đọc brief từ file → nhận report → review-package script → dispatch 1 reviewer → fix loop nếu có Critical/Important → ledger "Task N: complete" → task kế. Scripts ở: C:/Users/ADMIN/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/ (task-brief, review-package, sdd-workspace). Chạy bằng đường dẫn tuyệt đối; workspace = .superpowers/sdd/2026-09-02-customer-registration-flow/.

RÀNG BUỘC BẮT BUỘC:
1. Cây có WIP OTP của user chưa commit: apps/mobile/src/auth/LoginScreen.tsx (M), LoginScreen.test.tsx (M), OtpSixCellInput.tsx (untracked). TUYỆT ĐỐI không commit chúng. Mọi task mobile phải `git add` theo path cụ thể của riêng task, KHÔNG dùng `git add -A`/`git add <dir>`; `git status` kiểm tra trước khi commit để chắc 3 file này không bị stage.
2. Agent: KHÔNG truyền tham số model (haiku/sonnet map tới model 404); để trống dùng model phiên.
3. Hook pre-commit treo trên .docx (thiếu docx2txt.exe) nhưng nhanh với code — đừng stage .docx, không dùng --no-verify.
4. Commit kết thúc bằng: Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
5. DB đang sống (localhost:5432 leopard). jest/tsc chạy trong apps/api hoặc apps/mobile tùy task.

TASK 7 (M3) — tạo apps/mobile/app/(public)/customer-register.tsx + test theo brief (phục vụ user đăng nhập bằng SĐT: SĐT prefill khóa; tên/email bắt buộc; 4 consent 2 bắt buộc; submit PATCH /users/me → router.replace('/customer/home'); link footer → /(public)/driver-register). LƯU Ý: submit gọi sessionStore.setSession → chạm expo-secure-store; mock theo cách các test hiện có (src/auth/login-route.test.tsx, session-store.test.ts) để test sạch. Chỉ git add customer-register.tsx + customer-register.test.tsx.

TASK 8 (M4) — thêm nhánh verify OTP SĐT cho user Google vào customer-register.tsx (state phone/otp, sendPhoneOtp + POST /auth/phone/link, nút Hoàn tất khóa đến khi phoneVerified). Nhớ mở rộng mock http-client thêm `post`.

TASK 9 (M5) — avatar (tùy chọn), có thể hỏi user có làm không.

Sau Task cuối: final whole-branch review (review-package MERGE_BASE..HEAD với MERGE_BASE=git merge-base main HEAD), ONE fix wave nếu có, rồi superpowers:finishing-a-development-branch. Ở cuối, liệt kê mọi dòng "Ruling:" trong ledger cho user và các minor còn tồn (Task 4 test-strength + P2002, v.v.).
```
