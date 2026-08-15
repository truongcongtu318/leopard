# LEOPARD UI Quality Scorecard

> **Áp dụng:** Wave 4 static UI/UX cho từng role
>
> **Pass threshold:** `>=85/100` và không category nào dưới `8/10`
>
> **Core contract:** `docs/ui/04-design-system.md`

Scorecard này được dùng lại cho Customer, Driver, Fleet Owner và Admin. Mỗi role
được chấm độc lập trên implementation và preview evidence của chính role đó. Điểm
cao không bù được một category dưới sàn hoặc một blocking gate thất bại.

## 1. Điều kiện chấm

Ghi đầy đủ metadata trước review:

| Trường                   | Evidence                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ |
| Role / lane              | `<CUSTOMER \| DRIVER \| FLEET_OWNER \| ADMIN>`                                 |
| Commit SHA               | `<sha>`                                                                        |
| Reviewer                 | `<name>`                                                                       |
| Review date              | `<YYYY-MM-DD>`                                                                 |
| Preview route/build      | `<route hoặc artifact>`                                                        |
| Fixture scenario         | `<scenario IDs; xác nhận deterministic + preview banner>`                      |
| Viewports                | `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900` theo platform áp dụng |
| Screen reader / keyboard | `<tool + journey>`                                                             |
| Automated checks         | `<test, lint, typecheck, a11y/visual command>`                                 |

Không chấm mockup cô lập khi implementation composition khác mockup. Evidence phải
đến từ local preview/build sử dụng component và token sẽ đi vào production path.

## 2. Cách tính điểm

- Mỗi category có điểm nguyên `0–10`; tổng tối đa `100`.
- `10`: contract đầy đủ, evidence rõ, không còn issue.
- `9`: đạt contract, chỉ còn polish nhỏ không ảnh hưởng workflow/a11y.
- `8`: đạt mức production-pilot tối thiểu; có issue không blocking được ghi owner.
- `0–7`: fail category; role không qua static gate.
- Không dùng `N/A` cho mười category. Nếu một component không xuất hiện ở role, chấm
  quality của pattern tương đương trong role thay vì bỏ trọng số.
- Dark mode không phải category: pilot ghi `N/A` và phải pass no-partial-dark gate.

Kết quả chỉ là `PASS` khi đồng thời:

```text
total >= 85
AND every category >= 8
AND accessibility_gate = PASS
AND ai_slop_gate = PASS
AND blocker_count = 0
```

## 3. Mười category

| #   | Category                | Yêu cầu để đạt tối thiểu 8/10                                                                                                                   | Evidence bắt buộc                                                  |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Color consistency       | Chỉ dùng core semantic colors; canonical status mapping đúng; contrast AA; color không là tín hiệu duy nhất                                     | Token/component references, contrast result và status samples      |
| 2   | Typography hierarchy    | Một page title; heading tuần tự; type tokens đúng; long Vietnamese copy/text zoom không overlap; numeric data dễ quét                           | Screenshot/recording long-copy + heading/DOM hoặc RN tree evidence |
| 3   | Spacing rhythm          | Scale 4/8/12/16/24/32; density đúng role; không arbitrary spacing ngoài named layout constraint; không nested cards                             | Token scan/diff và ít nhất một dense/long composition              |
| 4   | Component consistency   | Shared primitive/variant được dùng; cùng action/status/state có cùng semantics; đầy đủ enabled/pressed-hover/focus/disabled/loading khi phù hợp | Component catalogue, interaction tests và deviation log            |
| 5   | Responsive behavior     | Đủ viewport platform; không page overflow; sticky/safe-area/keyboard không che content; table đổi row-detail dưới 768 px                        | Screenshot matrix và overflow/text-fit checklist                   |
| 6   | Motion & reduced motion | Motion token, có mục đích, không layout shift; reduced-motion fallback hoạt động; loading giữ kích thước                                        | Normal/reduced-motion recording hoặc test evidence                 |
| 7   | Accessibility           | Semantic/native controls; labels/errors; keyboard/touch/screen reader; focus management; live regions; target size; contrast                    | Accessibility gate mục 5 có owner/evidence cho từng dòng           |
| 8   | Information density     | First viewport cho thấy task/status/exception đúng role; metadata phụ không cạnh tranh; scan path rõ; không card/chart thừa                     | Annotated screen hierarchy và reviewer scan test                   |
| 9   | State completeness      | Loading, empty/no-results, error, success, permission-denied và role-specific offline/stale/reconnect/expired/conflict có copy/action đúng      | State catalogue + test/screenshot cho từng state áp dụng           |
| 10  | Polish & AI-slop        | Hover/pressed/focus/feedback đầy đủ; copy tiếng Việt rõ; no generic generated pattern; map/media fallback có chủ đích                           | AI-slop gate mục 6 + visual diff/edge-case evidence                |

## 4. Phiếu chấm dùng lại

| #   | Category                | Score /10 | Evidence (file:line, test, screenshot) | Issue / owner / due |
| --- | ----------------------- | --------: | -------------------------------------- | ------------------- |
| 1   | Color consistency       |           |                                        |                     |
| 2   | Typography hierarchy    |           |                                        |                     |
| 3   | Spacing rhythm          |           |                                        |                     |
| 4   | Component consistency   |           |                                        |                     |
| 5   | Responsive behavior     |           |                                        |                     |
| 6   | Motion & reduced motion |           |                                        |                     |
| 7   | Accessibility           |           |                                        |                     |
| 8   | Information density     |           |                                        |                     |
| 9   | State completeness      |           |                                        |                     |
| 10  | Polish & AI-slop        |           |                                        |                     |
|     | **Total**               |  **/100** | **Threshold: 85**                      |                     |

```text
Result: PASS | FAIL
Lowest category:
Accessibility gate: PASS | FAIL
AI-slop gate: PASS | FAIL
Blocking issues:
Reviewer decision:
```

## 5. Accessibility gate

Mọi checkbox phải có evidence hoặc issue; một lỗi nghiêm trọng làm role fail bất kể
điểm tổng.

### Semantics và forms

- [ ] Web dùng semantic landmarks/headings/table/form/button/link; mobile dùng native
      role/label/state phù hợp.
- [ ] Mọi input/select/textarea có visible label nối đúng; placeholder không thay label.
- [ ] Required state có cả visual và screen-reader meaning.
- [ ] Field error liên kết control (`aria-describedby`/native hint), có invalid state và
      được announce phù hợp.
- [ ] Icon-only action có accessible name; decorative SVG/image bị ẩn.

### Keyboard, touch và focus

- [ ] Mọi action web thao tác được bằng keyboard; không `onClick`-only trên element
      không interactive hoặc sortable `th`.
- [ ] Tab order theo visual/task order; không positive `tabIndex`.
- [ ] Dialog/drawer có accessible name, initial focus, focus trap, `Escape` khi an toàn
      và restore focus về trigger.
- [ ] Focus visible 2 px/offset, không bị sticky region che.
- [ ] Touch target tối thiểu `44 × 44` px; primary Driver action kiểm tra one-handed
      reach và safe area.

### Dynamic content và perception

- [ ] Loading/status/tracking/upload/command feedback dùng live announcement có mức
      ưu tiên đúng, không lặp liên tục.
- [ ] Status và chart/map legend không dựa vào màu duy nhất.
- [ ] Web usable ở text zoom 200%; mobile usable với Dynamic Type và long Vietnamese
      copy.
- [ ] Contrast text/control/focus đạt WCAG AA.
- [ ] Reduced-motion preference được tôn trọng; không còn animation trang trí bắt buộc.
- [ ] Permission-denied không render hoặc flash private children trước redirect/state.

### Blocking accessibility defects

- Keyboard trap hoặc action chính không dùng được bằng keyboard/screen reader.
- Missing accessible name cho primary/destructive action.
- Form error không thể liên hệ với field khiến người dùng không hoàn tất flow.
- Contrast dưới AA cho nội dung/action/status quan trọng.
- Sticky action, keyboard hoặc zoom che content/action.
- Private data xuất hiện trong permission-denied state.

## 6. AI-slop gate

Tất cả phải là `false`. Mỗi mục `true` là blocker cho đến khi loại bỏ hoặc có rationale
được Design System Owner và Product Owner duyệt.

| Phát hiện                                                                        | true/false | Evidence / rationale |
| -------------------------------------------------------------------------------- | ---------- | -------------------- |
| Purple/blue decorative gradient hoặc palette một hue không có semantic purpose   |            |                      |
| Glassmorphism, decorative blob/hero hoặc stock-like atmospheric media            |            |                      |
| Oversized hero/KPI/card làm workflow bị đẩy khỏi first viewport                  |            |                      |
| Card lồng card, mọi vùng đều rounded hoặc shadow nhiều lớp                       |            |                      |
| Chart/KPI/fake operational data không trace được đến requirement                 |            |                      |
| Fixture/random data không có banner “Bản xem trước giao diện — dữ liệu mô phỏng” |            |                      |
| Status chỉ dùng màu/icon/emoji; generic English/lorem/vague action copy          |            |                      |
| Scroll reveal, gratuitous pulse/spin hoặc motion không truyền đạt state          |            |                      |
| Dependency/font/icon/component duplicate chỉ phục vụ flourish                    |            |                      |
| Primary workflow bị che bởi marketing explanation                                |            |                      |

## 7. Automatic blockers ngoài điểm số

- Arbitrary semantic color/spacing thay vì token mà không có deviation record.
- Mobile/web status mapping khác canonical table trong core contract.
- Missing loading, empty/no-results, error, success hoặc permission-denied ở main
  screen; missing offline/stale/reconnect/conflict khi journey cần.
- Horizontal overflow ngoài table container chủ ý.
- Component đổi kích thước khi loading gây layout shift hoặc double-submit.
- `ETA` thiếu từ “dự kiến”; source `DEMO` thiếu nhãn “Dữ liệu mô phỏng”.
- Fleet Owner có mutation affordance hoặc thiếu fleet-scope marker.
- Admin privileged action thiếu reason/context/confirmation/audit feedback.
- Customer/Driver fixture tự quyết định lifecycle, price, ETA, permission hoặc payment.
- Partial dark mode (`dark:`, theme toggle, dark token/media query riêng lẻ).

## 8. Evidence package theo role

Mỗi handoff/PR đính kèm tối thiểu:

1. Component catalogue: token samples, typography, Button/Form/Status/ScreenState và
   role-specific Route Spine/patterns.
2. State catalogue: happy path cùng loading, empty/no-results, error, success,
   permission-denied và state đặc thù role.
3. Responsive matrix theo viewport áp dụng, gồm long address/identifier/cargo copy.
4. Keyboard/screen-reader hoặc React Native accessibility walkthrough.
5. Normal/reduced-motion comparison.
6. Scorecard đã điền, issue list, Design System review decision và commit SHA.

Static gate chỉ chứng minh presentation đã sẵn sàng. API/Socket/upload/location thật,
persistence sau refresh và E2E role journey vẫn là điều kiện riêng để PH-12 hoàn tất.

## 9. No-partial-dark gate

Dark mode là `N/A` cho pilot. Reviewer chạy source scan ở path role/platform và xác
nhận không có theme toggle, `dark:` utility, `prefers-color-scheme` override hoặc dark
token rời rạc. Mục này là pass/fail, không cộng điểm.
