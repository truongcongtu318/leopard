# So sánh màn hình mobile: LEOPARD vs. app giao vận thương mại đầy đủ

> **Trạng thái:** Phân tích nghiên cứu — không phải spec triển khai, không tự ý đưa vào backlog
>
> **Nguồn đối chiếu:** Kiến thức nền về kiến trúc Grab, Lalamove, Ahamove, GoJek (cùng
> domain kết nối vận tải/giao hàng với LEOPARD). WebSearch bị lỗi backend tạm thời khi
> viết tài liệu này nên không có trích dẫn nguồn web trực tiếp — nếu cần xác minh số
> liệu/tên màn hình chính xác từ app store hiện tại, nên chạy lại nghiên cứu khi tool
> khả dụng.

## 1. Kết luận trước — đọc phần này trước khi đọc bảng

Danh sách 15 màn hình bạn đề xuất khớp gần như 1:1 với kiến trúc app giao vận thương
mại đầy đủ (Grab/Lalamove/Ahamove) — điều đó đúng về mặt "một app hoàn chỉnh cần gì".
Nhưng đối chiếu với `docs/product/05-out-of-scope.md` và
`docs/Hop_Dong_LEOPARD_MVP.md` (hợp đồng dự án), phần lớn danh sách đó là:

- **Bị loại trừ tường minh** khỏi phạm vi hợp đồng (6/15 mục, trích dẫn cụ thể ở bảng
  dưới).
- **Nằm ngoài feature list đã duyệt** (F-01 đến F-12 trong
  `docs/product/04-feature-list.md`) dù không bị cấm bằng tên — tức là chưa từng được
  Product Owner phê duyệt đưa vào scope.

`docs/Hop_Dong_LEOPARD_MVP.md` mục 1.4 ghi rõ: *"Phiên bản MVP/Demo phục vụ trình
diễn, kiểm thử nghiệp vụ, thuyết trình... không phải hệ thống production thương mại
hoàn chỉnh."* Và `05-out-of-scope.md` dòng cuối: *"Mọi đề xuất bổ sung phải có change
request, đánh giá tác động và Product Owner duyệt trước khi vào backlog."*

→ Tài liệu này chỉ là **input cho change request**, không phải căn cứ để bắt đầu code.

## 2. Bảng đối chiếu đầy đủ

| # | Màn hình bạn đề xuất | Tương đương trong Grab/Lalamove/Ahamove | Trạng thái LEOPARD | Căn cứ |
|---|---|---|---|---|
| 1 | `/register` — Đăng ký & chọn vai trò | Có ở mọi app (self-service sign-up) | **Chưa có trong scope** — hiện tại account do Admin provision + login qua Firebase Phone Auth/demo, không có luồng tự đăng ký | Không bị cấm tường minh, nhưng không nằm trong F-01 (`04-feature-list.md`) — cần PO xác nhận |
| 2 | `/driver/kyc-submission` — Nộp hồ sơ xét duyệt | Có — upload CCCD, GPLX, đăng ký xe, selfie xác thực | **Chưa có trong scope** | Không bị cấm tường minh nhưng đòi hỏi domain mới (document review workflow) không có trong `docs/data/01-database-design.md` hiện tại — cần PO xác nhận |
| 3 | `/driver/kyc-status` — Trạng thái hồ sơ | Có, đi kèm #2 | **Chưa có trong scope** | Phụ thuộc #2 |
| 4 | `/customer/wallet` — Ví & phương thức thanh toán | Có — ví nội bộ, liên kết thẻ, lịch sử nạp/rút | **NGOÀI PHẠM VI** | `05-out-of-scope.md` dòng 11: "Ví điện tử nội bộ, hoàn tiền và chia doanh thu" |
| 5 | `/driver/wallet` — Ví tài xế & rút tiền | Có — số dư, rút về ngân hàng | **NGOÀI PHẠM VI** | Cùng dòng 11, cộng dòng 10: "Đối soát ngân hàng và tự động xác nhận tiền về" |
| 6 | `/driver/earnings` — Báo cáo doanh thu & thưởng | Có — thu nhập theo ngày/tuần, incentive | **NGOÀI PHẠM VI** | Dòng 7: "Fleet management nâng cao: ...doanh thu tài xế, hoa hồng..." |
| 7 | `/orders/:id/chat` — Chat theo đơn | Có — chat/call ẩn số giữa khách và tài xế | **NGOÀI PHẠM VI** | Dòng 12: "Chat, gọi điện ẩn số hoặc hệ thống khiếu nại đầy đủ" |
| 8 | `/driver/orders/batch-route` — Lộ trình đa điểm | Có ở app logistics (Lalamove/Ahamove ghép đơn) | **NGOÀI PHẠM VI** | Dòng 8: "Ghép nhiều đơn, tối ưu tuyến đa phương tiện hoặc dispatch tự động" |
| 9 | `/notifications` — Trung tâm thông báo | Có | **Ngoài tinh thần phạm vi** — chưa có module notification nào trong backend (đã xác nhận qua grep ở lần phân tích trước) | Dòng 5 loại "push notification nâng cao"; xây trung tâm thông báo đầy đủ đòi hỏi domain tương đương — nên xin PO xác nhận trước |
| 10 | `/customer/addresses` — Sổ địa chỉ đã lưu | Có | **Chưa có trong scope nhưng không xung đột trực tiếp** | Không đụng payment/chat/dispatch/fleet-revenue; là ứng viên hợp lý nhất nếu có change request |
| 11 | `/customer/promotions` — Khuyến mãi/Voucher | Có | **Chưa có trong scope** | Không nằm trong F-01–F-12; liên quan "hoàn tiền" (dòng 11) nếu voucher trừ tiền trực tiếp |
| 12 | `/orders/:id/review` — Đánh giá & Tip | Có | **Chưa có trong scope** | Không nằm trong F-01–F-12; phần "Tip" chạm vào payment flow phức tạp hơn QR hiện tại |
| 13 | `/orders/:id/report-issue` — Báo cáo sự cố | Có | **NGOÀI PHẠM VI** | Dòng 12: "...hệ thống khiếu nại đầy đủ" |
| 14 | `/support` — Trợ giúp & SOS | Có — tổng đài khẩn cấp, an toàn chuyến đi | **NGOÀI PHẠM VI (SOS)**, FAQ tĩnh có thể chấp nhận được | SOS/tổng đài thời gian thực gắn với cam kết vận hành dòng 13 ("SLA 24/7"); vượt quá tính chất demo ở mục 1.4 hợp đồng |
| 15 | `/driver/performance` — Điểm hiệu suất & xếp hạng | Có | **Chưa có trong scope** | Không nằm trong F-01–F-12; liên quan "doanh thu tài xế" (dòng 7) nếu gắn với thưởng |
| 16 | `/settings` — Cài đặt & quyền thiết bị | Có | **Phần lớn đã phủ bởi màn Profile (Wave 6)** | `docs/superpowers/specs/2026-08-23-mobile-screens-completion-design.md` đã có phone/role/status/logout; "quyền thiết bị" (camera/thư viện ảnh) đã xử lý ở mức picker (Wave 6 Task 5), không cần màn Settings riêng cho pilot |

## 3. Tổng kết theo mức độ

- **Ngoài phạm vi hợp đồng, có dòng cấm tường minh (6/16):** #4, #5, #6, #7, #8, #13 —
  không nên đưa vào backlog dưới bất kỳ hình thức nào trừ khi hợp đồng được sửa đổi
  chính thức.
- **Ngoài tinh thần phạm vi, cần PO xác nhận riêng (2/16):** #9 (Notifications), #14
  (SOS phần tổng đài — FAQ tĩnh thì có thể chấp nhận).
- **Chưa có trong scope, không xung đột trực tiếp, ứng viên hợp lý nếu có change
  request (6/16):** #1, #2, #3, #10, #11, #12, #15.
- **Đã phủ bởi Wave 6 hoặc gần đủ (1/16):** #16 (Settings ≈ Profile).

## 4. Khuyến nghị

1. Không triển khai bất kỳ mục nào trong nhóm "Ngoài phạm vi hợp đồng" (#4, #5, #6,
   #7, #8, #13) trừ khi Bên A (chủ dự án) và Bên B thống nhất sửa hợp đồng — đúng quy
   trình ghi tại cuối `05-out-of-scope.md`.
2. Với nhóm "ứng viên hợp lý" (#1, #2, #3, #10, #11, #12, #15), nếu bạn muốn theo
   đuổi, bước tiếp theo đúng quy trình là viết **change request** nêu rõ: tính năng,
   lý do kinh doanh, tác động lên timeline/hợp đồng hiện tại — rồi mới brainstorm
   thiết kế. Tôi có thể soạn change request draft nếu bạn muốn, nhưng sẽ không tự
   brainstorm/spec/code trước khi có xác nhận đây là điều bạn (với vai trò đại diện dự
   án) muốn chính thức mở rộng phạm vi.
3. Wave 6 (đang triển khai) và Wave 7 (đã phân tích ở
   `2026-08-23-mobile-screen-inventory-wave7-scope.md`) không bị ảnh hưởng bởi tài
   liệu này — cả hai đều nằm trong phạm vi đã duyệt.
