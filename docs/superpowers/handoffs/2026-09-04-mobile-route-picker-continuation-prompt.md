# LEOPARD Mobile Route Picker — Continuation Prompt

Sao chép toàn bộ khối prompt bên dưới sang session Claude Code mới.

```text
Bạn đang tiếp tục dự án LEOPARD trong repository D:\leopard. Nhiệm vụ của
session này: thực thi một implementation plan ĐÃ VIẾT SẴN VÀ ĐÃ ĐƯỢC DUYỆT
cho tính năng "chọn tuyến đường" (route picker) trên mobile app Customer.
Bạn không cần brainstorm hay thiết kế lại — chỉ cần đọc plan và làm đúng
theo plan, task-by-task, theo TDD.

MỤC TIÊU

Backend đã merge xong (đã đổi `POST /orders/estimate` từ trả về 1 tuyến
sang trả về NHIỀU tuyến, mỗi tuyến có giá + estimateToken + mức kẹt xe
riêng — xem "TRẠNG THÁI HIỆN TẠI" bên dưới). Session này làm nốt phần
MOBILE: màn hình "Tạo đơn" của Customer phải hiển thị danh sách tuyến
(tuyến đề xuất nổi bật, badge màu theo mức kẹt xe), cho khách chạm để
chọn tuyến khác, và khi tạo đơn phải dùng đúng estimateToken của tuyến
đang chọn — không phải tuyến đầu tiên mặc định.

Plan này còn sửa kèm 1 bug hồi quy đang có sẵn ngay bây giờ: mobile app
hiện tại KHÔNG gửi `cargoWeightKg` khi gọi `/orders/estimate`, nên chọn
"Xe tải" trên app hiện tại luôn bị lỗi 400 (backend đã bắt buộc field
này cho TRUCK). Sửa bug này là Task 2 của plan, không phải việc phát
sinh thêm.

BỐI CẢNH NGHIỆP VỤ (đọc kỹ trước khi code)

- Mỗi lần gọi `/orders/estimate` backend trả về TỐI ĐA 3 tuyến, đã sắp
  theo thời gian di chuyển tăng dần; tuyến đầu tiên (`isRecommended: true`)
  là tuyến nhanh nhất — không có thuật toán chấm điểm phức tạp, chỉ là
  thời gian thấp nhất.
- MỖI tuyến có `estimateToken` RIÊNG, tự mang đủ giá + khoảng cách + ETA
  của chính tuyến đó (đã ký HMAC ở backend). Khách chọn tuyến nào thì
  App phải gửi ĐÚNG token của tuyến đó khi tạo đơn — không được mặc định
  luôn dùng token đầu tiên.
- Việc đổi tuyến đang chọn trên UI là THAO TÁC CỤC BỘ, KHÔNG được gọi lại
  API — mọi tuyến đã có sẵn trong response của lần gọi estimate gần nhất.
- `cargoWeightKg` bắt buộc trong request `/orders/estimate` khi
  `vehicleType === 'TRUCK'`; app phải validate phía client trước khi gọi
  API (giống cách pickup/dropoff đang được validate), không chỉ dựa vào
  lỗi 400 từ server.
- `congestionLevel` mỗi tuyến là một trong 5 giá trị:
  `'low' | 'moderate' | 'heavy' | 'severe' | 'unknown'`. `'unknown'`
  nghĩa là backend không có dữ liệu traffic cho tuyến đó — không suy diễn
  thành xanh/đỏ gì cả, hiển thị đúng là "chưa rõ".

TRẠNG THÁI HIỆN TẠI (đã hoàn thành, KHÔNG làm lại)

- Backend (`apps/api/src/maps/**`) đã merge đầy đủ vào branch hiện tại,
  đã qua subagent-driven-development với review từng task + review toàn
  branch, đã verify với API Vietmap thật (kể cả sửa 1 bug thật: shape
  `annotations.congestion` là mảng object `{value,first,last}`, không
  phải mảng string — đã fix ở commit gần nhất).
- KHÔNG được sửa bất kỳ file nào trong `apps/api/**` ở session này — đây
  là session mobile-only, tiêu thụ contract backend đã merge, không đổi
  lại contract đó.

FILE CẦN ĐỌC TRƯỚC — THEO ĐÚNG THỨ TỰ

1. `docs/superpowers/plans/2026-09-04-vietmap-eta-route-recommendation-mobile.md`
   — ĐÂY LÀ PLAN CHÍNH của session này. Đọc toàn bộ trước khi code. Plan
   đã có sẵn code cụ thể cho từng bước (6 task, mỗi task có Files,
   Interfaces, TDD steps với code thật) — không tự bịa cách làm khác đi
   trừ khi plan sai so với code thực tế trên disk (nếu vậy, dừng lại và
   báo, đừng tự ý đổi hướng).
2. `docs/superpowers/specs/2026-09-04-vietmap-eta-route-recommendation-design.md`
   (§6 "Mobile") — spec gốc plan này lập luận từ đó. Nếu plan và spec
   xung đột chỗ nào, spec là thẩm quyền quyết định.
3. `docs/superpowers/plans/2026-09-04-vietmap-eta-route-recommendation-backend.md`
   — để hiểu chính xác response shape backend trả về (không cần đọc kỹ
   từng dòng, chỉ cần hiểu contract).
4. Các file mobile plan sẽ sửa (plan đã trích sẵn nội dung liên quan,
   nhưng nên tự đọc lại bản mới nhất trên disk trước khi sửa vì có thể
   đã trôi so với lúc viết plan):
   - `apps/mobile/src/features/customer/orders/model.ts`
   - `apps/mobile/src/features/customer/orders/port.ts`
   - `apps/mobile/src/features/customer/orders/adapter.ts` +
     `adapter.test.ts`
   - `apps/mobile/src/features/customer/orders/fixtures.ts`
   - `apps/mobile/src/features/customer/orders/CustomerCreateOrderScreen.tsx`
     + `CustomerScreens.test.tsx`
   - `apps/mobile/src/features/customer/orders/CustomerCreateOrderRuntime.tsx`

BASELINE — KIỂM TRA TRƯỚC KHI LÀM GÌ

Trước khi sửa file, chạy và đọc kỹ:

- git branch --show-current
- git rev-parse --short HEAD
- git status --short

Baseline khi viết prompt này: branch `feature/mobile-profile-media-payment`,
HEAD `1d3e87c`. Working tree CÓ RẤT NHIỀU file mobile đang sửa dở
(redesign UI, auth flow) KHÔNG liên quan gì đến route picker — đây là
WIP thật của user, không phải rác. TUYỆT ĐỐI không `git checkout .`,
không `git reset --hard`, không `git clean`, không đụng vào các file đó.

Nếu branch hoặc HEAD khác baseline trên, đọc `git log` gần đây trước khi
tiếp tục để hiểu chuyện gì đã đổi, không tự ý reset về baseline cũ.

YÊU CẦU THỰC THI

1. Dùng skill `superpowers:using-git-worktrees` để tạo một worktree CÔ
   LẬP cho việc này trước khi sửa bất kỳ file nào — working tree chính có
   quá nhiều WIP không liên quan, không được lẫn vào. Base ref PHẢI là
   HEAD hiện tại của `feature/mobile-profile-media-payment` (không phải
   `origin/main` — nếu dùng công cụ worktree tự động branch từ
   origin/main, nó sẽ THIẾU toàn bộ code backend maps module vừa merge;
   xem lại cách session trước xử lý việc này nếu công cụ tạo sai base,
   phải xoá và tạo lại bằng `git worktree add` chỉ định rõ base branch).
2. Dùng skill `superpowers:subagent-driven-development` để thực thi
   plan — file plan đã tồn tại sẵn
   (`docs/superpowers/plans/2026-09-04-vietmap-eta-route-recommendation-mobile.md`),
   KHÔNG cần qua `writing-plans` hay `brainstorming` nữa, đi thẳng vào
   setup workspace + pre-flight scan + dispatch Task 1.
3. Theo đúng TDD trong từng task của plan: viết/sửa test trước (RED), xác
   nhận fail, implement (GREEN), rồi mới commit.
4. Model cho từng subagent: theo đúng Model Selection trong skill
   `subagent-driven-development` — hầu hết các task trong plan này đã có
   sẵn code cụ thể (transcription + test), dùng model rẻ nhất phù hợp.
   LƯU Ý: trong session trước, model `haiku`/`opus` đều gặp lỗi
   `model_not_found` trong môi trường này (`cc/claude-haiku-4-5-20251001`,
   `cc/claude-opus-5`) — chỉ `sonnet` chạy ổn định. Thử model dự định
   trước; nếu gặp `model_not_found`, chuyển ngay sang `sonnet`, đừng thử
   lại nhiều lần cùng model lỗi.
5. Sau khi cả 6 task xong và review sạch, chạy full gate của Task 6
   (`pnpm --filter mobile typecheck && pnpm --filter mobile lint &&
   pnpm --filter mobile test`), rồi dùng skill
   `superpowers:finishing-a-development-branch` — chạy full test suite
   TRƯỚC KHI đề xuất bất kỳ lựa chọn merge/PR nào (session trước phát
   hiện 2 lỗi hồi quy thật ở bước này vì chỉ chạy test scoped trước đó —
   đừng lặp lại thiếu sót đó, chạy suite KHÔNG filter ít nhất 1 lần).

RÀNG BUỘC TUYỆT ĐỐI

1. KHÔNG sửa bất kỳ file nào trong `apps/api/**`.
2. KHÔNG tự ý merge, push, hay mở Pull Request. Đến bước cuối, trình bày
   đúng 3 lựa chọn theo skill `finishing-a-development-branch` (merge
   local / push+PR / giữ nguyên) và CHỜ user chọn — không tự quyết.
3. KHÔNG đụng vào các file mobile đang có WIP không liên quan (danh sách
   dirty ở BASELINE) — nếu một file trong scope của plan này lại đang có
   sửa dở của user, dừng lại, báo cho user biết, đừng tự ý ghi đè.
4. KHÔNG mở rộng scope ra ngoài 6 task của plan (vd. không tự vẽ nhiều
   polyline lên bản đồ thật — plan đã ghi rõ lý do loại bỏ ở mục "Not in
   this plan").
5. Nếu phát hiện plan sai so với code thực tế trên disk (vd. một file đã
   đổi khác từ lúc viết plan), đó là "Finding conflicts with plan text"
   — xử lý đúng theo quy trình `subagent-driven-development` (rule, ghi
   ledger, tiếp tục), không tự ý bỏ qua hoặc report lỗi rồi dừng cả
   session.

OUTPUT MONG ĐỢI KHI KẾT THÚC SESSION

1. 6 commit tương ứng 6 task trong plan, mỗi commit đã qua task-review
   sạch (hoặc có ruling ghi rõ trong ledger nếu có finding được adjudicate).
2. Final whole-branch review sạch (0 Critical/Important), các Minor được
   triage rõ ràng (fix hoặc để lại có lý do).
3. Full gate xanh: `typecheck`, `lint`, `test` (không filter) đều pass —
   PASTE kết quả thật của các lệnh này vào báo cáo cuối, không chỉ nói
   "đã chạy".
4. Kết quả bước "Manual smoke check" (Task 6, Step 3) — mô tả đã thử
   được luồng nào qua Expo dev server, luồng nào chưa thử được và lý do.
5. Danh sách đầy đủ mọi "Ruling:" đã ghi trong ledger (nếu có), kèm lý do
   và cái giá phải trả nếu ruling đó sai — đúng định dạng "Rulings I made"
   mà skill `subagent-driven-development` yêu cầu ở bước Finish.
6. KHÔNG tự xoá workspace/worktree hay tuyên bố "xong hoàn toàn" trước
   khi user xác nhận lựa chọn merge/PR/giữ nguyên ở bước cuối.

VERIFICATION COMMANDS ƯU TIÊN

- pnpm --filter mobile test -- adapter.test.ts
- pnpm --filter mobile test -- CustomerScreens.test.tsx
- pnpm --filter mobile test -- customer/orders
- pnpm --filter mobile typecheck
- pnpm --filter mobile lint
- pnpm --filter mobile test
```
