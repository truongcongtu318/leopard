# Prompt bàn giao: triển khai redesign Driver Home (`/orders`)

Bạn đang làm việc trong repository `D:\leopard`, ứng dụng Driver tại `apps/driver`. Hãy tiếp tục và hoàn tất việc redesign màn hình tổng quan Driver `/orders` dựa trên nhận xét trong `D:\leopard\comment.md` và tài liệu phân tích đã tạo tại `D:\leopard\docs\ui\15-driver-home-comment-review.md`.

## Mục tiêu

Triển khai trực tiếp UI/UX mới cho Driver Home theo hướng mobile-first, đơn giản, hiện đại và phù hợp thao tác khi đang lái xe:

- Giữ navy đậm làm màu nhận diện ở vùng HUD/header và bản đồ, nhưng phần nội dung cần sáng, rõ và dễ đọc.
- Thu gọn vùng đầu trang để ưu tiên bản đồ, đơn hàng và CTA nghiệp vụ.
- Bottom navigation là điều hướng chính.
- Sidebar chỉ dành cho tiện ích phụ, không lặp lại điều hướng chính, trạng thái làm việc hoặc số liệu giả.
- Xóa dữ liệu tài xế giả, bộ lọc phương tiện không an toàn và nút mô phỏng khỏi production UI.
- Khi đang thực hiện chuyến, tập trung hoàn toàn vào quy trình chuyến và ẩn bottom navigation.

## Trạng thái hiện tại

Đã hoàn thành bước phân tích và RED trong TDD. Chưa triển khai production code cho redesign này.

Các test đã được chỉnh trước và hiện đang fail có chủ đích trong:

- `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`
- `apps/driver/src/features/orders/DriverScreens.test.tsx`

Lệnh chạy test phù hợp trên máy Windows này:

```powershell
cd D:\leopard\apps\driver
.\node_modules\.bin\jest.cmd --runInBand --forceExit --runTestsByPath src/features/orders/DriverOrdersScreen.test.tsx src/features/orders/DriverScreens.test.tsx
```

Không dùng pnpm shim ở thời điểm hiện tại vì pnpm đang lỗi kiểm tra chữ ký registry. Hãy dùng binary cục bộ trong `node_modules\.bin` cho Jest và TypeScript.

Các RED expectation chính:

1. Hiển thị identity thật được truyền vào, ví dụ `Trần Minh` và `Xe tải · 29H-123.45`.
2. Trạng thái dùng nhãn ngắn `Trực tuyến` / `Ngoại tuyến`.
3. Không hiển thị nút `Thử nổ đơn` theo mặc định.
4. Không hiển thị chip lọc `Xe van`, `1.25T`, `2.5T`.
5. Chỉ hiển thị nút mô phỏng khi bật prop preview/debug rõ ràng.
6. Khi có active trip, không render local sidebar và không render bottom navigation.

Repository đang có nhiều thay đổi chưa commit của người dùng và các phiên trước. Không checkout, reset, revert hoặc ghi đè thay đổi không thuộc task. Trước khi sửa, chạy `git status --short` và xem diff từng file mục tiêu để bảo toàn nội dung hiện có.

Repository có `.codegraph`; theo `AGENTS.md`, dùng `codegraph explore` trước khi grep hoặc đọc code nếu cần hiểu thêm call path/symbol.

## Các vấn đề đã xác nhận và cách triển khai

### 1. Loại bỏ drawer bị render hai lần

Hiện app root đã bọc routes bằng `DriverDrawerProvider` tại `apps/driver/app/_layout.tsx`. Provider render global `DriverSidebarDrawer` trong `apps/driver/src/navigation/DriverDrawerContext.tsx`.

`DriverOrdersScreen` lại import, quản lý state và render thêm một `DriverSidebarDrawer` cục bộ. `handleOpenMenu` đang mở cả local drawer và global drawer, gây chồng hai lớp.

Thực hiện:

- Xóa import, state và JSX của local drawer khỏi `DriverOrdersScreen`.
- `handleOpenMenu` chỉ gọi `openDrawer()` từ context.
- Đảm bảo test active trip không tìm thấy drawer cục bộ.
- Đơn giản hóa `DriverDrawerContext`: chỉ giữ `isOpen`, `openDrawer`, `closeDrawer`, `toggleDrawer` nếu không còn consumer của availability trong context.

### 2. Thu gọn HUD/header

Header hiện quá cao vì `DriverHomeHeader` và `DriverAvailabilityCard` xếp thành hai khối, trong đó availability card còn chứa bán kính, KPI và chip.

Thực hiện:

- Viết lại `DriverAvailabilityCard` thành control nhỏ gọn khoảng 40–44px cao.
- Control gồm chấm trạng thái và một nhãn duy nhất: `Trực tuyến` hoặc `Ngoại tuyến`.
- Giữ accessibility label hành động rõ ràng: `Tắt sẵn sàng` hoặc `Bật sẵn sàng`.
- Thêm prop dạng `availabilityControl?: ReactNode` cho `DriverHomeHeader` và đặt control trên cùng hàng với identity/menu.
- Tổng vùng HUD mục tiêu khoảng 64–80px nếu viewport cho phép.
- Không hiển thị KPI giả `4 chuyến`, `620k`, `5.5h` hoặc bán kính trong header.
- Không render chuông thông báo nếu chưa có handler/nguồn dữ liệu thật.

### 3. Dùng identity thật, xóa dữ liệu demo hard-code

Hiện màn hình đang hard-code:

- `Nguyễn Văn Tuấn`
- `51C-889.24`
- `2.5T`
- KPI và thứ hạng giả trong sidebar

Thực hiện:

- Thêm prop cho screen:

```ts
driverIdentity?: {
  name: string | null;
  vehicleLabel: string | null;
}
```

- `DriverHomeHeader` nhận giá trị nullable và dùng fallback an toàn như `Tài xế LEOPARD`; tuyệt đối không dùng dữ liệu cá nhân giả.
- Trong `DriverOrdersListRuntime`, dùng profile adapter đã có tại `apps/driver/src/features/profile/adapter.ts`.
- Query key hiện dùng ở profile runtime là `['driver', 'profile']`; tái sử dụng để tận dụng cache.
- Khi response là content, truyền `{ name, vehicleLabel }` vào `DriverOrdersScreen`.
- Cập nhật mock/test runtime nếu việc thêm profile query làm test hiện có thay đổi.
- Loading/error vẫn phải render geometry ổn định với fallback trung tính.

### 4. Ẩn debug action khỏi production

`DriverOrderFilters` hiện luôn render nút `Thử nổ đơn`, và screen luôn truyền callback mô phỏng.

Thực hiện:

- Thêm prop `showDebugActions?: boolean` vào `DriverOrdersScreen`, mặc định `false`.
- Chỉ truyền `onSimulateOffer` cho `DriverOrderFilters` khi prop này là `true`.
- Trong `DriverOrderFilters`, chỉ render nút khi callback tồn tại.
- Không suy luận debug mode từ dữ liệu hoặc URL production.

### 5. Xóa bộ lọc loại xe khỏi bảng đơn

Các chip `Tất cả`, `Xe van`, `1.25T`, `2.5T` đang filter client-side theo label. Điều này có thể làm tài xế chọn loại xe chưa được xác minh hoặc bỏ sót đơn backend đã phân phối phù hợp.

Thực hiện:

- Xóa `selectedVehicleFilter` và toàn bộ logic filter loại xe trong `DriverOrdersScreen`.
- Xóa chip phương tiện và props liên quan khỏi `DriverOrderFilters`.
- Danh sách visible chỉ cần loại các order đã dismiss khỏi danh sách backend trả về.
- Trong `ReceivingSettingsModal`, bỏ vehicle preference và các option loại xe; chỉ giữ thiết lập thực sự có tác dụng, hiện tại là bán kính nhận đơn.
- Xóa import/icon/state không còn dùng.

### 6. Điều chỉnh bottom sheet theo trạng thái

Hiện sheet dùng cố định `[0.18, 0.54, 0.92]` và initial index `1`, khiến empty state chiếm nhiều diện tích.

Khai báo các hằng số ổn định bên ngoài component để tránh effect reset do array mới mỗi render. Có thể dùng:

```ts
const EMPTY_SNAP_POINTS = [0.26, 0.38, 0.86];
const ORDER_SNAP_POINTS = [0.26, 0.50, 0.92];
const ACTIVE_TRIP_SNAP_POINTS = [0.32, 0.58, 0.92];
```

Quy tắc:

- Empty: initial index `0`.
- Có order: initial index `1`.
- Active trip: initial index `1` và ưu tiên nội dung hành động.
- Loading/error phải giữ bố cục ổn định, không nhảy mạnh.

### 7. Bottom navigation theo đúng vai trò

Thực hiện:

- Bottom navigation vẫn hiện ở trạng thái chờ đơn, loading, empty và error để tài xế có thể truy cập lịch sử/thu nhập/hồ sơ.
- Ẩn hoàn toàn bottom navigation khi `activeTrip` tồn tại.
- Xóa local `activeTab` state nếu nó chỉ tạo trạng thái giả; ở Home có thể truyền `activeTab="home"`. Mỗi route phải phản ánh tab thật của chính nó.

### 8. Tinh gọn global sidebar

Sidebar không nên lặp bốn mục của bottom navigation hoặc hiển thị cockpit/KPI/identity hard-code.

Thực hiện trong `DriverSidebarDrawer.tsx`:

- Xóa card profile giả, biển số giả, ranking giả.
- Xóa availability toggle và mini stats khỏi sidebar.
- Xóa các primary destination trùng bottom nav: Trang chủ, Lịch sử, Thu nhập, Tôi.
- Giữ các tiện ích phụ có route thật như Cài đặt và hỗ trợ. Không tạo route giả chỉ để lấp UI.
- Giữ nút đóng, focus/accessibility và vùng safe area.

Nếu đơn giản hóa sidebar khiến `DriverDrawerContext` không còn cần API availability, xóa source of truth thứ hai này. Availability trên Home phải đến từ `view.availability` và mutation/service hiện có của orders runtime.

### 9. Trạng thái radar và dữ liệu thời gian

- Không giả lập trạng thái bằng animation nếu đã có `refreshedAtLabel` từ view model.
- Có thể truyền `refreshedAtLabel` vào vùng radar và hiển thị dạng `Cập nhật ...`.
- Tránh thêm claim realtime nếu hệ thống không có tín hiệu realtime thực tế.

## File dự kiến chỉnh sửa

Phạm vi chính:

- `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- `apps/driver/src/features/orders/DriverOrdersListRuntime.tsx`
- `apps/driver/src/features/orders/components/DriverHomeHeader.tsx`
- `apps/driver/src/features/orders/components/DriverAvailabilityCard.tsx`
- `apps/driver/src/features/orders/components/DriverOrderFilters.tsx`
- `apps/driver/src/features/orders/components/ReceivingSettingsModal.tsx` nếu modal là file riêng; nếu đang nằm trong screen thì refactor tại đó.
- `apps/driver/src/navigation/DriverDrawerContext.tsx`
- `apps/driver/src/navigation/DriverSidebarDrawer.tsx`
- Các test liên quan trực tiếp khi cần cập nhật mock/query mới.

Không mở rộng sang redesign login, OTP hoặc toàn bộ order lifecycle trong task này.

## Yêu cầu thiết kế

- Mobile-first, ưu tiên viewport phổ biến 360×800 và 390×844.
- Touch target tối thiểu 44×44.
- Navy là vùng nhận diện/điều khiển; nội dung quan trọng phải có độ tương phản WCAG AA.
- CTA nghiệp vụ có thứ bậc rõ; không nhồi KPI hoặc decorative copy vào vùng điều khiển.
- Kiểm tra text overflow với tên tài xế và vehicle label dài.
- Các trạng thái loading, empty, error, success và active trip đều phải dùng được.
- Không hiển thị dữ liệu cá nhân, KPI, ranking hoặc trạng thái mô phỏng như dữ liệu thật.

## Quy trình thực hiện bắt buộc

1. Đọc `AGENTS.md`, các tài liệu source of truth liên quan và diff hiện tại.
2. Dùng CodeGraph để kiểm tra call path/consumer trước khi xóa props hoặc context state.
3. Chạy focused tests để xác nhận RED hiện tại.
4. Viết production code tối thiểu để GREEN.
5. Refactor, xóa dead code/import/state và giữ object updates immutable.
6. Chạy test liên quan rộng hơn, typecheck và lint gần nhất có sẵn.
7. Kiểm tra trực quan `/orders` ở viewport mobile nếu dev server có thể chạy.
8. Sau khi sửa code, thực hiện code review độc lập theo yêu cầu `AGENTS.md`; xử lý toàn bộ P0/P1 trong phạm vi.
9. Xem `git diff` cuối cùng để bảo đảm không chứa thay đổi ngoài phạm vi hoặc dữ liệu nhạy cảm.

## Verification

Ít nhất chạy:

```powershell
cd D:\leopard\apps\driver
.\node_modules\.bin\jest.cmd --runInBand --forceExit --runTestsByPath src/features/orders/DriverOrdersScreen.test.tsx src/features/orders/DriverScreens.test.tsx
```

Sau khi focused tests xanh, tìm và chạy các test runtime/radar/navigation liên quan. Chạy typecheck bằng binary local hoặc script gần nhất hoạt động, ví dụ:

```powershell
cd D:\leopard\apps\driver
.\node_modules\.bin\tsc.cmd --noEmit
```

Nếu project dùng config/script riêng, kiểm tra `package.json` và dùng đúng script tương ứng. Ghi rõ bất kỳ check nào không thể chạy cùng nguyên nhân cụ thể.

## Hoàn tất khi

- Tất cả RED expectation nêu trên đã GREEN.
- Không còn drawer kép.
- HUD gọn và dùng identity thật hoặc fallback trung tính.
- Production không còn debug button, fake KPI, fake driver identity hoặc chip lọc phương tiện.
- Empty sheet thấp; active trip ẩn bottom nav.
- Global sidebar chỉ còn tiện ích phụ có thật.
- Focused tests, test liên quan và typecheck đạt.
- Manual viewport check không có overflow, overlap, mất CTA hoặc tương phản kém.
- Không làm mất các thay đổi chưa commit có sẵn của người dùng.

Khi báo cáo kết quả, nêu ngắn gọn: thay đổi hành vi/UI, các file chính, test đã chạy, kết quả manual check và rủi ro còn lại (nếu có). Không commit hoặc push nếu người dùng chưa yêu cầu.
