# Stakeholders và role

## Stakeholders

| Nhóm | Mục tiêu | Trách nhiệm |
| --- | --- | --- |
| Product Owner | Xác nhận phạm vi và ưu tiên | Duyệt yêu cầu, UAT và thay đổi phạm vi |
| Development Team | Xây dựng và duy trì hệ thống | Thiết kế, code, test, tài liệu |
| Operations/Admin | Vận hành pilot | Theo dõi đơn, xử lý ngoại lệ, xác nhận thanh toán |
| Customer | Gửi hàng | Tạo và theo dõi đơn thuộc sở hữu |
| Driver | Vận chuyển | Nhận đơn, cập nhật trạng thái và vị trí |
| Fleet Owner | Quản lý đội tài xế nhỏ | Theo dõi drivers, orders và tracking thuộc fleet của mình |

## Role hệ thống

### `CUSTOMER`

- Quản lý hồ sơ cá nhân.
- Tạo, xem và hủy đơn thuộc sở hữu khi còn đủ điều kiện.
- Tạo QR thanh toán và xem trạng thái thanh toán.
- Theo dõi Driver sau khi đơn được nhận.

### `DRIVER`

- Cập nhật trạng thái sẵn sàng.
- Xem đơn `REQUESTED`, nhận tối đa một đơn đang hoạt động.
- Cập nhật lifecycle và gửi tracking point cho đơn được phân công.
- Tải ảnh xác nhận giao hàng.

### `FLEET_OWNER`

- Quản lý fleet profile ở mức pilot.
- Mời hoặc gán Driver vào fleet theo quy trình được Admin cho phép.
- Xem drivers, availability và order đang/đã thực hiện của drivers thuộc fleet.
- Xem tracking và payment summary của orders thuộc fleet.
- Không được sửa order của Customer, xác nhận payment thay Admin hoặc xem dữ liệu fleet khác.

### `ADMIN`

- Xem và lọc users, drivers, orders, tracking, media và payments.
- Vô hiệu hóa tài khoản khi cần vận hành.
- Xác nhận thanh toán thủ công có lý do và audit log.
- Không được sửa lịch sử tracking hoặc giả mạo hành động của Customer/Driver.

## Nguyên tắc quyền

- Backend là nguồn quyết định authorization.
- Quyền role và ownership phải cùng được kiểm tra.
- Fleet Owner chỉ truy cập dữ liệu thông qua quan hệ `FleetMember` hợp lệ.
- Mọi thao tác Admin làm thay đổi dữ liệu nhạy cảm phải được audit.
