# Navigation map

```mermaid
flowchart TD
  Login[/login/] --> C[/customer/orders/]
  Login --> D[/driver/orders/]
  Login --> F[/fleet/]
  Login --> A[/admin/]
  C --> CN[/customer/orders/new/]
  C --> CD[/customer/orders/:id/]
  D --> DD[/driver/orders/:id/]
  F --> FD[/fleet/drivers/]
  F --> FO[/fleet/orders/]
  FO --> FOD[/fleet/orders/:id/]
  A --> AO[/admin/orders/]
  A --> AU[/admin/users/]
  A --> AF[/admin/fleets/]
  A --> AD[/admin/drivers/]
  AO --> AOD[/admin/orders/:id/]
```

## Navigation theo role

- Customer: Orders, Create Order, Profile.
- Driver: Available Orders, Active Order, Profile/Availability.
- Fleet Owner: Overview, Drivers, Fleet Orders.
- Admin: Overview, Orders, Users, Fleets, Drivers.

Sau login, backend profile quyết định route mặc định. Truy cập route sai role hiển thị permission-denied hoặc chuyển về home của role; không để lộ dữ liệu trước khi redirect.

Mobile dùng bottom navigation tối đa 4 mục cho Customer/Driver. Fleet Owner và Admin dùng sidebar từ 1024 px và drawer ở viewport nhỏ hơn.
