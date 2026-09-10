# Ngoài phạm vi (Out of Scope)

Các hạng mục sau không thuộc phạm vi triển khai của hệ thống LEOPARD:

- **Phân phối & Đa nền tảng**: Đăng tải App Store / Google Play thương mại chính thức (sử dụng Expo / Web PWA cho giai đoạn vận hành thử nghiệm).
- **Kiến trúc tổ chức**: Multi-tenancy phức tạp và white-label cho nhiều thương hiệu khác nhau.
- **Quản trị đội xe nâng cao**: Quản lý đa cấp (multi-tier fleets), chi nhánh phân cấp sâu hoặc phân quyền tùy biến ngoài 4 role chuẩn (`CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `ADMIN`).
- **Tối ưu hóa đa đơn hàng (VRP)**: Thuật toán ghép nhiều đơn hàng phức tạp (multi-order routing optimization / Vehicle Routing Problem). Hệ thống chỉ tập trung vào điều phối đơn hàng đơn lẻ (`single-order dispatch`) tới tài xế gần nhất hoặc bảng hàng Load-board.
- **Dự báo giao thông AI độc quyền**: Thuật toán máy học AI XGBoost dự báo tắc đường; ETA dự kiến sử dụng dữ liệu từ Vietmap Routing API và Demo deterministic có nhãn rõ ràng.
- **Đối soát ngân hàng tự động ngoài cổng thanh toán**: Đối soát thủ công cho các tài khoản không hỗ trợ webhook; hệ thống chỉ tự động hóa xác nhận thanh toán qua cổng payOS / VietQR webhook đã tích hợp.
- **Ví điện tử tài chính trung gian**: Dịch vụ trung gian thanh toán cần cấp phép ngân hàng nhà nước; hệ thống chỉ quản lý hạn mức công nợ nội bộ B2B và thanh toán cước trực tiếp.
- **Hạ tầng viễn thông chuyên biệt**: Tổng đài viễn thông vi mô chuyên dụng (sử dụng cuộc gọi thoại thiết bị và kênh chat socket trong chuyến đi).
- **Hạ tầng siêu quy mô**: Cam kết SLA 24/7, kiến trúc active-active đa vùng (multi-region).
- **Phân tích dữ liệu lớn (Big Data)**: Kho dữ liệu BI Data Warehouse và báo cáo tài chính kiểm toán chuyên sâu ngoài phạm vi báo cáo vận hành hiện hữu.

> **Quy tắc thay đổi:** Mọi đề xuất bổ sung tính năng mới ngoài danh mục trên phải có Change Request, đánh giá tác động kiến trúc và được Product Owner phê duyệt trước khi đưa vào kế hoạch thực thi.
