# Driver web phone frame & HIG test plan

**Spec:** `docs/ui/16-driver-web-phone-frame-apple-hig-spec.md`  
**Scope:** Root viewport behavior and global HIG guardrails; no business-flow regression

## 1. Automated unit tests to add

Create `apps/driver/src/navigation/DriverViewportShell.test.tsx`.

### Pure mode resolver

| Case | Input | Expected |
| --- | --- | --- |
| Native ignores width | `native`, `1440` | `native` |
| Small phone web | `web`, `360` | `edge-to-edge-web` |
| Large phone web | `web`, `430` | `edge-to-edge-web` |
| Intermediate web | `web`, `600` | `centered-web` |
| Tablet boundary | `web`, `768` | `framed-web` |
| Laptop web | `web`, `1440` | `framed-web` |

Boundary tests must include `479/480` and `767/768` to prevent off-by-one behavior.

### Rendered shell

Mock `Platform.OS` and `useWindowDimensions` using the existing Jest Expo setup. Assert:

- native frame has no `maxWidth`, decorative radius, border, or shadow;
- `390x844` web frame fills width and has no decorative frame chrome;
- `1440x900` web frame has `maxWidth: 430`, computed height no greater than `868`,
  radius `28`, border, shadow/elevation fallback, and `overflow: hidden`;
- `768x1024` web frame has width no greater than `430` and height no greater than `932`;
- resizing by rerender changes mode without remounting the child;
- `driver-safe-area` is present exactly once and contains the child;
- the outer canvas and inner frame expose the required test IDs.

Create `apps/driver/app/root-layout.test.tsx`. It must prove that routed content and the
drawer sentinel rendered by a mocked `DriverDrawerProvider` are both descendants of
`driver-viewport-frame`. This composition test is mandatory because shell unit tests
cannot detect a provider rendered outside the frame. Do not retest TanStack Query.

Create `apps/driver/src/navigation/DriverModalSurface.test.tsx`. Assert that native uses
React Native `Modal`, web renders an absolute contained layer inside its parent, hidden
web state returns `null`, and the modal surface exposes accessibility semantics. Existing
`IncomingDispatchModal.test.tsx` and `DriverIncidentModal.test.tsx` must additionally
assert that each component uses the contained surface on web.

## 2. Existing automated regression suite

Run in this order:

```bash
pnpm --filter driver test -- DriverViewportShell.test.tsx
pnpm --filter driver test -- root-layout.test.tsx DriverModalSurface.test.tsx
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter driver lint
pnpm --filter driver export
```

Then verify the shared package was not affected:

```bash
pnpm --filter @leopard/mobile-core test
pnpm --filter @leopard/mobile-core typecheck
```

Expected: all commands exit `0`. If Jest's existing `--forceExit` reports open handles,
record the warning separately; do not label it as caused by this slice without a focused
reproduction.

## 3. Manual viewport matrix

Run `pnpm --filter driver web` and inspect at least these routes:

- `/`
- `/login`
- `/verify-otp`
- `/driver-register`
- `/orders`
- `/orders/22222222-2222-4222-8222-222222222001`
- `/history`
- `/earnings`
- `/profile`
- `/settings`
- `/chat/22222222-2222-4222-8222-222222222001`

| Viewport | Expected frame | Required checks |
| --- | --- | --- |
| `360x640` | edge-to-edge | no x-overflow; CTA reachable with keyboard |
| `360x800` | edge-to-edge | dock/sticky action does not cover last item |
| `390x844` | edge-to-edge | long Vietnamese labels wrap |
| `393x852` | edge-to-edge | safe-area and header remain stable |
| `430x932` | edge-to-edge | no decorative border/shadow |
| `768x1024` | centered 430px frame | drawer/modal clipped to frame |
| `1024x768` | centered short frame | internal content scrolls; body does not overflow |
| `1440x900` | centered frame | no content stretches into laptop canvas |

Use the existing immutable order fixtures in
`apps/driver/src/features/orders/fixtures.ts` for automated loading, empty, error,
permission-denied, offline, active, and detail-state coverage. The assigned order ID is
`22222222-2222-4222-8222-222222222001`; the requested order IDs are
`22222222-2222-4222-8222-222222222101` and
`22222222-2222-4222-8222-222222222102`. Manual QA covers states that the connected local
runtime can reproduce; it must not invent production data. Always verify a long address,
a long user name, and a four-digit currency grouping to catch text reflow issues.

## 4. Interaction and containment scenarios

1. Open/close the Driver drawer. Its overlay and hit area stay within the frame.
2. Open an incoming-offer or incident modal. The backdrop covers the app frame, not the
   entire desktop canvas.
3. Navigate among all four bottom tabs. The selected state and labels remain visible.
4. Focus the login, OTP, chat, and profile-edit inputs. The software keyboard/visual
   viewport change must not make the submit action unreachable.
5. Scroll long order detail and settings pages. Only the screen content scrolls; no
   nested-scroll trap appears.
6. Resize continuously from `1440` to `360` width. The frame changes at `768` and `480`
   without a flash, stale width, or route reset.

## 5. Accessibility/HIG checks

- iOS text size: default, XXL, and an accessibility size approximating 200%.
- Browser zoom: 100%, 200%, and 400% for structural reflow; content remains reachable.
- Keyboard web pass: logical focus order, visible focus, Enter/Space activation, and no
  focus outside an open modal/drawer.
- VoiceOver/TalkBack smoke pass: page title, back/menu buttons, tab selected state,
  status text, primary action, and dynamic error announcement.
- Touch targets: sample every global control and all four tabs at `44x44` minimum.
- Contrast: text `4.5:1` minimum; large text and UI boundaries `3:1` minimum.
- Reduced Motion and Reduce Transparency: no lost information; translucent navigation
  has an opaque readable fallback.

## 6. Evidence required in the implementation PR

- Screenshots of `/orders`, one long detail screen, login, and chat at `390x844`,
  `1024x768`, and `1440x900`.
- A short capture resizing desktop to phone width and opening one modal or drawer.
- Command outputs for test, typecheck, lint, export, and shared mobile-core regression.
- A checklist mapping each acceptance criterion in the spec to evidence.
- A note confirming no API, data model, lifecycle, or authorization behavior changed.

## 7. Failure severity

- **P0:** app unusable, primary lifecycle action unreachable, route crashes.
- **P1:** content/modal/drawer escapes frame, horizontal overflow, keyboard blocks submit,
  native layout becomes capped, or assistive technology cannot reach the primary action.
- **P2:** incorrect shadow/radius, small alignment drift, or nonblocking visual mismatch.

No P0/P1 may remain when this slice is reported complete.
