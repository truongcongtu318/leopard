**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**

**Độc lập – Tự do – Hạnh phúc**

———————————————

**HỢP ĐỒNG PHÁT TRIỂN ỨNG DỤNG**

**PHIÊN BẢN MVP/DEMO HỆ THỐNG KẾT NỐI VẬN TẢI HÀNG HÓA**

**DỰ ÁN: LEOPARD**

Số: ……………

Hôm nay, ngày …… tháng …… năm 2026, tại Trường Đại học FPT, chúng tôi gồm:

**BÊN A (BÊN THUÊ / CHỦ DỰ ÁN) – KHỐI KINH TẾ FPT**

| **Thông tin** | **Chi tiết** |
| --- | --- |
| Tên nhóm / Tổ chức | Nhóm Sinh Viên Khoa Kinh Tế – Đại học FPT |
| Đại diện | Hoàng Huỳnh Giang |
| Mã số sinh viên | DS180441 |
| Căn cước công dân |     |
| Email liên hệ | Gianghhds180441@fpt.edu.vn |
| Điện thoại | 0972989247 |
| Ngành | Kinh doanh quốc tế |
| Sau đây gọi là | “BÊN A” hoặc “Bên Kinh Tế” |

**BÊN B (BÊN NHẬN PHÁT TRIỂN / TEAM DEV) – KHỐI IT FPT**

| **Thông tin** | **Chi tiết** |
| --- | --- |
| Tên nhóm / Tổ chức | Nhóm Sinh Viên Khoa Công Nghệ Thông Tin – Đại học FPT |
| Đại diện | Trần Văn Linh |
| Căn cước công dân |     |
| Mã số sinh viên | DE180719 |
| Email liên hệ | Linhtvde180719@fpt.edu.vn |
| Điện thoại |     |
| Ngành | Kỹ thuật phần mềm |
| Sau đây gọi là | “BÊN B” hoặc “Bên IT” |

**Hai bên cùng thống nhất ký kết Hợp đồng Phát triển Ứng dụng phiên bản MVP/Demo với các điều khoản như sau:**

**ĐIỀU 1. ĐỐI TƯỢNG VÀ PHẠM VI HỢP ĐỒNG**

1.1. Bên A thuê Bên B thiết kế, lập trình, triển khai và bàn giao phiên bản MVP/Demo của hệ thống kết nối vận tải hàng hóa LEOPARD dưới dạng Web App/PWA hoạt động trên trình duyệt web.

1.2. Tên dự án: LEOPARD – Hệ thống kết nối vận tải hàng hóa.

1.3. Nền tảng triển khai: Web App/PWA cho khách hàng và tài xế, Dashboard Web cho Admin, Backend API và cơ sở dữ liệu.

1.4. Tính chất sản phẩm: Phiên bản MVP/Demo phục vụ trình diễn, kiểm thử nghiệp vụ, thuyết trình và làm nền tảng phát triển giai đoạn sau. Sản phẩm không được hiểu là hệ thống production thương mại hoàn chỉnh, không cam kết SLA 24/7 và không cam kết chịu tải lớn như hệ thống logistics vận hành thực tế.

**1.5. Phạm vi MVP bắt buộc Bên B thực hiện**

*   Thiết kế và triển khai giao diện trực tiếp trên source code cho các luồng chính của Customer, Driver và Admin. Hai bên thống nhất không thực hiện và không bàn giao file Figma, prototype hoặc mockup UI riêng, trừ khi có thỏa thuận bổ sung.
*   Xây dựng Web App/PWA responsive cho khách hàng, tài xế và Admin Dashboard cơ bản.
*   Phát triển Backend API bằng NestJS + Prisma và Database PostgreSQL + PostGIS.
*   Phân quyền tài khoản cơ bản: Customer, Driver, Admin.
*   Chức năng đặt đơn vận chuyển: điểm lấy hàng, điểm giao hàng, tối đa 03 điểm dừng, loại xe, ghi chú, ảnh hàng hóa và trạng thái đơn.
*   Tích hợp Vietmap ở mức MVP: hiển thị bản đồ, tìm kiếm địa chỉ, autocomplete, geocoding, routing cơ bản, tính khoảng cách và thời gian dự kiến từ API.
*   Tài xế xem đơn, nhận đơn, cập nhật trạng thái vận chuyển và gửi vị trí tracking ở mức MVP.
*   Realtime tracking qua WebSocket/Socket.IO ở mức demo: hiển thị marker tài xế và cập nhật trạng thái đơn.
*   Upload ảnh hàng hóa, ảnh xác nhận giao hàng và giấy tờ cơ bản nếu cần.
*   Tích hợp thanh toán VietQR/payOS ở mức tạo QR/mã thanh toán theo đơn và có xuất hóa đơn VAT; không bắt buộc tự động đối soát ngân hàng.
*   Admin Dashboard cơ bản: quản lý người dùng, tài xế, đơn hàng, trạng thái và xem chi tiết đơn.
*   Kiểm thử, sửa lỗi trong phạm vi MVP, triển khai server và viết tài liệu bàn giao.

**1.6. Phạm vi optional / chuyển sang giai đoạn sau**

*   AI ETA bằng XGBoost ở mức mô hình chính xác cao; trong MVP chỉ thực hiện ETA dựa trên Vietmap/rule cơ bản hoặc demo kỹ thuật nếu còn thời gian.
*   Tối ưu ghép đơn/VRP bằng OR-Tools ở mức vận hành thực tế; trong MVP chỉ demo với dữ liệu mẫu nếu core đã hoàn thành.
*   Fleet Owner Dashboard nâng cao.
*   Truck routing chuyên sâu tránh cấm tải, cầu thấp, giờ cấm bằng dữ liệu giao thông đầy đủ.
*   Ứng dụng native Android/iOS đưa lên Google Play/App Store.
*   Tự động đối soát ngân hàng, tích hợp MoMo/VNPay hoặc các cổng thanh toán phức tạp.
*   Cam kết 500 người dùng đồng thời, SLA uptime 24/7, monitoring production chuyên sâu.

**ĐIỀU 2. THỜI GIAN THỰC HIỆN, QUY TRÌNH DEV VÀ MỐC BÀN GIAO**

2.1. Thời gian thực hiện hợp đồng: 12 tuần kể từ ngày hai bên xác nhận khởi động dự án, dự kiến từ 01/07/2026 đến 15/09/2026. Timeline được xây dựng theo quy trình phát triển phần mềm gồm: phân tích yêu cầu, dựng layout và màn hình trực tiếp trên source code, phát triển theo sprint, demo module, nhận phản hồi, chỉnh sửa, kiểm thử, UAT, deploy và bàn giao.

2.2. Sau mỗi module/mốc bàn giao, Bên B gửi bản demo hoặc đường dẫn truy cập cho Bên A xem qua. Bên A có tối đa 03 ngày làm việc để tổng hợp nhận xét. Các phản hồi phải nằm trong phạm vi MVP đã thống nhất. Nếu quá thời hạn mà Bên A không phản hồi, module được xem là tạm chấp nhận để Bên B tiếp tục sprint tiếp theo.

2.3. Mỗi module được hỗ trợ 01 vòng chỉnh sửa nhỏ theo feedback hợp lệ. Các yêu cầu làm phát sinh module mới, luồng mới, database/API lớn mới hoặc thay đổi logic chính sẽ được xem là Change Request và xử lý theo Điều 5.

| **Giai đoạn** | **Tuần** | **Quy trình dev** | **Nội dung bàn giao** | **Review/Feedback của Bên A** | **Xử lý nếu trễ** |
| --- | --- | --- | --- | --- | --- |
| GĐ 1 | Tuần 1–2 | Kickoff, phân tích yêu cầu, chốt scope MVP, setup repo/dev environment | SRS rút gọn, backlog MVP, kiến trúc sơ bộ, kế hoạch sprint | Review trong 03 ngày làm việc; feedback gộp 01 lần | Gia hạn nếu do A chậm phản hồi; nếu do B trễ > 05 ngày làm việc: 50.000 VND/ngày, tối đa 300.000 VND |
| GĐ 2 | Tuần 3–4 | Database design, base API, auth skeleton, dựng layout base và giao diện nền trực tiếp trên source code | DB schema, API base, repo structure, layout base, menu/navigation, màn hình đăng nhập, hồ sơ cơ bản, khung giao diện Customer/Driver/Admin chạy được trên code | Review trong 03 ngày; chỉnh 01 vòng nhỏ | Phạt chỉ áp dụng nếu lỗi chủ quan của B; tối đa 300.000 VND cho giai đoạn |
| GĐ 3 | Tuần 5–6 | Dev core booking và Vietmap; demo module đầu tiên | Tạo đơn, tìm kiếm địa chỉ, lấy tọa độ, routing cơ bản, tài xế xem/nhận đơn | Bên A test luồng core và gửi danh sách lỗi/nhận xét | Nếu trễ chủ quan > 05 ngày làm việc: 50.000 VND/ngày, tối đa 500.000 VND |
| GĐ 4 | Tuần 7–8 | Dev tracking, upload media, VietQR/payOS, Admin basic | Tracking MVP, upload ảnh, tạo QR thanh toán, Admin xem/quản lý đơn và user cơ bản | Demo module; chỉnh 01 vòng nhỏ trong MVP | Nếu trễ chủ quan > 05 ngày làm việc: 50.000 VND/ngày, tối đa 500.000 VND |
| GĐ 5 | Tuần 9–10 | Integration, bug fixing, UAT nội bộ, tối ưu luồng demo | Bản Beta tích hợp, checklist test, danh sách lỗi đã sửa/chưa sửa, hướng dẫn test | Bên A UAT trong 05 ngày làm việc; không thêm chức năng lớn ở giai đoạn này | Ưu tiên điều chỉnh kế hoạch; phạt tối đa 500.000 VND nếu trễ do B |
| GĐ 6 | Tuần 11–12 | Stabilize, deploy, tài liệu, final handover | Bản Final MVP, source code, database schema, tài liệu cài đặt/deploy, tài liệu cấu hình API, biên bản bàn giao | Nghiệm thu trong 05 ngày làm việc | Nếu B trễ final do lỗi chủ quan > 07 ngày làm việc: 50.000 VND/ngày, tối đa 1.000.000 VND |

_2.4. Các mức phạt trên là mức phạt thiện chí nhỏ nhằm nhắc tiến độ, không áp dụng nếu nguyên nhân chậm đến từ Bên A, thay đổi yêu cầu, dịch vụ bên thứ ba, chậm thanh toán, hoặc sự kiện khách quan ngoài khả năng kiểm soát của Bên B._

**ĐIỀU 3. CHI PHÍ VÀ PHƯƠNG THỨC THANH TOÁN**

**3.1. Tổng giá trị hợp đồng: 15.000.000 VND (Bằng chữ: Mười lăm triệu đồng chẵn).**

3.2. Chi tiết dự toán chi phí:

| **STT** | **Hạng mục** | **Nhà cung cấp / Công nghệ** | **Hình thức TT** | **Đơn giá / Cách tính** | **Thành tiền** |
| --- | --- | --- | --- | --- | --- |
| 1   | Bản đồ số, định tuyến, matrix | Vietmap Maps API | Theo transaction | 60.000 tx × 50 VND/tx | 3.000.000 VND |
| 2   | Máy chủ Backend, Database, WebSocket | VPS Linux | Theo tháng | 300.000 VND/tháng × 4 | 1.200.000 VND |
| 3   | Lưu trữ ảnh/video/giấy tờ | DigitalOcean Spaces | Theo tháng | 5 USD/tháng × 4 | 530.000 VND |
| 4   | Xác thực OTP SMS | Firebase Phone Auth | Theo số SMS | 3.975 VND × 200 SMS | 795.000 VND |
| 5   | Chi phí phát sinh triển khai | Cấu hình, kiểm thử, xử lý phát sinh kỹ thuật, bổ sung tài nguyên khi cần | Theo thực tế / dự phòng | Gói dự phòng | 1.475.000 VND |
| 6   | Công sức phát triển phần mềm | PM, BA, Dev, UI/UX, Testing, Deploy | Theo gói | Gói nhân công | 8.000.000 VND |
|     |     |     |     | TỔNG CỘNG | 15.000.000 VND |

3.3. Phương thức thanh toán theo tiến độ:

| **Đợt** | **Tỷ lệ** | **Số tiền** | **Điều kiện thanh toán** | **Ý nghĩa đối với tiến độ** |
| --- | --- | --- | --- | --- |
| Đợt 1 | 25% | 3.750.000 VND | Sau khi hai bên xác nhận hợp đồng và khởi động dự án | Giúp team dev setup môi trường, repo, phân tích yêu cầu và chuẩn bị API/VPS cần thiết |
| Đợt 2 | 20% | 3.000.000 VND | Sau khi bàn giao GĐ2: layout base triển khai bằng source code, DB schema, API base, auth/profile skeleton. | Bên A đã có giao diện code chạy được ở mức cơ bản và nền kỹ thuật để review |
| Đợt 3 | 25% | 3.750.000 VND | Sau khi bàn giao GĐ3: demo core tạo đơn, Vietmap, tài xế xem/nhận đơn | Hoàn thành luồng nghiệp vụ cốt lõi đầu tiên |
| Đợt 4 | 20% | 3.000.000 VND | Sau khi bàn giao GĐ4/GĐ5: tracking, upload, QR payment, Admin basic, Beta tích hợp | Bên A có bản Beta để UAT |
| Đợt 5 | 10% | 1.500.000 VND | Sau khi bàn giao Final MVP, source code và tài liệu | Khoản giữ lại hợp lý để xác nhận nghiệm thu cuối |
|     | 100% | 15.000.000 VND | Tổng thanh toán |     |

3.4. Bên A thanh toán trong vòng 05 ngày làm việc sau khi Bên B bàn giao milestone và Bên A xác nhận hoặc hết thời hạn review mà không có phản hồi. Nếu Bên A chậm thanh toán quá 07 ngày làm việc, Bên B có quyền tạm dừng công việc và timeline được gia hạn tương ứng.

3.5. Chi phí dịch vụ bên thứ ba như Vietmap, VPS, Firebase, DigitalOcean, payOS có thể do Bên A thanh toán trực tiếp hoặc tạm ứng cho Bên B theo từng đợt. Nếu Bên A thanh toán trực tiếp, khoản đó được đối soát và trừ vào tổng giá trị hợp đồng tương ứng.

3.6. Phạt thanh toán chậm của Bên A: 50.000 VND/ngày làm việc, chỉ tính sau 07 ngày làm việc kể từ ngày đến hạn, tổng mức phạt tối đa 500.000 VND. Bên B được quyền tạm dừng công việc cho đến khi thanh toán được hoàn tất.

**ĐIỀU 4. YÊU CẦU KỸ THUẬT VÀ TIÊU CHÍ NGHIỆM THU MVP**

4.1. Yêu cầu kỹ thuật ở mức MVP:

*   Hệ thống chạy được trên trình duyệt Chrome, Edge, Firefox và Safari ở mức sử dụng thông thường.
*   Web App/PWA có giao diện responsive cho desktop và mobile.
*   Luồng chính phải hoạt động: đăng nhập, tạo đơn, tìm địa chỉ, nhận đơn, cập nhật trạng thái, xem tracking, tạo QR thanh toán và admin xem/quản lý đơn.
*   Backend API hoạt động ổn định trong môi trường demo/staging; không cam kết tải 500 người dùng đồng thời.
*   Realtime tracking ở mức MVP: cập nhật marker tài xế theo chu kỳ, không cam kết độ chính xác như thiết bị GPS chuyên dụng.
*   Dữ liệu upload được lưu đúng nơi cấu hình; có giới hạn dung lượng/định dạng file.
*   Mã nguồn được lưu trên GitHub/GitLab private repository và bàn giao quyền truy cập sau khi Bên A hoàn tất thanh toán.

4.2. Tiêu chí nghiệm thu:

*   Không có lỗi nghiêm trọng làm không thể đăng nhập, tạo đơn, nhận đơn, cập nhật trạng thái hoặc truy cập dashboard.
*   Các module trong phạm vi MVP hoạt động theo luồng đã thống nhất ở Điều 1 và timeline Điều 2.
*   Các lỗi giao diện nhỏ, căn chỉnh, nội dung hiển thị hoặc tối ưu trải nghiệm không làm gián đoạn luồng chính sẽ được ghi nhận để sửa trong thời gian bảo hành.
*   Lỗi phát sinh do Vietmap, Firebase, VPS, DigitalOcean, payOS hoặc bên thứ ba không được xem là lỗi vi phạm của Bên B nếu Bên B đã tích hợp đúng theo tài liệu kỹ thuật và thông tin cấu hình được cung cấp.
*   Sản phẩm phải có một bản demo/staging ổn định phục vụ buổi trình chiếu/bảo vệ chính thức của Bên A. Bản demo này phải chạy được các luồng MVP cốt lõi đã thống nhất, bao gồm: đăng nhập, tạo đơn, tìm kiếm địa chỉ/bản đồ, tài xế nhận đơn, cập nhật trạng thái, tracking mức MVP, tạo QR thanh toán và Admin xem/quản lý đơn.
*   Việc sản phẩm không thể chạy các luồng cốt lõi trong buổi trình chiếu/bảo vệ do lỗi chủ quan từ source code, cấu hình triển khai hoặc thiếu chuẩn bị từ Bên B được xem là lỗi nghiệm thu nghiêm trọng, không thuộc nhóm lỗi nhỏ có thể chỉ sửa sau bảo hành.
*   Trường hợp lỗi phát sinh từ dịch vụ bên thứ ba như Vietmap, Firebase, VPS, DigitalOcean, payOS hoặc sự cố mạng ngoài khả năng kiểm soát của Bên B, hai bên áp dụng phương án dự phòng theo Phụ lục IV để đảm bảo Bên A vẫn có thể trình chiếu sản phẩm.

4.3. Quyền điều chỉnh công nghệ kỹ thuật

*   Trong quá trình phát triển, Bên B được quyền đề xuất thay đổi, thay thế hoặc điều chỉnh công nghệ kỹ thuật, thư viện, framework, kiến trúc triển khai hoặc dịch vụ tích hợp nếu việc thay đổi đó nhằm mục đích tối ưu hiệu năng, giảm chi phí, tăng tính ổn định, phù hợp hơn với năng lực triển khai hoặc giải quyết rủi ro kỹ thuật phát sinh.
*   Việc thay đổi công nghệ chỉ được chấp nhận khi đáp ứng đầy đủ các điều kiện sau:

–Không làm thay đổi phạm vi chức năng MVP đã thống nhất trong Điều 1.

– Không làm giảm các chức năng cốt lõi mà Bên A đã yêu cầu.

– Không làm ảnh hưởng tiêu cực đến trải nghiệm sử dụng chính của Customer, Driver và Admin.

– Không làm tăng chi phí hoặc kéo dài timeline nếu chưa được Bên A xác nhận.

– Không gây mất mát dữ liệu hoặc làm gián đoạn nghiêm trọng hệ thống đã bàn giao.

– Công nghệ thay thế phải có khả năng đáp ứng mục đích sử dụng tương đương hoặc tốt hơn công nghệ ban đầu.

*   Trong vòng 07 ngày làm việc trước ngày bảo vệ/trình chiếu chính thức, Bên B không thực hiện thay đổi lớn về công nghệ, kiến trúc hệ thống, cơ sở dữ liệu, cấu hình hạ tầng, dịch vụ bản đồ, dịch vụ xác thực, dịch vụ lưu trữ hoặc thanh toán nếu thay đổi đó có nguy cơ ảnh hưởng đến khả năng vận hành của bản demo.
*   Các thay đổi kỹ thuật lớn trong giai đoạn này chỉ được thực hiện khi nhằm khắc phục sự cố nghiêm trọng và phải được Bên A xác nhận trước bằng văn bản, email hoặc tin nhắn.
*   Trong giai đoạn sát ngày bảo vệ, Bên B ưu tiên ổn định hệ thống, sửa lỗi, chuẩn bị dữ liệu demo, kiểm tra luồng trình chiếu và phương án dự phòng thay vì thay đổi kiến trúc hoặc công nghệ nền tảng.
*   Đối với các thay đổi kỹ thuật nhỏ, không ảnh hưởng đến chức năng, giao diện, chi phí và tiến độ, Bên B chỉ cần thông báo cho Bên A trong báo cáo tiến độ hoặc tài liệu bàn giao.
*   Đối với các thay đổi kỹ thuật lớn có ảnh hưởng đến chi phí, timeline, dữ liệu, bảo mật, API bên thứ ba hoặc cách vận hành hệ thống, Bên B phải thông báo và được Bên A xác nhận bằng văn bản, email hoặc tin nhắn trước khi thực hiện.

Danh sách công nghệ trong hợp đồng và phụ lục được hiểu là định hướng kỹ thuật ban đầu. Tiêu chí nghiệm thu cuối cùng dựa trên chức năng MVP, khả năng vận hành của sản phẩm và checklist bàn giao, không chỉ dựa trên việc sử dụng đúng từng công nghệ đã liệt kê ban đầu.

**ĐIỀU 5. QUY TRÌNH REVIEW, FEEDBACK VÀ CHANGE REQUEST**

5.1. Sau mỗi giai đoạn/module, Bên B gửi bản demo, link truy cập hoặc video/hình ảnh minh họa cho Bên A kiểm tra. Bên A có trách nhiệm tổng hợp feedback thành một danh sách rõ ràng trong vòng 03 ngày làm việc.

5.2. Feedback hợp lệ là feedback liên quan trực tiếp đến chức năng đã thống nhất trong phạm vi MVP. Mỗi module được hỗ trợ 01 vòng chỉnh sửa nhỏ không phát sinh chi phí.

5.3. Trong toàn bộ dự án, Bên A được yêu cầu tối đa 05 thay đổi nhỏ không phát sinh chi phí. Thay đổi nhỏ là thay đổi không làm phát sinh màn hình lớn mới, bảng dữ liệu mới, API nghiệp vụ lớn, actor mới, thay đổi kiến trúc hoặc thay đổi logic chính.

5.4. Các yêu cầu sau được xem là Change Request lớn và cần thống nhất lại thời gian/chi phí trước khi làm:

*   Thêm module hoặc dashboard mới.
*   Thêm vai trò người dùng mới ngoài Customer/Driver/Admin.
*   Đổi luồng đặt đơn, nhận đơn hoặc thanh toán đã duyệt.
*   Thêm thuật toán AI/OR-Tools ở mức vận hành thật.
*   Tích hợp API bên thứ ba mới.
*   Yêu cầu chịu tải, bảo mật, monitoring hoặc SLA theo chuẩn production.
*   Yêu cầu tự động đối soát ngân hàng, xuất hóa đơn VAT hoặc tích hợp cổng thanh toán nâng cao.

5.5. Nếu Bên A yêu cầu thay đổi lớn nhưng không gia hạn timeline hoặc không thống nhất chi phí bổ sung, Bên B có quyền từ chối thực hiện để bảo đảm tiến độ MVP.

**ĐIỀU 6. ĐIỀU KHOẢN PHẠT VÀ BỒI THƯỜNG TỔNG HỢP**

Hai bên thống nhất áp dụng cơ chế phạt nhỏ, cân bằng và ưu tiên khắc phục/gia hạn thay vì phạt nặng theo ngày. Mức phạt chỉ áp dụng khi lỗi phát sinh do nguyên nhân chủ quan của bên vi phạm và không áp dụng cho các trường hợp bất khả kháng, chậm phản hồi, thay đổi yêu cầu hoặc lỗi từ dịch vụ bên thứ ba.

| **STT** | **Bên vi phạm** | **Hành vi vi phạm** | **Mức phạt / Hình thức xử lý** |
| --- | --- | --- | --- |
| 1   | Bên B | Trễ mốc GĐ1 hoặc GĐ2 do lỗi chủ quan quá 05 ngày làm việc | 50.000 VND/ngày làm việc, tối đa 300.000 VND/giai đoạn |
| 2   | Bên B | Trễ mốc GĐ3, GĐ4 hoặc GĐ5 do lỗi chủ quan quá 05 ngày làm việc | 50.000 VND/ngày làm việc, tối đa 500.000 VND/giai đoạn |
| 3   | Bên B | Trễ bàn giao Final do lỗi chủ quan quá 07 ngày làm việc | 50.000 VND/ngày làm việc, tối đa 1.000.000 VND |
| 4   | Bên B | Không hoàn thành một hạng mục đã nhận tiền và không có phương án khắc phục | Hoàn phần tiền công tương ứng với hạng mục chưa hoàn thành; tổng trách nhiệm không vượt quá tiền công đã nhận |
| 5   | Bên B | Tiết lộ thông tin mật/source code/dữ liệu của Bên A | Hai bên thương lượng mức bồi thường thực tế; tối đa 2.000.000 VND nếu chứng minh có thiệt hại |
| 6   | Bên A | Chậm thanh toán quá 07 ngày làm việc sau khi đến hạn | 50.000 VND/ngày làm việc, tối đa 500.000 VND; Bên B được tạm dừng công việc |
| 7   | Bên A | Chậm phản hồi review/duyệt quá 03 ngày làm việc | Bên B được gia hạn tương ứng; không tính lỗi trễ cho Bên B |
| 8   | Bên A | Yêu cầu thay đổi vượt quá 05 thay đổi nhỏ hoặc phát sinh chức năng lớn | Thỏa thuận thêm thời gian/chi phí trước khi thực hiện |
| 9   | Hai bên | Lỗi từ Vietmap, Firebase, VPS, DigitalOcean, payOS hoặc dịch vụ bên thứ ba | Không tính là lỗi phạt của Bên B nếu đã tích hợp đúng tài liệu kỹ thuật |

**6.2. Tổng trách nhiệm tài chính tối đa của Bên B trong mọi trường hợp không vượt quá tổng tiền công phát triển phần mềm mà Bên B đã thực nhận. Chi phí dịch vụ bên thứ ba đã phát sinh hợp lệ không được xem là tiền công phải hoàn trả.**

**6.3. Xử lý trường hợp trễ nghiêm trọng ảnh hưởng đến buổi bảo vệ/trình chiếu**

Hai bên thống nhất không áp dụng điều khoản hoàn trả 100% giá trị hợp đồng và bồi thường thêm 100% giá trị hợp đồng cho các trường hợp trễ thông thường, trễ do chậm phản hồi từ Bên A, thay đổi yêu cầu, chậm thanh toán, lỗi từ dịch vụ bên thứ ba hoặc sự kiện khách quan ngoài khả năng kiểm soát của Bên B.

Điều khoản hoàn trả và bồi thường đặc biệt chỉ được xem xét áp dụng khi đồng thời xảy ra tất cả các điều kiện sau:

– Bên B trễ bàn giao Final MVP quá 14 ngày làm việc so với mốc cuối cùng đã được hai bên thống nhất;

– Nguyên nhân trễ đến từ lỗi chủ quan của Bên B;

– Bên A đã thanh toán đúng hạn và cung cấp đầy đủ thông tin, tài khoản dịch vụ, dữ liệu, feedback theo đúng thời hạn;

– Bên A không phát sinh yêu cầu thay đổi lớn làm ảnh hưởng timeline;

– Sản phẩm không có bản demo/staging/local hoặc phương án dự phòng đủ để Bên A trình chiếu/bảo vệ các luồng MVP cốt lõi;

– Bên B không đưa ra được phương án khắc phục hợp lý trong vòng 05 ngày làm việc kể từ khi nhận được thông báo vi phạm từ Bên A.

Trong trường hợp đáp ứng đầy đủ các điều kiện trên, Bên A có quyền yêu cầu Bên B hoàn trả phần tiền công phát triển phần mềm đã nhận tương ứng với phần chưa hoàn thành và bồi thường thêm một khoản tối đa bằng 100% phần tiền công phát triển phần mềm đã nhận.

Chi phí dịch vụ bên thứ ba đã phát sinh hợp lệ như Vietmap, VPS, Firebase, DigitalOcean, payOS và các chi phí triển khai thực tế không được xem là khoản tiền công phải hoàn trả, trừ khi có chứng cứ cho thấy Bên B sử dụng sai mục đích hoặc không phục vụ cho dự án.

**ĐIỀU 7. BẢO HÀNH SAU BÀN GIAO**

7.1. Bên B bảo hành sản phẩm trong vòng 30 ngày kể từ ngày hai bên ký xác nhận nghiệm thu chính thức.

7.2. Phạm vi bảo hành chỉ bao gồm lỗi phát sinh từ các chức năng MVP đã bàn giao và thuộc trách nhiệm lập trình của Bên B.

7.3. Bảo hành không bao gồm: yêu cầu thêm chức năng mới, đổi nghiệp vụ, đổi UI ngoài thiết kế đã duyệt, lỗi do dịch vụ bên thứ ba, lỗi do tài khoản API hết hạn/quá quota/sai cấu hình, lỗi do Bên A tự ý sửa source code hoặc lỗi do vận hành sai hướng dẫn.

| **Mức độ lỗi** | **Mô tả** | **Thời gian xử lý dự kiến** |
| --- | --- | --- |
| Nghiêm trọng | Lỗi làm ngừng luồng chính như đăng nhập, tạo đơn, nhận đơn, cập nhật trạng thái | 03 ngày làm việc |
| Trung bình | Lỗi ảnh hưởng một phần chức năng nhưng có cách xử lý tạm | 05 ngày làm việc |
| Nhỏ | Lỗi giao diện, nội dung, căn chỉnh hoặc tối ưu trải nghiệm | Theo đợt cập nhật gần nhất |

7.4. Hai bên không áp dụng phạt bảo hành theo ngày. Nếu lỗi thuộc phạm vi bảo hành và Bên B cố ý không xử lý sau khi đã được nhắc bằng văn bản 02 lần, hai bên sẽ thương lượng cách khắc phục hoặc khấu trừ tối đa 300.000 VND từ khoản thanh toán cuối nếu khoản này chưa thanh toán.

**ĐIỀU 8. TRÁCH NHIỆM CỦA BÊN A**

8.1. Cung cấp yêu cầu nghiệp vụ, dữ liệu mẫu, thông tin actor và luồng sử dụng trong thời hạn thống nhất.

8.2. Cung cấp/tạm ứng/thanh toán tài khoản dịch vụ cần thiết như Vietmap, VPS, Firebase, DigitalOcean, payOS khi đến giai đoạn tích hợp.

8.3. Phản hồi bản demo, giao diện/màn hình đã triển khai bằng code, module và câu hỏi kỹ thuật trong vòng 03 ngày làm việc.

8.4. Thanh toán đúng hạn theo Điều 3.

8.5. Không yêu cầu chức năng ngoài phạm vi MVP mà không thống nhất thêm thời gian/chi phí.

8.6. Không tiết lộ demo, source code, tài khoản kỹ thuật hoặc thông tin nội bộ của Bên B cho bên thứ ba nếu chưa được đồng ý.

8.7. Tham gia UAT và nghiệm thu theo đúng timeline.

**ĐIỀU 9. TRÁCH NHIỆM CỦA BÊN B**

9.1. Phát triển sản phẩm theo phạm vi MVP đã thống nhất.

9.2. Báo cáo tiến độ định kỳ mỗi tuần hoặc sau mỗi sprint/module.

9.3. Demo module cho Bên A xem, ghi nhận feedback hợp lệ và chỉnh sửa theo phạm vi MVP.

9.4. Thông báo sớm nếu có rủi ro kỹ thuật, rủi ro API, rủi ro chi phí hoặc rủi ro timeline.

9.5. Không tiết lộ thông tin dự án, dữ liệu, tài liệu hoặc thông tin kinh doanh của Bên A cho bên thứ ba nếu chưa được đồng ý.

9.6. Bàn giao source code, tài liệu và hướng dẫn triển khai sau khi Bên A hoàn tất nghĩa vụ thanh toán tương ứng.

9.7. Bảo hành lỗi thuộc phạm vi MVP theo Điều 7.

**ĐIỀU 10. BẢO MẬT VÀ SỞ HỮU TRÍ TUỆ**

10.1. Hai bên cam kết bảo mật toàn bộ thông tin liên quan đến dự án trong và sau khi thực hiện hợp đồng, trừ khi có sự đồng ý bằng văn bản hoặc tin nhắn xác nhận của bên còn lại.

10.2. Toàn bộ mã nguồn, thiết kế, database schema và tài liệu kỹ thuật được phát triển riêng cho dự án LEOPARD sẽ được chuyển giao cho Bên A sau khi Bên A hoàn tất 100% nghĩa vụ thanh toán.

10.3. Bên B được giữ lại kiến thức chuyên môn, kinh nghiệm triển khai, các đoạn code tiện ích chung không chứa thông tin riêng của dự án và các thư viện/framework mã nguồn mở không thuộc sở hữu riêng của Bên A.

10.4. Các công nghệ và dịch vụ bên thứ ba được tích hợp như Vietmap, Firebase, DigitalOcean, payOS chịu ràng buộc bởi điều khoản sử dụng riêng của từng nhà cung cấp.

**ĐIỀU 11. CHẤM DỨT HỢP ĐỒNG**

11.1. Hai bên có thể chấm dứt hợp đồng trước hạn nếu cùng thống nhất bằng văn bản, email hoặc tin nhắn có thể đối chiếu.

11.2. Một bên có quyền đề nghị chấm dứt hợp đồng nếu bên còn lại vi phạm nghĩa vụ quan trọng và không khắc phục trong vòng 10 ngày làm việc kể từ khi nhận được thông báo.

11.3. Khi chấm dứt hợp đồng, hai bên đối soát phần công việc đã hoàn thành, phần chi phí dịch vụ đã phát sinh, phần tiền đã thanh toán và phần source code/tài liệu cần bàn giao tương ứng.

**ĐIỀU 12. GIẢI QUYẾT TRANH CHẤP**

12.1. Hai bên ưu tiên giải quyết tranh chấp thông qua thương lượng, hòa giải trong vòng 15 ngày kể từ khi phát sinh tranh chấp.

12.2. Nếu không thương lượng được, hai bên có thể nhờ Giảng viên hướng dẫn / Ban Cố vấn Học thuật của Trường Đại học FPT làm trung gian hòa giải.

12.3. Trường hợp vẫn không giải quyết được, tranh chấp sẽ được xử lý theo quy định của pháp luật Việt Nam tại cơ quan có thẩm quyền.

**ĐIỀU 13. ĐIỀU KHOẢN CHUNG**

13.1. Hợp đồng này có hiệu lực kể từ ngày hai bên ký hoặc xác nhận bằng văn bản/tin nhắn/email và chấm dứt khi hai bên hoàn thành nghĩa vụ hoặc theo thỏa thuận chấm dứt trước hạn.

13.2. Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản, email hoặc tin nhắn có thể đối chiếu và được đại diện hai bên xác nhận.

13.3. Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau. Trường hợp ký online, bản mềm được xem là căn cứ thỏa thuận giữa hai bên.

13.4. Các phụ lục đính kèm gồm: Bảng dự toán chi phí, Kế hoạch sprint 12 tuần, Checklist bàn giao và Tiêu chí nghiệm thu là bộ phận không tách rời của hợp đồng này.

Đà Nẵng, ngày …… tháng …… năm 2026

|     |     |
| --- | --- |
| **ĐẠI DIỆN BÊN A  <br>(Khối Kinh Tế Đại học FPT Đà Nẵng)  <br>  <br>(Ký và ghi rõ họ tên)  <br>  <br>  <br>  <br>Hoàng Huỳnh Giang  <br>MSSV: DS180441** | **ĐẠI DIỆN BÊN B  <br>(Khối IT FPT Đại học FPT Đà Nẵng)  <br>  <br>(Ký và ghi rõ họ tên)  <br>  <br>  <br>  <br>Trần Văn Linh  <br>MSSV: DE180719** |

**PHỤ LỤC I: BẢNG DỰ TOÁN CHI PHÍ CHI TIẾT**

**DỰ ÁN LEOPARD – Phiên bản MVP/Demo Web App/PWA + Dashboard Web + Backend API**

**PHỤ LỤC I.1. CÔNG NGHỆ SỬ DỤNG**

| **Nhóm hệ thống** | **Công nghệ / Dịch vụ** | **Mục đích sử dụng trong MVP** |
| --- | --- | --- |
| Web App / PWA | Next.js / React | Giao diện khách hàng, tài xế và Admin trên web, responsive mobile/desktop |
| Backend API | NestJS + Prisma | Xử lý nghiệp vụ đặt đơn, nhận đơn, báo giá cước, trạng thái và thanh toán |
| Database | PostgreSQL + PostGIS | Lưu người dùng, đơn hàng, tài xế, tọa độ, tuyến đường và dữ liệu địa lý |
| Realtime Tracking | WebSocket / Socket.IO | Cập nhật vị trí tài xế và trạng thái đơn hàng theo thời gian thực ở mức MVP |
| Bản đồ số | Vietmap Maps API | Bản đồ, tìm kiếm địa chỉ, geocoding, routing cơ bản, matrix/tính khoảng cách |
| Xác thực | Firebase Phone Auth | Gửi mã OTP SMS xác thực tài khoản nếu được cấu hình/tạm ứng chi phí |
| Lưu trữ media | DigitalOcean Spaces | Lưu ảnh hàng hóa, bằng chứng giao hàng, giấy tờ tài xế |
| Thanh toán | VietQR / payOS | Sinh mã QR thanh toán theo mã đơn hàng và số tiền |
| ETA mức MVP | Vietmap ETA + rule cơ bản | Ước lượng thời gian giao hàng dựa trên khoảng cách, tuyến đường và rule đơn giản |
| Tối ưu tuyến optional | Python + OR-Tools | Demo thứ tự điểm giao/ghép đơn với dữ liệu mẫu nếu còn thời gian |

Ghi chú: Danh sách công nghệ trên là phương án kỹ thuật dự kiến tại thời điểm ký hợp đồng. Trong quá trình triển khai, Bên B có thể đề xuất thay thế hoặc điều chỉnh công nghệ tương đương nếu việc thay đổi không làm giảm chức năng MVP, không ảnh hưởng tiêu cực đến trải nghiệm sử dụng, không làm tăng chi phí/timeline khi chưa được Bên A xác nhận và vẫn đảm bảo sản phẩm đáp ứng tiêu chí nghiệm thu.

**PHỤ LỤC I.2. CHI TIẾT PHÂN BỔ CÔNG SỨC PHÁT TRIỂN**

| **STT** | **Hạng mục** | **Nội dung thực hiện** | **Thành tiền** |
| --- | --- | --- | --- |
| 1   | PM / BA / Phân tích yêu cầu | Làm rõ nghiệp vụ, actor, use case, scope MVP, timeline và tiêu chí nghiệm thu | 900.000 VND |
| 2   | Giao diện trực tiếp trên source code | Dựng layout nền, component giao diện, responsive layout và các màn hình Customer, Driver, Admin trực tiếp bằng code; không bàn giao Figma/prototype riêng | 800.000 VND |
| 3   | Frontend Web App / PWA | Xây dựng giao diện đặt đơn, theo dõi đơn, quản lý hồ sơ và dashboard | 1.600.000 VND |
| 4   | Backend API & Database | Thiết kế database, API nghiệp vụ, phân quyền, đơn hàng, tài xế và thanh toán | 1.900.000 VND |
| 5   | Tích hợp Vietmap, OTP, media, realtime | Tích hợp bản đồ, tìm kiếm địa chỉ, OTP SMS, upload ảnh/video và WebSocket | 1.200.000 VND |
| 6   | ETA / Tối ưu tuyến mức MVP | ETA từ Vietmap/rule cơ bản và demo tối ưu tuyến nếu đủ điều kiện | 1.000.000 VND |
| 7   | Testing, Deploy, Tài liệu | Kiểm thử, sửa lỗi, triển khai server, cấu hình môi trường và hướng dẫn bàn giao | 600.000 VND |
|     |     | TỔNG CÔNG SỨC PHÁT TRIỂN | 8.000.000 VND |

**PHỤ LỤC I.3. PHÂN LOẠI CHI PHÍ THEO HÌNH THỨC THANH TOÁN**

**A. Chi phí trả theo tháng:**

| **Hạng mục** | **Đơn giá** | **Thời gian** | **Thành tiền** |
| --- | --- | --- | --- |
| VPS Linux | 300.000 VND/tháng | 4 tháng | 1.200.000 VND |
| DigitalOcean Spaces | 132.500 VND/tháng | 4 tháng | 530.000 VND |

**B. Chi phí trả theo mức sử dụng:**

| **Hạng mục** | **Đơn giá / Cách tính** | **Số lượng dự kiến** | **Thành tiền** |
| --- | --- | --- | --- |
| Vietmap Maps API | 50 VND/transaction | 60.000 transaction | 3.000.000 VND |
| Firebase Phone Auth SMS | 3.975 VND/SMS | 200 SMS | 795.000 VND |

**C. Chi phí thanh toán theo gói:**

| **Hạng mục** | **Hình thức** | **Thành tiền** |
| --- | --- | --- |
| Chi phí phát sinh trong quá trình triển khai | Thanh toán theo thực tế phát sinh / dự phòng | 1.475.000 VND |
| Công sức phát triển phần mềm | Thanh toán theo gói công việc | 8.000.000 VND |

**PHỤ LỤC II: KẾ HOẠCH SPRINT 12 TUẦN VÀ CHECKLIST BÀN GIAO**

| **Tuần** | **Mục tiêu sprint** | **Đầu ra bàn giao/check** |
| --- | --- | --- |
| Tuần 1 | Kickoff, xác nhận scope MVP, actor, nghiệp vụ, tài khoản API cần thiết | Meeting notes, backlog, scope MVP, danh sách tài khoản/dịch vụ cần chuẩn bị |
| Tuần 2 | SRS rút gọn, luồng màn hình MVP, kiến trúc sơ bộ, kế hoạch database | SRS, danh sách màn hình MVP, ERD sơ bộ, sprint plan |
| Tuần 3 | Dựng layout base trực tiếp trên source code, setup frontend/backend/ repository, auth skeleton | Repo, project structure, màn hình auth base chạy được trên code, link demo/staging hoặc bản chạy local |
| Tuần 4 | DB schema, API base, profile/role, review layout/màn hình đã code và chỉnh sửa nhỏ | Database schema, migration, API docs sơ bộ, giao diện base đã chỉnh trên source code |
| Tuần 5 | Module Customer tạo đơn và tích hợp Vietmap search/geocode | Demo tạo đơn, tìm địa chỉ, lưu tọa độ, upload ảnh cơ bản |
| Tuần 6 | Module Driver xem/nhận đơn, cập nhật trạng thái, demo core | Driver flow, trạng thái đơn, demo module core cho Bên A review |
| Tuần 7 | Realtime tracking, upload media, QR payment basic | WebSocket tracking, ảnh xác nhận giao hàng, VietQR/payOS QR |
| Tuần 8 | Admin Dashboard cơ bản và tích hợp các luồng chính | Admin quản lý đơn/user/driver, bản demo Beta 1 |
| Tuần 9 | Integration testing, sửa lỗi core, ETA/rule cơ bản, optional demo route optimization | Beta tích hợp, checklist lỗi, bản build staging |
| Tuần 10 | UAT với Bên A, tổng hợp feedback cuối, fix lỗi ưu tiên | UAT report, danh sách lỗi đã sửa/chưa sửa, feedback freeze |
| Tuần 11 | Stabilization, deploy, tài liệu cài đặt/deploy/API | Bản staging/final candidate, tài liệu deploy, tài liệu cấu hình |
| Tuần 12 | Final demo, nghiệm thu, bàn giao source và hướng dẫn sử dụng | Source code, DB schema, tài liệu, tài khoản/quyền truy cập, biên bản bàn giao |

**PHỤ LỤC III: CHECKLIST BÀN GIAO CUỐI KỲ**

**A. Sản phẩm chạy được**

*   ☐ Link truy cập Web App/PWA khách hàng.
*   ☐ Link truy cập giao diện tài xế.
*   ☐ Link truy cập Admin Dashboard.
*   ☐ Backend API chạy trên server/staging.
*   ☐ Database đã tạo và có dữ liệu mẫu để demo.

**B. Source code và kỹ thuật**

*   ☐ Repository frontend.
*   ☐ Repository backend hoặc monorepo.
*   ☐ File .env.example mô tả biến môi trường.
*   ☐ Database migration/schema.
*   ☐ Seed data demo nếu có.
*   ☐ Hướng dẫn chạy local.
*   ☐ Hướng dẫn deploy server.
*   ☐ Hướng dẫn cấu hình Vietmap/Firebase/DigitalOcean/payOS.

**C. Chức năng MVP phải demo được**

*   ☐ Đăng nhập/phân quyền Customer, Driver, Admin.
*   ☐ Customer tạo đơn vận chuyển.
*   ☐ Tìm kiếm địa chỉ và hiển thị bản đồ Vietmap.
*   ☐ Tài xế xem và nhận đơn.
*   ☐ Tài xế cập nhật trạng thái đơn.
*   ☐ Tracking vị trí tài xế ở mức MVP.
*   ☐ Upload ảnh hàng hóa/ảnh giao hàng.
*   ☐ Tạo mã thanh toán VietQR/payOS.
*   ☐ Admin xem/quản lý đơn hàng, user, tài xế.

**D. Tài liệu bàn giao**

*   ☐ Tài liệu mô tả chức năng MVP.
*   ☐ Tài liệu hướng dẫn sử dụng cơ bản.
*   ☐ Tài liệu cài đặt local.
*   ☐ Tài liệu deploy server.
*   ☐ Tài liệu cấu hình dịch vụ bên thứ ba.
*   ☐ Checklist test/UAT.
*   ☐ Biên bản nghiệm thu/bàn giao.

**PHỤ LỤC IV: RỦI RO VÀ PHƯƠNG ÁN KIỂM SOÁT**

*   Vietmap API vượt transaction dự toán: Giới hạn autocomplete, cache địa chỉ thường dùng, chỉ gọi routing/matrix khi khách xác nhận tạo đơn hoặc tài xế xem chi tiết đơn.
*   Matrix API phát sinh cao: Không quét toàn bộ tài xế bằng Matrix liên tục; chỉ tính theo nhóm tài xế gần đơn hàng hoặc theo khu vực.
*   OTP SMS phát sinh cao: Giới hạn số OTP theo số điện thoại và IP, chỉ dùng OTP thật cho môi trường staging/production.
*   VPS quá tải: Tối ưu index database, giảm tần suất cập nhật GPS, tách tác vụ nặng thành batch job nếu cần.
*   Dung lượng ảnh/video tăng nhanh: Nén ảnh trước khi upload, giới hạn dung lượng file và quy định thời gian lưu trữ media trong giai đoạn demo.
*   Bên A phản hồi chậm: Timeline được gia hạn tương ứng, module được xem là tạm chấp nhận nếu quá hạn review mà không có phản hồi.
*   Thay đổi yêu cầu lớn: Tạo Change Request riêng, không ép vào timeline MVP nếu chưa thống nhất thêm thời gian/chi phí.
*   Phương án dự phòng cho buổi bảo vệ/trình chiếu:

Để giảm rủi ro khi dịch vụ bên thứ ba gặp sự cố trong ngày bảo vệ/trình chiếu, Bên B chuẩn bị phương án dự phòng ở mức phù hợp với MVP, bao gồm một hoặc nhiều phương án sau:

– Chuẩn bị dữ liệu mẫu cho tài khoản Customer, Driver và Admin.

– Chuẩn bị sẵn một số đơn hàng demo với trạng thái khác nhau.

– Cache hoặc lưu sẵn dữ liệu địa chỉ/tuyến đường mẫu để phục vụ demo khi API bản đồ gặp sự cố.

– Chuẩn bị sẵn ảnh hàng hóa, ảnh xác nhận giao hàng và dữ liệu upload mẫu.

– Chuẩn bị video demo ngắn hoặc ảnh chụp màn hình các luồng chính trong trường hợp môi trường online gặp sự cố ngoài ý muốn.

– Chuẩn bị hướng dẫn chạy bản local/staging nếu server chính hoặc mạng gặp sự cố.

– Chuẩn bị tài khoản test và thông tin đăng nhập demo cho Bên A trước ngày bảo vệ.

Phương án dự phòng không thay thế cho sản phẩm chính, nhưng được sử dụng để đảm bảo Bên A vẫn có thể trình bày luồng nghiệp vụ MVP trong trường hợp có sự cố khách quan từ API bên thứ ba, mạng internet, server hoặc tài khoản dịch vụ.

_Tài liệu phụ lục – Đính kèm theo Hợp đồng số: ……………_