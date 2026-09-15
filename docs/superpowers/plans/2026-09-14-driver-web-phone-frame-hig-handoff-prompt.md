Thực hiện đầy đủ hạng mục **Driver web phone frame & Apple HIG** trong repository
`D:\leopard`.

Trước khi sửa code, bắt buộc đọc trọn vẹn ba tài liệu sau theo đúng thứ tự:

1. Spec thiết kế:
   `docs/ui/16-driver-web-phone-frame-apple-hig-spec.md`
2. Kế hoạch triển khai:
   `docs/superpowers/plans/2026-09-14-driver-web-phone-frame-hig.md`
3. Kế hoạch kiểm thử:
   `docs/testing/11-driver-web-phone-frame-hig-test-plan.md`

Sau đó đọc `AGENTS.md` và các source-of-truth liên quan được nó chỉ định. Nếu repository
có `.codegraph/`, dùng CodeGraph trước khi grep hoặc đọc lan rộng. Không bắt đầu
implementation khi chưa hiểu root composition hiện tại của `apps/driver/app/_layout.tsx`,
`DriverDrawerProvider`, `DriverSidebarDrawer`, hai operational modal và safe-area
ownership của `ScreenScaffold`.

## Mục tiêu phải đạt

- Trên web, mọi route Driver nằm trong một app viewport dạng điện thoại, không kéo giãn
  toàn chiều rộng laptop/tablet.
- Web nhỏ hơn `480px` hiển thị edge-to-edge; `480–767px` được căn giữa với chiều rộng tối
  đa `430px`; từ `768px` trở lên dùng khung tối đa `430 x 932`, có border/radius/shadow
  tiết chế theo spec.
- Trên iOS/Android native, ứng dụng vẫn full-screen theo kích thước thiết bị và không bị
  giới hạn bởi kích thước khung web.
- Drawer, bottom navigation, sticky CTA, incident modal và incoming-dispatch modal phải
  nằm trong cùng khung ứng dụng trên web.
- Giao diện giữ một safe-area owner ở root, không thêm `ScrollView` bao quanh router slot
  và không tạo document-level overflow vì khung trang trí.
- Hành vi hiện tại của route, API, order lifecycle, tracking, permissions, form và dữ
  liệu không thay đổi.

## Quy trình thực hiện bắt buộc

Ưu tiên dùng skill `superpowers:subagent-driven-development` để thực hiện từng task trong
implementation plan và review giữa các task. Nếu skill đó không khả dụng, dùng
`superpowers:executing-plans` và thực hiện tuần tự có checkpoint. Áp dụng thêm
`react-native-patterns`, `accessibility` và `superpowers:verification-before-completion`
khi chúng khả dụng.

Tuân thủ TDD cho từng task:

1. Viết test mô tả behavior trước.
2. Chạy test và xác nhận nó fail vì behavior chưa tồn tại, không phải vì mock sai.
3. Viết implementation nhỏ nhất để test pass.
4. Chạy lại focused test.
5. Refactor nếu cần và chạy lại test.
6. Review diff trước khi sang task kế tiếp.

Không được bỏ qua test root composition. Test này phải chứng minh cả routed content lẫn
drawer do provider render đều là descendant của `driver-viewport-frame`. Chỉ bọc
`<Slot />` là sai vì drawer hiện được render như sibling của provider children.

Không dùng trực tiếp React Native `Modal` cho web nếu nó portal ra browser viewport. Làm
theo plan: tạo `DriverModalSurface` app-local, giữ native platform modal trên iOS/Android
và dùng absolute contained layer trong framed tree trên web. Chỉ migrate
`IncomingDispatchModal` và `DriverIncidentModal` trong scope này; không thay đổi countdown,
validation, callback hay copy nghiệp vụ của chúng.

## Nguyên tắc thiết kế và Apple HIG

- Đây là diễn giải HIG phù hợp React Native, không phải yêu cầu sao chép giao diện Apple.
- Không nhúng hoặc giả mạo SF Pro, iPhone notch, Dynamic Island, nút phần cứng hay Apple
  branding.
- Giữ visual hierarchy rõ: nhiệm vụ hiện tại và primary action phải dễ nhận biết trước.
- Body text thông thường ở mức `15–17pt`; không thu nhỏ chữ quan trọng chỉ để vừa khung.
- Cho phép Dynamic Type/font scaling và nội dung tiếng Việt dài wrap/scroll tự nhiên.
- Touch target tối thiểu `44 x 44`; status luôn có text, không truyền đạt chỉ bằng màu.
- Tab bar chỉ dùng cho top-level navigation; contextual action không được biến thành tab.
- Translucency/Liquid Glass chỉ dùng tiết chế ở navigation/control layer, không phủ lên
  toàn bộ content card; phải có fallback dễ đọc khi Reduce Transparency bật.
- Tôn trọng Reduce Motion; không để thông tin hoặc thao tác phụ thuộc animation.
- Primary action chừa safe area và inset khỏi cạnh khung.

Nguồn chính thức để đối chiếu khi có nghi vấn:

- `https://developer.apple.com/design/human-interface-guidelines/layout`
- `https://developer.apple.com/design/human-interface-guidelines/typography`
- `https://developer.apple.com/design/human-interface-guidelines/accessibility`
- `https://developer.apple.com/design/human-interface-guidelines/tab-bars`
- `https://developer.apple.com/design/human-interface-guidelines/materials`

Nếu nguồn Apple mới mâu thuẫn với con số/contract đã được phê duyệt trong spec, không tự
ý đổi scope. Ghi rõ khác biệt và xin quyết định trước khi thay đổi contract.

## Giới hạn phạm vi

- Không sửa `layout.contentMaxWidth` hoặc `ScreenScaffold` trong
  `@leopard/mobile-core`; chúng đang được nhiều Customer/shared screen sử dụng.
- Không thêm dependency nếu implementation có thể hoàn thành bằng React Native primitives
  hiện có.
- Không sửa backend, Prisma, API contract, lifecycle, tracking hoặc authorization.
- Không redesign toàn bộ từng màn hình trong task này. Các cải tiến screen-by-screen thuộc
  `docs/ui/14-driver-screen-by-screen-redesign-proposal.md` và phải tách thành slice khác.
- Không dùng DOM `<div>` trong source React Native và không tạo browser portal mới.
- Không sửa/refactor file ngoài plan chỉ vì thấy code chưa đẹp.
- Workspace có thể đang dirty. Chạy `git status --short` trước khi làm; bảo toàn thay đổi
  của người dùng và tuyệt đối không reset/revert file ngoài phạm vi.
- Không commit, push hoặc mở PR nếu người dùng chưa cho phép hành động đó. Các commit step
  trong plan chỉ là hướng dẫn khi quyền commit đã được xác nhận.

Nếu cần sửa drawer hoặc bottom navigation ngoài root integration, trước tiên phải tái
hiện được lỗi containment và viết regression test. Không thay đổi chúng theo phỏng đoán.

## Verification bắt buộc

Chạy đầy đủ các lệnh trong Task 5 của implementation plan:

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter driver lint
pnpm --filter driver export
pnpm --filter @leopard/mobile-core test
pnpm --filter @leopard/mobile-core typecheck
```

Thực hiện viewport matrix trong test plan, tối thiểu:

- `360x640`
- `360x800`
- `390x844`
- `393x852`
- `430x932`
- `768x1024`
- `1024x768`
- `1440x900`

Kiểm tra ít nhất login, OTP/register, orders, order detail dài, history, earnings, profile,
settings và chat. Mở drawer, bottom tabs, incoming offer, incident modal và keyboard.
Kiểm tra resize liên tục từ desktop xuống mobile, long Vietnamese copy, 200% text,
keyboard focus, reduced motion, reduced transparency và screen-reader semantics theo test
plan.

Không báo “đã pass manual QA” nếu môi trường không cho phép mở browser/device. Khi đó,
ghi rõ phần nào chưa chạy, lý do và lệnh/kịch bản chính xác để người dùng hoặc agent khác
chạy tiếp. Không thay manual evidence bằng suy đoán.

## Điều kiện báo hoàn tất

Chỉ báo hoàn tất khi:

- Tám acceptance criteria trong spec đều có automated hoặc visual evidence.
- Không còn P0/P1 thuộc responsive, containment, safe area hoặc accessibility.
- Native không bị cap; web không vượt quá `430px` app width.
- Drawer/modal/dock/sticky action/keyboard content không thoát khỏi frame.
- Full Driver gate và shared mobile-core regression pass.
- Diff không có thay đổi backend, business behavior, generated file, secret hoặc refactor
  ngoài scope.

Báo cáo cuối theo cấu trúc:

1. Tóm tắt behavior đã thay đổi.
2. Danh sách file đã tạo/sửa và trách nhiệm của từng file.
3. Kết quả RED → GREEN cho các test mới.
4. Kết quả từng lệnh verification.
5. Kết quả viewport/accessibility matrix kèm evidence.
6. Những phần chưa thể kiểm tra hoặc rủi ro còn lại.
7. Xác nhận không thay đổi API/data/lifecycle/authorization.
