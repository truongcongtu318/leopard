# Responsive rules

## Breakpoints

- Mobile: 360-767 px.
- Tablet: 768-1023 px.
- Desktop: từ 1024 px.

## Customer và Driver

- Một cột trên mobile; form section không đặt trong card lồng nhau.
- Primary action có thể sticky bottom nhưng phải chừa safe-area và không che nội dung.
- Map dùng aspect ratio ổn định, tối thiểu 280 px chiều cao.
- Order row chuyển từ summary stack trên mobile sang grid ở tablet.
- Touch target tối thiểu 44 x 44 px.

## Admin

- Sidebar cố định từ desktop; filter bar wrap có trật tự.
- Table giữ cột Order, Status và Action; cột phụ có thể ẩn trên tablet.
- Không ép table rộng vào viewport mobile; dùng row detail layout khi dưới 768 px.

## Kiểm tra viewport

Tối thiểu kiểm tra 360x800, 390x844, 768x1024, 1024x768 và 1440x900. Không có horizontal overflow ngoài container table được chủ ý kiểm soát.
