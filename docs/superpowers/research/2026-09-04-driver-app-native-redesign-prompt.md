# Prompt — Redesign UI Driver LEOPARD (app-native, không icon hoạt hình)

> Dùng prompt này để giao cho một AI coding agent (Claude Code, Cursor...) thực hiện trực tiếp trong `apps/mobile`.
> Nguồn: `docs/superpowers/research/2026-09-04-driver-app-ui-design-strategy.md` (chiến lược đầy đủ) + `2026-09-04-driver-ux-market-research.md` (IA/tính năng).

---

```
Bạn đang làm việc trong monorepo LEOPARD (React Native / Expo Router, TypeScript,
StyleSheet). Nhiệm vụ: nâng cấp UI của 10 màn hình DRIVER trong apps/mobile để
đạt chuẩn "app-native" — hiện đại, tối giản, KHÔNG dùng icon hoạt hình/emoji —
theo đúng chiến lược đã được duyệt dưới đây. Đây là việc UI CRAFT (thị giác),
KHÔNG thay đổi domain logic, state machine, hay kiến trúc điều hướng.

═══════════════════════════════════════════════════════════════════
BƯỚC 0 — ĐỌC TRƯỚC KHI SỬA (bắt buộc, theo đúng thứ tự)
═══════════════════════════════════════════════════════════════════

1. docs/superpowers/research/2026-09-04-driver-app-ui-design-strategy.md
   — chiến lược đầy đủ, đọc hết trước khi code. Đây là spec chính của task này.
2. "apps/mobile/Leopard system mobile app-handoff/leopard-system-mobile-app/
   project/Leopard Mobile.dc.html" — bản thiết kế app-native tham chiếu (Claude
   Design mockup "v3"). Đọc phần driver (grep "screen_drv" / "role_driver") để
   thấy cấu trúc target: hero full-bleed, card phẳng-viền, icon SVG line-art,
   tab bar nổi, KPI grid, ma trận trạng thái (scenario) cho mỗi màn.
   KHÔNG copy nguyên hex màu của file này — chỉ lấy CẤU TRÚC (xem quy tắc màu
   ở mục 2 bên dưới).
3. apps/mobile/src/ui/icons/CoreIcons.tsx — bộ icon vector đã có
   (IconLocationPin, IconSpeedTruck...) — đây là chuẩn stroke/style phải theo.
4. apps/mobile/src/ui/FloatingNavBar.tsx — pattern tab bar nổi đã dùng cho
   Customer, phải áp dụng tương tự cho Driver.
5. apps/mobile/src/navigation/TabBar.tsx + apps/mobile/app/driver/_layout.tsx
   — tab bar driver hiện tại (cần thay thế).
6. apps/mobile/src/ui/ScreenScaffold.tsx — header ink/plain hiện tại.
7. apps/mobile/src/theme/tokens.ts — leopardPalette, colors, radius, spacing
   (nguồn chân lý duy nhất cho màu/spacing — KHÔNG tạo token màu mới).
8. Rules đã áp dụng cho repo này (nếu agent có quyền đọc):
   rules/common/coding-style.md, rules/react-native/*.md — bám đúng convention
   file layout, testing, a11y đã có trong repo.

═══════════════════════════════════════════════════════════════════
QUY TẮC THIẾT KẾ (KHÔNG ĐƯỢC VI PHẠM)
═══════════════════════════════════════════════════════════════════

1. KHÔNG dùng emoji làm icon trong bất kỳ file .tsx nào thuộc
   apps/mobile/src/features/driver/** hoặc apps/mobile/src/navigation/**.
   Toàn bộ icon phải là component SVG vector (stroke 1.75–2px, viewBox 24x24,
   không fill trừ chấm/marker nhỏ) — thêm vào CoreIcons.tsx nếu chưa có,
   theo đúng style của IconLocationPin/IconSpeedTruck.

2. MÀU: giữ nguyên 100% giá trị hex trong leopardPalette/colors (tokens.ts).
   KHÔNG thêm màu mới, KHÔNG đổi brand hex. Chỉ áp dụng lại các giá trị hiện
   có theo cấu trúc mới bên dưới.

3. CẤU TRÚC (lấy tinh thần từ mockup, giữ màu leopardPalette):
   a. Header "ink" (headerTone="ink") phải là khối full-bleed ở đầu màn,
      không có khối tối thứ 2 nào khác trong cùng màn (gộp mọi thông tin
      trạng thái/tracking hiện đang tách ra thành khối riêng — ví dụ
      missionStatusSlab trong DriverOrderDetailScreen — vào trong header).
   b. Card: bo góc radius.card (6px), viền 1px colors.neutral.subtleBorder,
      KHÔNG dùng shadow/elevation trừ khi đã có class dùng chung — ưu tiên
      nhất quán "phẳng-viền" trên toàn bộ 10 màn.
   c. Icon luôn nằm trong "chip" hình học (khối vuông bo 6px chứa icon 16-20px,
      nền brand.softBackground hoặc tương tự), không thả icon trần cạnh text
      trừ các icon rất nhỏ (11-14px) đi kèm label.
   d. Tab bar driver: thay TabBar.tsx bằng pattern giống FloatingNavBar
      (position: absolute nổi trên nội dung, bo lớn, đổ bóng leopardElevation,
      icon vector từ CoreIcons, active = nền primaryBg + icon/text màu primary).
   e. Giảm mật độ nhãn chữ-hoa (eyebrow/section label): tối đa 1 eyebrow mỗi
      màn (trong header). Các "SECTION LABEL" giữa thân bài đổi thành icon-chip
      nhỏ + tiêu đề sentence-case, KHÔNG phải toàn bộ label chữ hoa lặp lại.
   f. KHÔNG xếp nhiều card pastel lớn (nền tô màu nguyên khối) liên tiếp nhau
      trong cùng màn — gộp thành 1 card dạng list dòng (icon nhỏ + label +
      value mỗi dòng), badge trạng thái là pill nhỏ cuối dòng, không nhuộm
      cả khối nền theo chủ đề màu.

4. KHÔNG đổi domain logic, state machine (@leopard/shared), API contract,
   hay cấu trúc route/tab hiện tại (giữ 4 tab: Tổng quan/Doanh thu/Lịch sử/
   Hồ sơ; Hiệu suất/KYC/Cài đặt/Chat vẫn vào qua menu Hồ sơ hoặc order detail).
   Đây là task UI craft, không phải task tái cấu trúc IA.

5. Mọi thay đổi phải giữ nguyên props/behavior test hiện có (chạy test suite
   trước và sau mỗi bước) — nếu snapshot/assertion phụ thuộc vào text/testID
   cụ thể mà bạn đổi cấu trúc, cập nhật test tương ứng, không skip test.

═══════════════════════════════════════════════════════════════════
PHẠM VI — THỰC HIỆN THEO ĐÚNG THỨ TỰ NÀY (mỗi bước: RED → implement → GREEN
→ typecheck → report ngắn → commit riêng, theo quy ước
docs/superpowers/plans/14-ui-ux-standalone(1).md mục 12 "Definition of Done")
═══════════════════════════════════════════════════════════════════

BƯỚC 1 — Bổ sung icon vector còn thiếu vào CoreIcons.tsx
  Thêm (nếu chưa có, kiểm tra trước khi tạo trùng): IconCamera, IconShield,
  IconStar (có biến thể filled/outline theo rating), IconTrophy/IconBadge,
  IconPhoneCall, IconBank/IconWallet, IconIdCard, IconLicense, IconInsuranceDoc,
  IconBell. Style: stroke currentColor 1.75-2px, viewBox 24x24, hỗ trợ cả
  Platform.OS === 'web' (svg) và native (theo pattern IconLocationPin đã có).
  Test: mỗi icon có test render cơ bản (theo test file hiện có cho CoreIcons
  nếu tồn tại).

BƯỚC 2 — Nâng cấp tab bar Driver
  Tạo bản floating cho driver (tái dùng hoặc mở rộng FloatingNavBar để nhận
  danh sách tab tùy biến thay vì hardcode 4 tab Customer) — áp dụng cho
  apps/mobile/app/driver/_layout.tsx. Icon: dùng CoreIcons vector tương ứng
  Tổng quan/Doanh thu/Lịch sử/Hồ sơ. Giữ nguyên accessibility (accessibilityRole
  tab/accessibilityState selected) và touch target ≥44x44 đã có trong TabBar cũ.

BƯỚC 3 — Thay emoji còn lại (6 màn, độc lập, làm nhanh)
  - DriverEarningsScreen.tsx: thêm icon nhỏ cạnh 4 stat (chuyến/giờ/tip/thưởng)
    và icon route nhỏ trong mỗi trip-card.
  - DriverHistoryScreen.tsx: thay "📸 Đã nộp POD" bằng IconCamera + badge pill.
  - DriverPerformanceScreen.tsx: thay "★★★★★" text bằng component StarRating
    (SVG, đổ đầy theo rating số thực), thay "🏆" bằng IconTrophy trong chip +
    pill màu, thêm thanh tiến độ lên hạng kế tiếp dưới tier badge.
  - DriverKycScreen.tsx: thay "🛡️" bằng IconShield trong chip tròn 44px (không
    phủ nền cả banner), thêm icon riêng cho từng loại giấy tờ trong docList
    (CCCD/GPLX/đăng ký xe/bảo hiểm/lý lịch tư pháp — dùng IconIdCard/
    IconLicense/IconInsuranceDoc tương ứng), badge trạng thái dùng đúng
    StatusBadge/badgeVisual pattern thay vì text "✓ Đã duyệt" tự viết.
  - ProfileScreen.tsx: thay "⭐" bằng IconStar; gộp 3 infoCard pastel
    (Liên hệ/Năng lực/KYC) thành 1 card dạng list dòng (icon nhỏ + label +
    value), badge trạng thái KYC là pill nhỏ cuối dòng.
  - DriverChatScreen.tsx: thay "📞 Gọi khách" bằng IconPhoneCall trong pill.

BƯỚC 4 — Polish DriverOrdersScreen.tsx (Tổng quan)
  - Đổi AvailabilityControl từ Button text sang switch lớn nổi bật (dạng
    toggle với dot trạng thái + label), tách khỏi card thường, đặt ngay dưới
    header.
  - Thêm dải KPI 3 cột (Chuyến hôm nay / Thu nhập ước tính / Đánh giá TB) —
    card viền nhỏ, số đậm tabular-nums, nhãn 11px uppercase — dữ liệu LẤY TỪ
    view model hiện có (view.kpi* nếu đã tồn tại; nếu chưa có trong
    DriverListContentView, thêm field optional và map ở nơi build view model,
    KHÔNG hardcode số trong component).
  - Icon-hóa ActiveTripRail: thêm icon-chip (route/package) đầu card.

BƯỚC 5 — Polish DriverOrderDetailScreen.tsx (Chi tiết đơn)
  - Gộp missionStatusSlab (khối tối thứ 2) vào header ink — badge trạng thái
    + tracking label hiển thị ngay trong header, xóa khối tối rời.
  - Đổi LedgerSection (đánh số 01-04) → section header thường: icon-chip +
    tiêu đề sentence-case, bỏ số thứ tự.
  - ProofPanel: bỏ border dashed, dùng icon-chip camera (iconCircleInfo style)
    + CTA "Chụp ảnh xác nhận" nổi bật (primary button) thay vì khung "kéo thả".

BƯỚC 6 — Wallet screen (mới)
  Tạo apps/mobile/app/driver/wallet.tsx + 
  apps/mobile/src/features/driver/wallet/DriverWalletScreen.tsx theo đúng
  pattern app-native đã áp dụng ở bước 4-5 (card số dư lớn tabular-nums +
  CTA rút tiền full-width + card tài khoản ngân hàng với icon-chip + list
  lịch sử rút tiền dạng pill trạng thái). Dùng Demo Provider cho dữ liệu
  (không hardcode PII/số tài khoản thật), có đủ 5 trạng thái chuẩn của repo
  (loading/empty/error/success/offline) theo pattern các repository khác
  trong apps/mobile/src/features/driver/**. Thêm entry point từ menu Hồ sơ
  (MenuRow "Ví & rút tiền" trỏ router.push('/driver/wallet')).

═══════════════════════════════════════════════════════════════════
KHÔNG LÀM (out of scope — đừng tự ý mở rộng)
═══════════════════════════════════════════════════════════════════

- Không thêm tab thứ 5 hay đổi cấu trúc 4 tab hiện tại.
- Không đổi state machine OrderStatus / DriverAvailability trong
  @leopard/shared.
- Không tích hợp cổng thanh toán/COD thật cho màn Ví — chỉ UI shell +
  Demo Provider.
- Không đổi font family global trừ khi được yêu cầu riêng.
- Không xóa hoặc viết lại toàn bộ file — sửa tối thiểu, đúng phạm vi từng
  bước.

═══════════════════════════════════════════════════════════════════
DEFINITION OF DONE (mỗi bước)
═══════════════════════════════════════════════════════════════════

[ ] 0 emoji còn sót trong apps/mobile/src/features/driver/**
    và apps/mobile/src/navigation/TabBar.tsx (grep để verify)
[ ] Mọi icon mới đi qua CoreIcons.tsx, không inline SVG rời trong screen
[ ] Test hiện có vẫn pass; test mới cho behavior thay đổi (nếu có)
[ ] tsc --noEmit sạch, lint sạch
[ ] Không có màu hex mới ngoài tokens.ts
[ ] Touch target ≥44x44, accessibilityLabel/Role đầy đủ cho control mới
[ ] Report ngắn mỗi bước: file đã đổi, behavior thêm, test đã chạy,
    giới hạn còn lại
[ ] Conventional commit riêng cho mỗi bước (không gộp nhiều bước 1 commit)

Bắt đầu từ BƯỚC 1. Sau mỗi bước, dừng lại báo cáo trước khi qua bước tiếp theo.
```
