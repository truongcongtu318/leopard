# Đề xuất luồng đăng ký tài xế theo pháp lý và nghiệp vụ thực tế

**Ngày rà soát:** 14/09/2026  
**Phạm vi:** Driver app, API đăng ký tài xế, KYC, hợp đồng điện tử và quy trình duyệt  
**Trạng thái:** Đề xuất sản phẩm/kỹ thuật; nội dung hợp đồng và mô hình vận hành phải được luật sư Việt Nam phê duyệt trước khi production

## 1. Kết luận quyết định

LEOPARD không nên tiếp tục dùng một luồng chung “khách hàng đăng ký thành tài xế độc lập”. Trước khi thiết kế form, doanh nghiệp phải chốt tài xế đang hoạt động dưới tư cách nào:

1. **Tài xế thuộc đơn vị vận tải/fleet đã được LEOPARD xác minh** — phù hợp nhất cho pilot và được khuyến nghị.
2. **Tài xế là người lao động của LEOPARD hoặc đơn vị vận tải** — phải dùng hợp đồng và quy trình nhân sự phù hợp quan hệ lao động.
3. **Cá nhân/hộ kinh doanh tự là đơn vị kinh doanh vận tải** — chỉ mở khi pháp chế xác nhận đủ điều kiện và hệ thống có khả năng xác minh giấy phép tương ứng.

Không nên dùng tên “hợp đồng hợp tác” để mặc định mọi tài xế là đối tác độc lập. Theo Bộ luật Lao động 2019, thỏa thuận dù mang tên khác vẫn có thể được xem là hợp đồng lao động nếu có việc làm được trả công và một bên quản lý, điều hành, giám sát bên kia.

**Quyết định đề xuất cho pilot:** LEOPARD là nền tảng kết nối; chỉ kích hoạt tài xế có quan hệ hợp lệ với một fleet/đơn vị kinh doanh vận tải đã được duyệt. Sau khi mô hình pháp lý được chốt, hợp đồng và trường dữ liệu mới được đóng băng.

## 2. Đánh giá luồng hiện tại

### 2.1. Luồng đang chạy

1. Người dùng xác thực số điện thoại.
2. Nhập họ tên, loại xe, biển số, số GPLX.
3. Xem hợp đồng, đánh dấu đồng ý và nhập tên làm chữ ký.
4. `POST /driver/apply` tạo hồ sơ, đổi ngay `User.role = DRIVER` và `User.status = PENDING_APPROVAL`.
5. Ứng dụng tải ba ảnh `LICENSE`, `VEHICLE_REGISTRATION`, `ID_CARD`.
6. Admin có thể duyệt khi hệ thống tìm thấy đủ ba loại file.
7. Người dùng chuyển thành `ACTIVE` hoặc `REJECTED`.

### 2.2. Khoảng trống cần sửa trước production

| Mức | Khoảng trống | Rủi ro thực tế | Điều chỉnh đề xuất |
|---|---|---|---|
| P0 | Chưa xác định đơn vị kinh doanh vận tải/fleet chịu trách nhiệm | Có thể kích hoạt tài xế và phương tiện không thuộc mô hình vận tải hợp lệ | Bắt buộc chọn/xác minh tư cách hoạt động trước KYC |
| P0 | Admin chỉ kiểm tra sự tồn tại của file | File sai người, hết hạn, sai hạng GPLX hoặc sai biển số vẫn có thể được duyệt | Trạng thái thẩm định và checklist cho từng giấy tờ |
| P0 | Mẫu hợp đồng trong code đang ghi rõ “awaiting formal legal review” | Nội dung chưa đủ cơ sở để phát hành production | Luật sư duyệt mô hình và từng phiên bản hợp đồng |
| P0 | Chưa có thông báo xử lý dữ liệu riêng | CCCD, GPLX, vị trí chính xác và hồ sơ ký được xử lý nhưng mục đích/thời hạn/quyền chưa rõ | Privacy notice có phiên bản; consent riêng khi pháp luật yêu cầu |
| P1 | Thiếu hạng, ngày cấp/hết hạn GPLX | Không đối chiếu được quyền điều khiển loại xe | Thu dữ liệu có cấu trúc và kiểm tra tương thích loại xe |
| P1 | Thiếu quyền sở hữu/sử dụng xe, kiểm định, bảo hiểm bắt buộc và hồ sơ vận tải theo mô hình | Phương tiện có thể không đủ điều kiện hoạt động | Checklist động theo loại xe và tư cách pháp lý |
| P1 | `User.status` đang kiêm trạng thái tài khoản và trạng thái hồ sơ | Khóa nhầm toàn bộ tài khoản, khó cho sửa và nộp lại | Tách `DriverApplication.status` khỏi `User.status` |
| P1 | Chỉ có `PENDING_APPROVAL`, `ACTIVE`, `REJECTED` | Admin phải từ chối cả hồ sơ chỉ vì một ảnh mờ | Thêm `ACTION_REQUIRED` và trạng thái từng tài liệu |
| P1 | Chữ ký bằng tên nhập, thiếu sự kiện xác thực mạnh và hash tài liệu | Khó chứng minh đúng người, đúng nội dung, đúng thời điểm | OTP/re-auth khi ký; lưu PDF bất biến, hash và bằng chứng ký |
| P1 | Chưa quản lý hết hạn sau khi kích hoạt | Tài xế tiếp tục nhận đơn khi giấy tờ quan trọng hết hạn | Nhắc hạn và chặn nhận đơn theo chính sách |
| P2 | Gọi `/driver/apply` trước khi upload | Mất mạng có thể tạo hồ sơ dở dang | Lưu draft và upload trước lệnh submit cuối cùng |

## 3. Luồng đăng ký đề xuất

### Bước 0 — Giới thiệu và kiểm tra điều kiện sơ bộ

- Nêu rõ loại công việc, khu vực hoạt động, loại phương tiện được hỗ trợ và thời gian dự kiến xét duyệt.
- Xác thực số điện thoại; cho phép tiếp tục hồ sơ trên thiết bị khác.
- Hiển thị link “Thông báo xử lý dữ liệu cá nhân” trước khi thu giấy tờ.
- Hỏi tối thiểu: loại xe, tỉnh/thành hoạt động, đã thuộc fleet/đơn vị vận tải hay chưa.
- Nếu chưa có mô hình hợp lệ, đưa vào danh sách chờ hoặc hướng dẫn gia nhập fleet; không cho đi tiếp bằng một nhánh “tài xế tự do” mơ hồ.

### Bước 1 — Xác định tư cách hoạt động

**Nhánh A — Thuộc fleet/đơn vị vận tải:** nhập mã mời hoặc chọn đơn vị; fleet xác nhận quan hệ với tài xế và xe.

**Nhánh B — Người lao động:** liên kết hồ sơ tuyển dụng; dùng hợp đồng lao động và nghĩa vụ nhân sự tương ứng.

**Nhánh C — Tự kinh doanh vận tải:** thu hồ sơ pháp nhân/hộ kinh doanh và giấy phép liên quan; chỉ hiển thị nếu pháp chế bật cấu hình cho nhánh này.

Kết quả bước này phải tạo `DriverAffiliation` trỏ tới pháp nhân chịu trách nhiệm vận tải, thay vì chỉ tạo `DriverProfile` đứng riêng.

### Bước 2 — Danh tính tài xế

- Họ tên pháp lý, ngày sinh, số định danh, địa chỉ liên hệ.
- Ảnh mặt trước/sau giấy tờ định danh khi thật sự cần cho thẩm định.
- Đối chiếu họ tên và ngày sinh giữa thông tin khai báo, giấy tờ định danh và GPLX.
- Không thu thêm lý lịch tư pháp, dữ liệu gia đình hoặc dữ liệu nhạy cảm chỉ vì “có thể cần”; mỗi trường phải có mục đích và thời hạn lưu rõ ràng.

### Bước 3 — Điều kiện người lái

- Số GPLX, hạng, ngày cấp, ngày hết hạn, cơ quan cấp và ảnh các mặt cần thiết.
- Kiểm tra hạng GPLX có phù hợp loại/trọng tải xe đăng ký.
- Với người hành nghề lái xe ô tô, thiết kế khả năng quản lý yêu cầu sức khỏe/khám định kỳ theo chính sách pháp lý được xác nhận; chỉ thu dữ liệu sức khỏe tối thiểu cần thiết.
- Nếu chưa xác minh được nguồn nhà nước, bắt buộc review thủ công và ghi người review.

### Bước 4 — Phương tiện và quyền sử dụng

- Biển số, loại xe, nhãn hiệu/model, tải trọng/số chỗ theo đăng ký.
- Giấy đăng ký xe; nếu tài xế không phải chủ xe, cần giấy tờ chứng minh quyền sử dụng/ủy quyền/hợp đồng phù hợp.
- Giấy chứng nhận kiểm định và ngày hết hạn đối với xe thuộc diện phải kiểm định.
- Bảo hiểm bắt buộc trách nhiệm dân sự của chủ xe cơ giới và ngày hết hạn.
- Phù hiệu, giấy phép kinh doanh vận tải hoặc hồ sơ liên quan được gắn với **đơn vị vận tải**, chỉ yêu cầu khi áp dụng cho mô hình/loại xe cụ thể.
- Ảnh xe và biển số để đối chiếu, không dùng ảnh xe thay cho giấy tờ pháp lý.

Checklist phải được cấu hình theo `vehicleType`, tải trọng, mô hình pháp lý và thời điểm hiệu lực của quy định; không hard-code một bộ giấy tờ cho mọi tài xế.

### Bước 5 — Kiểm tra chất lượng hồ sơ trước khi ký

- Kiểm tra đủ mặt ảnh, ảnh rõ, số giấy tờ đúng định dạng và ngày hết hạn hợp lệ.
- Phát hiện xung đột họ tên, biển số, loại xe; yêu cầu sửa trước khi ký.
- Lưu draft sau từng bước; upload có idempotency và tiếp tục được sau mất mạng.
- Mỗi tài liệu có trạng thái `NOT_SUBMITTED`, `UPLOADING`, `PENDING_REVIEW`, `VERIFIED`, `ACTION_REQUIRED`, `REJECTED`, `EXPIRED`.

### Bước 6 — Thông báo dữ liệu và các lựa chọn đồng ý

Tách ba nội dung trên UI:

1. **Thông báo xử lý dữ liệu:** đơn vị kiểm soát/xử lý, dữ liệu thu, mục đích, bên nhận, thời hạn lưu, quyền của chủ thể dữ liệu và kênh liên hệ.
2. **Điều khoản sử dụng ứng dụng:** quy tắc tài khoản, khiếu nại, tạm khóa.
3. **Hợp đồng lao động/hợp tác/vận tải:** chọn đúng theo tư cách ở Bước 1.

Đồng ý marketing phải tùy chọn và tách khỏi đồng ý cần thiết để xét hồ sơ. Quyền truy cập vị trí chính xác nên xin tại bước kích hoạt/nhận đơn, kèm giải thích khi nào hệ thống theo dõi, thay vì gộp ẩn trong hợp đồng đăng ký.

### Bước 7 — Xem và ký hợp đồng điện tử

- Hiển thị bản tóm tắt dễ hiểu và cho tải toàn bộ PDF trước khi ký.
- Hợp đồng phải ghi đúng pháp nhân, tư cách của tài xế, cơ chế cước/phí/thuế, trách nhiệm hàng hóa và bên thứ ba, bảo hiểm, hàng cấm, sự cố, khiếu nại, tạm khóa/chấm dứt và giải quyết tranh chấp.
- Yêu cầu xác thực lại bằng OTP hoặc phương thức đủ mạnh tại thời điểm ký.
- Lưu bất biến: `contractVersion`, hash PDF, file PDF đã ký, người ký, số điện thoại đã xác thực, thời điểm ký, phương thức ký, sự kiện xác thực và bằng chứng kỹ thuật phù hợp.
- Khi điều khoản thay đổi, tạo phiên bản mới; không sửa nội dung bản tài xế đã ký.

### Bước 8 — Xác nhận và nộp hồ sơ

- Cho xem lại toàn bộ dữ liệu và giấy tờ.
- Một lệnh `Submit application` tạo snapshot bất biến của hồ sơ và chuyển `DRAFT → SUBMITTED`.
- Sau khi nộp, cho phép rút hồ sơ; các thay đổi vật chất phải tạo revision và có thể yêu cầu ký lại.
- Không đổi `User.role` hoặc khóa tài khoản khách hàng ở thời điểm này.

### Bước 9 — Thẩm định

Luồng chuẩn:

```text
DRAFT → SUBMITTED → UNDER_REVIEW
                       ├─→ ACTION_REQUIRED → SUBMITTED
                       ├─→ REJECTED
                       └─→ APPROVED → ACTIVATION_REQUIRED → ACTIVE
```

Admin phải xác nhận từng tiêu chí, không chỉ mở ảnh:

- Đúng người, còn hạn, rõ ràng, không trùng hồ sơ bị cấm.
- Hạng GPLX phù hợp phương tiện.
- Biển số/loại xe/đơn vị sở hữu hoặc quyền sử dụng khớp nhau.
- Bảo hiểm, kiểm định và điều kiện vận tải áp dụng còn hiệu lực.
- Fleet/pháp nhân đã xác nhận quan hệ.
- Hợp đồng đúng phiên bản và có bằng chứng ký hợp lệ.

`ACTION_REQUIRED` phải chỉ rõ tài liệu, mã lý do và hướng sửa. Giữ nguyên các tài liệu đã `VERIFIED`; không buộc nộp lại cả hồ sơ.

### Bước 10 — Kích hoạt vận hành

Sau `APPROVED`, tài xế hoàn thành checklist ngắn:

- Xác nhận quy tắc an toàn, hàng cấm, xử lý sự cố và bằng chứng giao hàng.
- Bật thông báo; cấp quyền vị trí theo ngữ cảnh và thử gửi vị trí.
- Chọn phương tiện đã được duyệt.
- Xem kênh hỗ trợ/khiếu nại và quy trình khẩn cấp.
- Chỉ sau đó chuyển `ACTIVE`; mặc định `availability = OFFLINE` cho đến khi tài xế chủ động bật nhận đơn.

### Bước 11 — Duy trì tuân thủ

- Nhắc hạn 30/15/7 ngày cho GPLX, kiểm định, bảo hiểm và giấy tờ vận tải.
- Hết hạn giấy tờ quan trọng: chuyển `COMPLIANCE_HOLD`, dừng nhận đơn mới nhưng vẫn cho đăng nhập, hoàn tất xử lý đơn/sự cố và cập nhật giấy tờ theo chính sách.
- Đổi xe, fleet, GPLX hoặc thông tin pháp lý phải kích hoạt thẩm định lại có phạm vi.
- Lưu lịch sử quyết định, người duyệt, lý do ngoại lệ và phiên bản chính sách.
- Có chính sách lưu/xóa hồ sơ sau khi rút, bị từ chối hoặc chấm dứt quan hệ.

## 3A. Screen flow chi tiết trên Driver app

### Cách đóng gói để luồng không rườm rà

18 màn bên dưới là các **trạng thái giao diện/nghiệp vụ**, không phải 18 bước hiển thị trên progress bar. Trên ứng dụng, gom thành 6 chặng chính:

```text
1. Điều kiện đăng ký
2. Danh tính
3. Giấy phép lái xe
4. Phương tiện
5. Kiểm tra và ký
6. Theo dõi kết quả
```

| Chặng người dùng thấy | Nội dung bên trong | Điều kiện hiển thị |
|---|---|---|
| 1. Điều kiện đăng ký | Khu vực, loại xe, fleet/đơn vị vận tải | Luôn có |
| 2. Danh tính | CCCD hai mặt, xác nhận OCR, selfie/liveness | Luôn có; liveness theo cấu hình rủi ro |
| 3. Giấy phép lái xe | Chụp GPLX, xác nhận hạng/thời hạn | Khi loại phương tiện yêu cầu GPLX |
| 4. Phương tiện | Đăng ký xe, quyền sử dụng, ảnh xe, giấy tờ điều kiện | Checklist động theo xe và mô hình |
| 5. Kiểm tra và ký | Tóm tắt hồ sơ, privacy/terms, hợp đồng, OTP ký | Khi các mục bắt buộc đã đủ |
| 6. Theo dõi kết quả | Trạng thái duyệt, yêu cầu bổ sung, kết quả | Sau submit |

Mỗi chặng mở trong một route; việc chụp mặt trước, mặt sau và xác nhận OCR là các state trong route đó. Khi quay lại, ứng dụng hiển thị card trạng thái thay vì bắt đi lại từ đầu.

**Không thu trong hồ sơ ban đầu nếu chưa cần:**

- Tài khoản nhận tiền: thu sau khi hồ sơ đạt `APPROVED` và trước lần rút tiền/nhận thanh toán đầu tiên.
- Đào tạo và quyền vị trí: thực hiện ở `ACTIVATION_REQUIRED`, sau khi được duyệt.
- Hồ sơ pháp nhân của fleet: fleet owner nộp tại cổng fleet; tài xế chỉ nhập mã mời và xác nhận quan hệ.
- Giấy tờ điều kiện không áp dụng cho loại xe: không hiển thị, kể cả dưới dạng “không bắt buộc”.

**Mục tiêu trải nghiệm:**

- Xe máy: khoảng 5–8 phút nếu giấy tờ sẵn sàng.
- Van/tải: khoảng 8–12 phút, tùy số giấy tờ điều kiện.
- Không quá 5 phút thao tác liên tục mà chưa có một mốc “Đã lưu”.
- Một lần chụp lỗi được sửa ngay trong cùng chặng; không trả người dùng về đầu luồng.

### Nguyên tắc thiết kế

- Mỗi màn hình chỉ có một mục tiêu chính và một CTA cố định ở cuối màn hình.
- Hiển thị tiến độ theo nhóm như `Cá nhân · Người lái · Phương tiện · Xác nhận`, không dùng “Bước 4/15” gây cảm giác quá dài.
- Chụp giấy tờ trước, OCR tự điền, sau đó người dùng xác nhận. Không bắt nhập lại toàn bộ nội dung đã có trên giấy tờ.
- Chỉ hỏi giấy tờ áp dụng cho loại xe và tư cách đã chọn.
- Tự lưu sau mỗi màn hình; có thể thoát và tiếp tục sau.
- Camera là lựa chọn chính, thư viện/VNeID/VNeTraffic là lựa chọn phụ có nhãn nguồn rõ ràng.
- Trước mỗi lần chụp phải cho xem hình minh họa đúng loại giấy tờ, đúng mặt cần chụp và lý do bị từ chối thường gặp.

### Màn 1 — Bắt đầu đăng ký

**Mục tiêu:** đặt kỳ vọng trước khi xin dữ liệu.

- Tiêu đề: “Trở thành tài xế LEOPARD”.
- Hiển thị thời gian dự kiến hoàn thành, thời gian xét duyệt và danh sách giấy tờ theo loại xe sơ bộ.
- CTA chính: `Bắt đầu đăng ký`.
- CTA phụ: `Tôi đã có hồ sơ` để resume theo số điện thoại.

### Màn 2 — Khu vực, phương tiện và đơn vị vận tải

**Mục tiêu:** xác định checklist động.

- Tỉnh/thành hoạt động.
- Loại xe: xe máy, van, tải; khi cần thêm tải trọng/khối lượng toàn bộ.
- Chọn `Tôi thuộc đội xe/đơn vị vận tải` hoặc nhánh pháp lý khác đã được bật.
- Với fleet: quét/nhập mã mời, hiển thị tên pháp nhân để tài xế xác nhận.
- Sau màn này API trả về `requiredDocuments[]`, không để client tự suy đoán.

### Màn 3 — Chuẩn bị chụp căn cước

**Mục tiêu:** hướng dẫn trước khi mở camera.

- Minh họa mặt trước và mặt sau.
- Nhắc tháo khỏi ví, đặt trên nền phẳng, đủ sáng, không che số, không dùng bản photocopy.
- Nêu ngắn gọn mục đích xử lý và link tới privacy notice.
- CTA: `Chụp mặt trước`.

### Màn 4 — Chụp căn cước hai mặt

**Thứ tự:** mặt trước → xem lại → mặt sau → xem lại.

Camera có khung tỷ lệ thẻ, tự phát hiện bốn góc, cảnh báo rung/mờ/chói/cắt mép. Chỉ tự chụp khi tài liệu ổn định; luôn có nút chụp thủ công và trợ năng.

Sau mỗi ảnh hiển thị toàn màn hình với hai CTA `Dùng ảnh này` và `Chụp lại`. Không chuyển tiếp bằng ảnh thumbnail quá nhỏ.

### Màn 5 — Xác nhận thông tin cá nhân

OCR điền sẵn:

- Số định danh.
- Họ và tên.
- Ngày sinh, giới tính, quốc tịch.
- Ngày hết hạn hoặc giá trị sử dụng nếu có.
- Quê quán/nơi thường trú chỉ khi có mục đích nghiệp vụ đã được duyệt.
- Ngày cấp/cơ quan cấp từ mặt sau nếu mẫu giấy tờ thể hiện.

Trường có độ tin cậy thấp được tô nổi và yêu cầu kiểm tra. Người dùng được sửa OCR, nhưng hệ thống phải lưu cả `extractedValue` và `confirmedValue`; thay đổi quan trọng được đưa vào review thủ công.

### Màn 6 — Xác minh khuôn mặt

**Mục tiêu:** chứng minh người đang đăng ký trùng với giấy tờ và đang hiện diện.

- Selfie/liveness theo hướng dẫn một thao tác ngắn.
- So sánh với ảnh chân dung trên căn cước thông qua nhà cung cấp eKYC phù hợp.
- Có nhánh hỗ trợ thủ công cho thiết bị yếu, người khuyết tật hoặc nhận diện thất bại; không khóa vĩnh viễn sau một lần lỗi.
- Không hiển thị “đạt 83%”; chỉ dùng kết quả rõ ràng `Đã xác minh`, `Cần thử lại`, `Cần kiểm tra thủ công`.

Nếu pilot chưa tích hợp liveness đủ tin cậy, dùng ảnh chân dung và review thủ công, đồng thời ghi rõ chưa phải xác minh tự động.

### Màn 7 — Chụp giấy phép lái xe

**Thứ tự:** mặt có thông tin chính → mặt còn lại nếu mẫu/loại GPLX yêu cầu.

- Khung chụp và hướng dẫn giống căn cước.
- OCR lấy số GPLX, họ tên, ngày sinh, hạng, ngày cấp, ngày hết hạn và cơ quan cấp nếu thể hiện.
- Hệ thống so khớp họ tên/ngày sinh với căn cước và kiểm tra hạng GPLX theo loại xe.
- Nếu không khớp, giải thích chính xác trường nào cần kiểm tra; không báo chung “Hồ sơ không hợp lệ”.

### Màn 8 — Xác nhận GPLX

- Hiển thị ảnh ở trên, dữ liệu trích xuất ở dưới.
- Khóa logic ngày: ngày cấp không ở tương lai, ngày hết hạn phải sau ngày nộp.
- Hiển thị kết quả dễ hiểu: “Hạng B phù hợp với xe đã chọn” hoặc yêu cầu đổi phương tiện/GPLX.
- Nếu người dùng sửa số, hạng hoặc ngày hết hạn, bắt buộc manual review.

### Màn 9 — Thông tin phương tiện

- Biển số; có thể nhập trước để camera đối chiếu, nhưng giá trị từ giấy đăng ký xe vẫn là nguồn kiểm tra.
- Xe thuộc sở hữu của tài xế, người thân, fleet hay thuê/mượn.
- Ảnh xe: góc trước có biển số và góc bên thể hiện toàn xe; yêu cầu này phục vụ đối chiếu vận hành, không thay thế đăng ký xe.

### Màn 10 — Chụp giấy đăng ký xe

**Thứ tự:** mặt chứa biển số/chủ xe → mặt còn lại hoặc trang tiếp theo → giấy chứng minh quyền sử dụng nếu không chính chủ.

- Phải nhìn đủ bốn góc và rõ biển số.
- OCR ưu tiên: biển số, chủ xe, địa chỉ chủ xe, nhãn hiệu, loại xe, số khung, số máy, tải trọng/số chỗ và các trường có trên mẫu.
- Chuẩn hóa biển số để so khớp nhưng vẫn giữ nguyên chuỗi OCR gốc.
- Nếu chủ xe khác tài xế/fleet, mở màn phụ yêu cầu loại quan hệ và giấy tờ chứng minh quyền sử dụng theo rule pháp lý.

### Màn 11 — Giấy tờ điều kiện của xe

Đây là checklist động, không hiển thị cho xe không thuộc diện áp dụng.

**Xe van/tải/ô tô:**

1. Giấy kiểm định — chụp lần lượt mặt có biển số/số khung rồi mặt có thời hạn, hoặc cả hai mặt theo mẫu.
2. Bảo hiểm TNDS bắt buộc — chụp trang/mặt có số chứng nhận, biển số và thời hạn.
3. Phù hiệu hoặc giấy tờ vận tải gắn với đơn vị kinh doanh vận tải khi rule yêu cầu.

**Xe máy:**

1. Giấy đăng ký xe.
2. Bảo hiểm TNDS còn hiệu lực.
3. Các giấy tờ dịch vụ bổ sung chỉ khi được pháp chế xác định áp dụng.

OCR lấy biển số, số khung/số máy, loại xe, tải trọng và thời hạn; server đối chiếu chéo với giấy đăng ký xe. Ngày hết hạn là trường bắt buộc người dùng xác nhận.

### Màn 12 — Thông tin fleet/pháp nhân

- Nếu có mã mời: hiển thị tên, mã số và trạng thái fleet; tài xế chỉ xác nhận quan hệ.
- Fleet owner nhận yêu cầu và ghép tài xế với phương tiện trong cổng quản lý.
- Nếu nhánh tự kinh doanh được cho phép: yêu cầu hồ sơ pháp nhân/giấy phép theo checklist do backend trả về.
- Không để tài xế tự gõ tên một công ty rồi coi như đã xác minh.

### Màn 13 — Tài khoản nhận tiền

- Tên chủ tài khoản, ngân hàng và số tài khoản.
- Tên chủ tài khoản phải được ngân hàng/provider trả về để người dùng xác nhận; không chỉ dựa vào tên tự nhập.
- Cho phép tài khoản của pháp nhân/fleet nếu mô hình thanh toán quy định như vậy.
- Thông tin thuế chỉ thu theo mô hình đã được pháp chế và tài chính duyệt.

Màn này mặc định nằm sau `APPROVED` và trước kích hoạt thanh toán/rút tiền, không nằm trong năm chặng nộp hồ sơ ban đầu. Chỉ đưa vào onboarding sớm khi mô hình thanh toán bắt buộc xác minh tài khoản trước quyết định duyệt.

### Màn 14 — Kiểm tra hồ sơ

Hiển thị bốn nhóm có trạng thái:

- Danh tính.
- Điều kiện người lái.
- Phương tiện.
- Fleet/pháp nhân.

Mỗi nhóm có `Đã đủ`, `Cần kiểm tra`, hoặc `Còn thiếu` và nút quay lại đúng màn. Không hiển thị checkbox giấy tờ đơn thuần.

### Màn 15 — Điều khoản và ký

- Tóm tắt điều khoản chính, link mở/tải PDF đầy đủ.
- Checkbox điều khoản bắt buộc tách khỏi marketing.
- Nút `Xác nhận và nhận mã OTP`; OTP này là một sự kiện ký mới, không tái sử dụng OTP đăng nhập cũ.
- Sau OTP, hiển thị biên nhận có phiên bản, thời gian và link tải hợp đồng đã ký.

### Màn 16 — Nộp thành công và theo dõi

- Mốc thời gian dự kiến, mã hồ sơ và kênh hỗ trợ.
- Timeline `Đã nộp → Đang kiểm tra → Kết quả`.
- Cho phép xem hồ sơ đã nộp và tải hợp đồng.
- Tài xế có thể thoát app; push/SMS/deep link đưa họ về đúng hồ sơ.

### Màn 17 — Cần bổ sung

- Tiêu đề cụ thể: “Cần chụp lại mặt trước GPLX”.
- Hiển thị lý do chuẩn hóa như `Ảnh bị chói`, `Không đủ bốn góc`, `GPLX đã hết hạn`, `Biển số không khớp`.
- Một CTA đưa thẳng tới camera của tài liệu lỗi.
- Tài liệu đã xác minh vẫn được giữ nguyên.

### Màn 18 — Được duyệt và kích hoạt

- Checklist đào tạo an toàn/nghiệp vụ.
- Cấp quyền thông báo và vị trí theo đúng ngữ cảnh.
- Chọn phương tiện đã duyệt và kiểm tra kết nối.
- Kích hoạt role driver sau khi hoàn tất; trạng thái nhận đơn ban đầu là `OFFLINE`.

## 3B. Thứ tự chụp/tải giấy tờ chuẩn

```text
CCCD mặt trước
→ CCCD mặt sau
→ xác nhận dữ liệu CCCD
→ selfie/liveness
→ GPLX mặt thông tin chính
→ mặt còn lại nếu áp dụng
→ xác nhận và so khớp GPLX
→ đăng ký xe mặt/trang có biển số
→ mặt/trang còn lại
→ bằng chứng quyền sử dụng nếu không chính chủ
→ ảnh xe và biển số
→ đăng kiểm (có điều kiện)
→ bảo hiểm TNDS
→ phù hiệu/giấy tờ đơn vị vận tải (có điều kiện)
→ kiểm tra toàn bộ
→ ký hợp đồng
→ submit
```

Thứ tự này tạo chuỗi dữ liệu gốc: căn cước xác lập người, GPLX xác lập quyền lái, đăng ký xác lập xe, các chứng từ tiếp theo xác lập điều kiện vận hành. Hợp đồng được tạo cuối cùng từ dữ liệu đã xác nhận để tránh ký một PDF có thông tin sai.

Không gộp nhiều loại giấy tờ trong một ô upload. Mỗi mặt/trang là một capture task có `documentType`, `side/page`, hướng dẫn và tiêu chí chất lượng riêng.

## 3C. Cách lấy thông tin trên thẻ và giấy tờ

### Pipeline đề xuất

```text
Capture
→ Quality gate
→ Document classification
→ Crop/perspective correction
→ OCR + barcode/QR read nếu có
→ Field extraction theo loại/mẫu giấy tờ
→ Normalize
→ User confirmation
→ Cross-document validation
→ Server verification/manual review
```

### 1. Quality gate trên thiết bị

Trước upload, kiểm tra:

- Có đủ bốn góc, tài liệu chiếm phần lớn khung hình.
- Không mờ do rung, không chói che vùng chữ/ảnh.
- Không quá tối, độ phân giải đủ đọc.
- Đúng mặt/đúng loại tài liệu dự kiến.
- Không dùng ảnh thumbnail hoặc ảnh đã nén quá mức.

Nếu thất bại, đưa hướng dẫn sửa cụ thể ngay tại camera. Không upload rồi chờ admin từ chối vài giờ sau.

### 2. OCR và trích xuất trường

OCR chỉ trả text và vị trí/confidence; cần một lớp parser riêng theo `documentType` và phiên bản mẫu:

- Từ khóa neo: `Số/No`, `Họ và tên/Full name`, `Ngày sinh/Date of birth`, `Hạng/Class`, `Có giá trị đến/Expires`, `Biển số đăng ký`.
- Regex/normalizer cho số định danh, GPLX, biển số và ngày tháng.
- Giữ ảnh gốc, text OCR gốc, bounding box, confidence và parser version để audit.
- Không tự sửa các ký tự dễ nhầm như `0/O`, `1/I` mà không cho người dùng xác nhận.
- QR/barcode nếu đọc được là một nguồn bổ sung; không mặc định là dữ liệu đã được cơ quan nhà nước xác minh.

### 3. Ngưỡng xử lý

- Confidence cao và qua rule: tự điền, người dùng vẫn phải xác nhận.
- Confidence trung bình: highlight trường cần xem lại.
- Confidence thấp/thiếu trường: yêu cầu chụp lại trước; sau số lần hợp lý cho phép nhập tay và chuyển manual review.
- Mọi sửa đổi ở số định danh, số GPLX, hạng, biển số hoặc ngày hết hạn đều gắn cờ review.

OCR giúp nhập dữ liệu, **không thay thế xác minh tính thật của giấy tờ**. Xác minh production cần tích hợp nhà cung cấp eKYC/nguồn dữ liệu được phép hoặc review thủ công có audit; không tự động scrape VNeID/VNeTraffic hay cơ sở dữ liệu nhà nước.

### 4. Đối chiếu chéo bắt buộc

| Kiểm tra | Nguồn A | Nguồn B | Kết quả khi lệch |
|---|---|---|---|
| Danh tính | CCCD | GPLX | Yêu cầu xác nhận/manual review |
| Quyền lái | Hạng GPLX | Loại/trọng tải xe | Không cho submit cấu hình không phù hợp |
| Phương tiện | Biển số đăng ký | Đăng kiểm/bảo hiểm/ảnh xe | Chụp lại hoặc bổ sung chứng minh |
| Quyền sử dụng | Chủ xe | Tài xế/fleet | Yêu cầu giấy tờ quan hệ/quyền sử dụng |
| Hiệu lực | Ngày hết hạn | Ngày nộp/ngày dự kiến kích hoạt | Không duyệt nếu đã hết hạn |
| Pháp nhân | Fleet được xác minh | Hồ sơ vận tải/phương tiện | Fleet/admin xử lý ngoại lệ |

So khớp tên phải hỗ trợ bỏ dấu, khoảng trắng và thứ tự hiển thị để tìm ứng viên, nhưng quyết định cuối vẫn dùng giá trị pháp lý gốc và rule review; không tự coi hai tên khác nhau là cùng người.

### 5. Nguồn ảnh điện tử

- Cho phép tài xế chọn `Chụp giấy tờ vật lý` hoặc `Tải bản xuất trình từ VNeID/VNeTraffic` nếu chính sách chấp nhận.
- Khi chọn bản điện tử, hướng dẫn rõ màn hình nào phải có tên, số giấy tờ và trạng thái/thời hạn.
- Lưu `captureSource = CAMERA | LIBRARY | VNEID_PRESENTATION | VNETRAFFIC_PRESENTATION`.
- Ảnh chụp màn hình vẫn cần kiểm tra thủ công/chống gian lận; không coi nhãn VNeID trên ảnh là bằng chứng xác thực độc lập.

## 3D. Gợi ý triển khai cho stack hiện tại

Driver app hiện chỉ có `expo-image-picker`, phù hợp chọn/chụp ảnh cơ bản nhưng chưa tạo trải nghiệm scan tài liệu hoàn chỉnh.

**Phase 1 — triển khai nhanh:**

- Xây `DocumentCaptureScreen` dùng camera/image picker với overlay từng loại giấy tờ.
- Nén có kiểm soát, giữ độ phân giải đọc được và checksum.
- OCR phía server hoặc provider; trả `extractedFields` và confidence.
- Màn xác nhận dữ liệu và manual review của admin.

**Phase 2 — nâng chất lượng native:**

- Android có thể dùng Google ML Kit Document Scanner/Text Recognition; scanner hỗ trợ crop/chỉnh phối cảnh và trả ảnh người dùng đã chọn.
- iOS dùng VisionKit Document Camera và Vision Text Recognition.
- Expo cần development build/native module phù hợp; không nên thêm thư viện OCR thiếu bảo trì chỉ để giữ Expo Go.
- Tách interface `DocumentScannerProvider` và `DocumentExtractionProvider` để web/native/provider có thể thay thế độc lập.

Không gửi ảnh định danh sang nhiều dịch vụ phân tích cùng lúc. Provider contract phải quy định khu vực xử lý, thời hạn lưu, xóa dữ liệu, quyền truy cập, log và xử lý sự cố theo privacy/legal review.

## 3E. Đối chiếu với thực tế thị trường

- Lalamove hướng dẫn chụp đúng từng loại giấy tờ, đủ bốn góc, rõ biển số và không dùng ảnh chụp màn hình đối với một số luồng; đăng kiểm có thể cần hai mặt theo mẫu. Họ cũng công bố khả năng xuất trình GPLX/đăng ký xe từ VNeID hoặc VNeTraffic.
- Lalamove Fleet tách tài xế khỏi xe và cho chủ đội xe ghép tài xế với phương tiện; đây là cơ sở thực tế cho `DriverAffiliation` và bước fleet xác nhận.
- Grab công bố checklist thay đổi theo dịch vụ/loại xe và có giai đoạn kiểm tra hồ sơ trước khi kích hoạt; xe ô tô có thêm đăng kiểm, bảo hiểm và hồ sơ điều kiện so với xe hai bánh.
- Các ví dụ thị trường chỉ dùng để tham khảo UX/checklist. LEOPARD vẫn phải xác lập checklist của mình theo mô hình pháp lý, loại hàng hóa và văn bản đang có hiệu lực.

## 3F. Thiết kế phần hợp đồng trong một trang

### “Một trang” nên được hiểu như thế nào

Nên có **một route hợp đồng duy nhất trong app**, nhưng không ép toàn bộ nội dung pháp lý vào một viewport điện thoại. Route này có thể cuộn và gồm:

1. Bản tóm tắt các điều khoản trọng yếu bằng ngôn ngữ dễ hiểu.
2. Nút mở/tải PDF hợp đồng đầy đủ đúng phiên bản.
3. Các xác nhận bắt buộc tách biệt.
4. CTA ký bằng OTP cố định ở cuối sau khi tài xế đã có cơ hội đọc/tải hợp đồng.

Nếu yêu cầu PDF đúng **một mặt A4**, nên dùng “Thỏa thuận khung rút gọn” dẫn chiếu tới các phụ lục/chính sách có phiên bản. Không nên thu nhỏ chữ hoặc bỏ điều khoản quan trọng chỉ để đủ một trang. Tài xế phải được truy cập, tải và lưu cả tài liệu được dẫn chiếu tại thời điểm ký.

### Đánh giá mẫu hợp đồng `v1` hiện tại

| Nội dung hiện tại | Vấn đề | Điều chỉnh cần có |
|---|---|---|
| “Công ty Leopard” | Không đủ định danh pháp nhân | Tên pháp lý, mã số doanh nghiệp, địa chỉ, đại diện, kênh liên hệ |
| Gọi Bên A là nền tảng trung gian nhưng nói “phân bổ đơn” | Không rõ Bên A chỉ kết nối hay tổ chức vận tải | Chốt mô hình; dùng đúng thuật ngữ “hiển thị/đề xuất đơn” nếu tài xế tự quyết định |
| Tài xế là cá nhân độc lập | Có thể không phù hợp nếu thực tế có quản lý, điều hành, giám sát như quan hệ lao động | Legal review mô hình thực tế; dùng mẫu hợp đồng lao động nếu thuộc trường hợp đó |
| Phí dịch vụ “nếu có”, theo chính sách hiện hành | Phí và quyền thay đổi quá mở | Ghi công thức/phụ lục phí, chu kỳ trả, khấu trừ, quy trình thông báo thay đổi |
| Tài xế chịu trách nhiệm bồi thường chung | Thiếu trình tự xác định lỗi, phạm vi, giới hạn và khiếu nại | Quy định biên bản, bằng chứng, thời hạn phản hồi, bảo hiểm và trường hợp loại trừ |
| Chấm dứt bất kỳ lúc nào, không cần lý do | Quá rộng và thiếu cơ chế xử lý đơn/số dư đang mở | Thời hạn, báo trước, tạm khóa khẩn cấp, quyền giải trình/khiếu nại, quyết toán cuối |
| Chỉ có chữ ký tài xế | Thiếu bằng chứng chấp thuận của pháp nhân và định danh người ký | Chữ ký/đóng dấu điện tử phù hợp của Bên A hoặc cơ chế phát hành/chấp thuận được pháp chế duyệt |
| Chữ ký dạng tên nhập | Chứng cứ yếu nếu đứng riêng | OTP/re-auth gắn với hash PDF, thời điểm, tài khoản và receipt |
| Không có phiên bản tài liệu dẫn chiếu | Chính sách có thể thay đổi sau khi ký | Đóng băng version/hash của hợp đồng, phụ lục phí và quy tắc vận hành |
| Không có thời hạn/hiệu lực | Khó biết bắt đầu và kết thúc khi nào | Ngày hiệu lực, thời hạn, gia hạn/chấm dứt |
| Không có quy trình thông báo/khiếu nại | Khó chứng minh đã thông báo và bảo đảm quyền giải trình | Kênh, thời điểm nhận, SLA và đầu mối giải quyết |

### Nội dung nên giữ trên một mặt A4

Một trang A4 chỉ nên giữ các điều khoản tạo quyết định ký:

1. Thông tin và tư cách hai bên.
2. Mục đích/phạm vi hợp tác và vai trò đơn vị vận tải.
3. Cách hình thành từng đơn vận chuyển.
4. Điều kiện người lái/phương tiện và nghĩa vụ an toàn.
5. Cước, phí, thanh toán và thuế.
6. Trách nhiệm hàng hóa, sự cố và bảo hiểm.
7. Dữ liệu/vị trí và tài liệu privacy được dẫn chiếu.
8. Thời hạn, tạm khóa, chấm dứt và khiếu nại.
9. Luật áp dụng, giải quyết tranh chấp và hiệu lực điện tử.
10. Khối ký hai bên, mã hợp đồng, version/hash và thời điểm ký.

Chi tiết dài như bảng phí theo loại xe, quy trình giao nhận, danh mục hàng cấm, mức bồi thường, retention dữ liệu và quy trình khiếu nại nên nằm trong phụ lục có mã phiên bản. Không dùng link trỏ tới một trang có thể bị sửa mà không lưu snapshot.

### Bản nháp một trang đề xuất

> **Lưu ý:** Đây là bản nháp cấu trúc và ngôn ngữ sản phẩm. Tên pháp nhân, mô hình vận tải, thuế, mức trách nhiệm, thời hạn và cơ chế chữ ký phải được luật sư phê duyệt trước khi dùng.

---

**THỎA THUẬN KHUNG SỬ DỤNG NỀN TẢNG DÀNH CHO TÀI XẾ**  
Mã hợp đồng: **{{contractId}}** · Phiên bản: **{{version}}** · Ngày hiệu lực: **{{effectiveDate}}**

**Bên A – Đơn vị vận hành nền tảng:** **{{legalCompanyName}}**, mã số doanh nghiệp **{{enterpriseNumber}}**, địa chỉ **{{address}}**, đại diện **{{representative}}**, email/điện thoại hỗ trợ **{{supportContact}}**.

**Bên B – Tài xế:** **{{driverFullName}}**, số định danh **{{identityNumber}}**, điện thoại đã xác thực **{{verifiedPhone}}**, GPLX số **{{licenseNumber}}**, hạng **{{licenseClass}}**, phương tiện biển số **{{licensePlate}}**. Đơn vị vận tải/fleet liên kết: **{{transportOperatorNameAndId}}**.

**1. Phạm vi và vai trò.** Bên A cung cấp nền tảng công nghệ để hiển thị và hỗ trợ kết nối yêu cầu vận chuyển. Bên B chỉ được hoạt động thông qua tư cách/đơn vị vận tải nêu trên và tự quyết định nhận hoặc từ chối từng đơn, trừ khi mô hình pháp lý đã được xác định khác trong Phụ lục A. Thỏa thuận này không tự thay thế giấy phép, hợp đồng lao động hoặc nghĩa vụ của đơn vị kinh doanh vận tải theo pháp luật.

**2. Từng đơn vận chuyển.** Trước khi nhận đơn, ứng dụng hiển thị tối thiểu điểm nhận/giao, loại hàng, yêu cầu phương tiện, cước dự kiến, phí áp dụng và hướng dẫn đặc biệt. Khi Bên B nhấn “Nhận đơn”, dữ liệu đơn và Quy tắc vận hành phiên bản **{{operationsVersion}}** trở thành căn cứ thực hiện. Bên B không nhận hàng cấm, hàng vượt tải hoặc đơn không phù hợp giấy tờ/phương tiện đã duyệt.

**3. Điều kiện và an toàn.** Bên B cam kết thông tin, GPLX, quyền sử dụng xe, kiểm định, bảo hiểm và giấy tờ vận tải áp dụng là hợp lệ, còn hiệu lực; tuân thủ pháp luật giao thông, quy trình giao nhận và bảo vệ hàng hóa; không giao tài khoản/đơn cho người khác. Bên B phải báo ngay sự cố, tai nạn, mất hoặc hư hỏng hàng qua kênh hỗ trợ và phối hợp cung cấp bằng chứng.

**4. Cước, phí và thuế.** Khoản Bên B được nhận, phí nền tảng, khoản điều chỉnh/khấu trừ hợp lệ và chu kỳ đối soát được xác định tại từng đơn và Phụ lục phí phiên bản **{{feeScheduleVersion}}**. Bên A không được áp dụng hồi tố thay đổi bất lợi cho đơn đã nhận. Việc thay đổi phí cho đơn tương lai phải được thông báo trước **{{noticePeriod}}**. Mỗi bên thực hiện nghĩa vụ thuế của mình theo tư cách pháp lý áp dụng; khoản khấu trừ thuế, nếu có, phải hiển thị trên đối soát.

**5. Hàng hóa, bảo hiểm và trách nhiệm.** Trách nhiệm được xác định theo lỗi, dữ liệu giao nhận, bằng chứng và pháp luật áp dụng; không tự động khấu trừ chỉ dựa trên khiếu nại một phía. Phạm vi bồi thường, giới hạn, loại trừ, bảo hiểm và quy trình xử lý khiếu nại thực hiện theo Phụ lục trách nhiệm phiên bản **{{liabilityVersion}}**. Quy định này không loại trừ trách nhiệm không được phép loại trừ theo pháp luật.

**6. Dữ liệu và vị trí.** Bên A xử lý dữ liệu đăng ký, vận hành và vị trí theo Thông báo xử lý dữ liệu phiên bản **{{privacyNoticeVersion}}**. Vị trí chính xác chỉ được thu theo trạng thái và mục đích đã công bố. Bên B có quyền truy cập, yêu cầu sửa và thực hiện các quyền dữ liệu qua **{{privacyContact}}**. Đồng ý marketing, nếu có, là lựa chọn riêng và không phải điều kiện ký.

**7. Thời hạn, tạm khóa và chấm dứt.** Thỏa thuận có hiệu lực từ thời điểm ký điện tử và kéo dài cho đến khi chấm dứt. Mỗi bên có thể chấm dứt theo thời hạn báo trước **{{terminationNotice}}**. Bên A chỉ tạm khóa ngay khi có nguy cơ an toàn, gian lận, giấy tờ hết hạn hoặc vi phạm nghiêm trọng; phải thông báo lý do, phạm vi, cách khắc phục/khiếu nại và xử lý các đơn, số dư đang mở theo Phụ lục A.

**8. Khiếu nại và tranh chấp.** Bên B gửi khiếu nại qua **{{complaintChannels}}**; Bên A xác nhận tiếp nhận trong **{{ackSla}}** và trả lời trong **{{resolutionSla}}**, trừ vụ việc phức tạp có thông báo gia hạn. Tranh chấp trước hết được thương lượng/hòa giải; nếu không thành, được giải quyết tại cơ quan có thẩm quyền theo pháp luật Việt Nam.

**9. Hiệu lực điện tử.** Bên B xác nhận đã được mở, tải và có cơ hội đọc Thỏa thuận cùng các tài liệu dẫn chiếu đúng phiên bản trước khi ký. Mã OTP dùng một lần gắn với tài khoản đã xác thực và hash bộ tài liệu **{{documentBundleHash}}** thể hiện sự chấp thuận của Bên B. Mỗi bên nhận được bản PDF/biên nhận điện tử có thể truy cập, tải và đối chiếu tính toàn vẹn.

| ĐẠI DIỆN BÊN A | BÊN B – TÀI XẾ |
|---|---|
| {{companySignerOrSeal}} | {{driverFullName}} |
| Ký/phát hành lúc: {{companySignedAt}} | OTP xác nhận lúc: {{driverSignedAt}} |

**Tài liệu cấu thành bộ hợp đồng:** Phụ lục A – Quy tắc vận hành `{{operationsVersion}}`; Phụ lục B – Biểu phí `{{feeScheduleVersion}}`; Phụ lục C – Trách nhiệm/bảo hiểm `{{liabilityVersion}}`; Thông báo dữ liệu `{{privacyNoticeVersion}}`.

---

### Bố cục PDF một mặt A4

- Khổ A4, lề 14–16 mm; font tiếng Việt 9.5–10 pt, line-height 1.2–1.3; không nhỏ hơn để ép trang.
- Tiêu đề, mã/version/hash ở đầu; thông tin hai bên dạng bảng hai cột ngắn.
- Điều khoản đánh số 1–9, mỗi điều một đoạn; dùng chữ đậm cho tiền, thời hạn, quyền chấm dứt và tài liệu dẫn chiếu.
- Khối ký hai cột và danh mục phụ lục ở cuối.
- Renderer phải đo chiều cao và fail build/render nếu tràn sang trang hai; không tự giảm font động.
- Bản mobile không hiển thị PDF thu nhỏ để đọc. Nội dung được render thành section/card, còn PDF là bản tải và bằng chứng.
- Nếu nội dung đã được legal duyệt không vừa một mặt ở cỡ chữ trên, cho phép PDF sang trang hai; ưu tiên khả năng đọc và tính đầy đủ hơn mục tiêu hình thức “một mặt”.
- Số định danh đầy đủ chỉ nằm trong PDF đã ký có kiểm soát truy cập; màn tóm tắt mobile và thông báo thông thường phải che bớt.

### Bố cục một route trên mobile

```text
Header: Thỏa thuận tài xế · Phiên bản · nút tải PDF
→ Card “Bạn đang ký với ai”
→ 5 điểm chính: nhận đơn, phí, trách nhiệm, dữ liệu, chấm dứt
→ Link mở 4 tài liệu cấu thành bộ hợp đồng
→ Checkbox 1: đã đọc hợp đồng và phụ lục bắt buộc
→ Checkbox 2: xác nhận thông tin tài xế/phương tiện đúng
→ Marketing toggle riêng, mặc định tắt
→ CTA cố định: Xác nhận và nhận mã OTP
```

Không dùng một checkbox “Tôi đồng ý tất cả” bao gồm cả marketing. Không bắt người dùng kéo đến cuối chỉ để mở nút; thay vào đó ghi nhận việc tài liệu đã được mở/tải, hiển thị các điều khoản nổi bật và yêu cầu xác nhận rõ ràng.

### Bằng chứng ký hệ thống phải lưu

- Contract ID, version và hash của toàn bộ PDF/phụ lục.
- Snapshot từng file đã ký; không render lại từ template mới khi tải về.
- User ID, số điện thoại đã xác thực và application revision.
- OTP challenge/event ID, thời điểm phát hành/xác nhận và kết quả xác thực.
- Phương thức ký, signer của Bên A, thời điểm hiệu lực.
- Receipt gửi cho tài xế và log cho phép chứng minh tài liệu có thể truy cập/tải.
- IP/device metadata chỉ khi privacy notice, mục đích và retention đã được duyệt.

`signedByName` và ảnh chữ ký viết tay không đủ làm bằng chứng đứng riêng. Trọng tâm là xác định người ký, sự chấp thuận với đúng bundle tài liệu và khả năng phát hiện mọi thay đổi sau ký.

## 4. Mô hình dữ liệu tối thiểu

### `DriverApplication`

`id`, `userId`, `legalModel`, `operatorId`, `status`, `currentRevision`, `submittedAt`, `approvedAt`, `rejectedAt`, `withdrawnAt`, `decisionReasonCode`.

Trạng thái hồ sơ phải tách khỏi `User.status`. `User.status` chỉ mô tả tài khoản như `ACTIVE`, `DISABLED`, `SUSPENDED`.

### `DriverDocument`

Bổ sung `applicationId`, `type`, `documentNumber`, `holderName`, `issuer`, `issuedAt`, `expiresAt`, `vehiclePlate`, `reviewStatus`, `reasonCode`, `reviewedById`, `reviewedAt`, `version`, `checksumSha256`.

Không coi “có một record cùng type” là đã đạt KYC. Chỉ tài liệu `VERIFIED` và còn hiệu lực mới thỏa điều kiện.

### `DriverAffiliation`

`driverProfileId`, `operatorId/fleetId`, `relationshipType`, `validFrom`, `validTo`, `status`, `verifiedById`.

### `ConsentRecord`

`userId`, `noticeType`, `noticeVersion`, `purpose`, `decision`, `capturedAt`, `withdrawnAt`, `evidence`.

### `ContractAcceptance`

`applicationRevision`, `contractVersion`, `documentHash`, `pdfStorageKey`, `signMethod`, `authEventId`, `signedAt`, `signedBy`, `evidenceMetadata`.

## 5. Quy tắc API đề xuất

- `POST /driver/applications` — tạo draft, không đổi role.
- `PATCH /driver/applications/:id/steps/:step` — lưu từng bước có version chống ghi đè.
- `POST /driver/applications/:id/documents` — upload resumable/idempotent.
- `POST /driver/applications/:id/sign` — ký đúng snapshot sau xác thực lại.
- `POST /driver/applications/:id/submit` — kiểm tra điều kiện và đóng revision.
- `POST /admin/driver-applications/:id/request-changes` — trả về mã lỗi theo tài liệu.
- `POST /admin/driver-applications/:id/approve` — chỉ duyệt khi mọi rule áp dụng đã `VERIFIED`.
- `POST /driver/applications/:id/activate` — hoàn thành checklist và cấp quyền driver.

Mọi lệnh ghi phải có `clientRequestId`, audit log và kiểm tra quyền sở hữu hồ sơ. URL xem giấy tờ phải ngắn hạn; quyền admin/fleet phải dựa trên nhiệm vụ và quan hệ hợp lệ.

## 6. Thứ tự triển khai

### Phase 0 — Quyết định pháp lý

1. Chốt LEOPARD là nền tảng kết nối hay đơn vị kinh doanh vận tải.
2. Chốt các loại quan hệ tài xế được phép trong pilot.
3. Luật sư duyệt hợp đồng, privacy notice, retention schedule và checklist giấy tờ theo từng loại xe.

### Phase 1 — Sửa lõi hồ sơ

1. Tách `DriverApplication.status` khỏi `User.status`.
2. Thêm operator/fleet affiliation.
3. Thêm metadata, expiry và review status cho tài liệu.
4. Thêm `ACTION_REQUIRED`, revision và submit snapshot.

### Phase 2 — Sửa trải nghiệm mobile/admin

1. Wizard 7–8 bước, autosave và resume.
2. Checklist động theo tư cách/loại xe.
3. Ký có re-auth/OTP và receipt tải về.
4. Admin review từng trường/tài liệu với reason code.

### Phase 3 — Tuân thủ sau kích hoạt

1. Nhắc hết hạn và compliance hold.
2. Re-verification khi đổi xe/fleet.
3. Quy trình truy cập, sửa, rút đồng ý và xóa dữ liệu.

## 7. Điều kiện nghiệm thu

- Không thể kích hoạt tài xế khi chưa xác định đơn vị vận tải/tư cách pháp lý áp dụng.
- Không thể duyệt chỉ dựa vào sự tồn tại của file.
- Hạng GPLX, biển số, quyền sử dụng xe và mọi giấy tờ bắt buộc áp dụng đều đã được xác minh và còn hạn.
- Một tài liệu lỗi trả hồ sơ về `ACTION_REQUIRED`, không làm mất các mục đã xác minh.
- Mất mạng ở bất kỳ bước nào không tạo hồ sơ/hợp đồng trùng và không mất tiến độ.
- Bản hợp đồng tải về khớp hash và đúng phiên bản người dùng đã ký.
- Consent marketing tách riêng; privacy notice và consent evidence có phiên bản.
- Hồ sơ hết hạn bị chặn nhận đơn mới theo rule, không bị mất quyền truy cập hỗ trợ.
- Admin/fleet chỉ xem hồ sơ thuộc phạm vi nhiệm vụ, mọi lượt xem và quyết định quan trọng có audit.

## 8. Cơ sở pháp lý cần dùng khi pháp chế rà soát

- [Luật Đường bộ 35/2024/QH15](https://vanban.chinhphu.vn/?classid=1&docid=211193&pageid=27160), hiệu lực 01/01/2025.
- [Luật Trật tự, an toàn giao thông đường bộ 36/2024/QH15](https://vanban.chinhphu.vn/?classid=1&docid=211194&pageid=27160), hiệu lực 01/01/2025.
- [Nghị định 158/2024/NĐ-CP về hoạt động vận tải đường bộ](https://vanban.chinhphu.vn/?classid=1&docid=212082&pageid=27160&typegroupid=4), hiệu lực 01/01/2025.
- [Nghị định 218/2026/NĐ-CP sửa đổi Nghị định 158](https://vanban.chinhphu.vn/?classid=1&docid=218537&pageid=27160), hiệu lực 10/08/2026.
- [Nghị định 67/2023/NĐ-CP về bảo hiểm bắt buộc](https://vanban.chinhphu.vn/?classid=1&docid=208599&orggroupid=2&pageid=27160) và văn bản sửa đổi áp dụng tại thời điểm triển khai.
- [Thông tư 36/2024/TT-BYT về sức khỏe người lái xe](https://vanban.chinhphu.vn/?classid=1&docid=211769&pageid=27160).
- [Bộ luật Lao động 45/2019/QH14](https://vanban.chinhphu.vn/?classid=1&docid=198540&pageid=27160&typegroupid=3).
- [Luật Giao dịch điện tử 20/2023/QH15](https://vanban.chinhphu.vn/?classid=1&docid=208421&pageid=27160&typegroupid=3), hiệu lực 01/07/2024.
- [Bộ luật Dân sự 91/2015/QH13](https://vanban.chinhphu.vn/?classid=&docid=183188&pageid=27160), dùng để legal review điều kiện giao kết, nội dung và hiệu lực hợp đồng.
- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://vanban.chinhphu.vn/?docid=214590&pageid=27160) và [Nghị định 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160), cùng hiệu lực 01/01/2026.

Nguồn tham khảo cho UX và kỹ thuật capture/OCR:

- [Lalamove — hướng dẫn chụp đúng loại giấy tờ](https://www.lalamove.com/vi-vn/driver/chup-dung-loai-giay-to-dang-ky).
- [Lalamove — quy định chụp giấy tờ và xuất trình qua VNeID/VNeTraffic](https://www.lalamove.com/vi-vn/driver/quy-dinh-chup-anh-giay-to).
- [Grab Việt Nam — điều kiện và hồ sơ đăng ký theo dịch vụ](https://www.grab.com/vn/driver/drive/).
- [Google ML Kit — Document Scanner](https://developers.google.com/ml-kit/vision/doc-scanner) và [Text Recognition v2](https://developers.google.com/ml-kit/vision/text-recognition/v2).
- [Apple VisionKit](https://developer.apple.com/documentation/visionkit) và [Vision Text Recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images).

Danh mục này là đầu vào cho legal review, không thay thế ý kiến pháp lý. Checklist cuối phải căn cứ mô hình kinh doanh, loại phương tiện, tải trọng, địa bàn và loại hàng hóa thực tế của LEOPARD.
