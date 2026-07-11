# Unit test plan

| ID | Đối tượng | Cases chính |
| --- | --- | --- |
| UT-AUTH | Token/session policy | Expiry, rotation, revoked session, disabled user |
| UT-ORDER | Order validation | 0/3 stops hợp lệ, 4 stops lỗi, tọa độ và vehicle type |
| UT-STATE | Order state machine | Mọi transition hợp lệ và bị cấm, actor rules |
| UT-ETA | `DemoEtaProvider` | Deterministic distance, stop delay, source và rounding |
| UT-PRICE | Pricing | Integer VND, vehicle multiplier, minimum price |
| UT-PERMISSION | Policies | Owner, assigned Driver, Admin và unrelated actor |
| UT-PAYMENT | Payment state | Active intent, failed intent, manual confirm và duplicate command |
| UT-UPLOAD | File policy | MIME, extension, size và media type |

Unit test không gọi network hoặc database. Mỗi bug business rule phải có regression test trước khi đóng.
