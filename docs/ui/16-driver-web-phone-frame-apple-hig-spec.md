# Driver web phone frame & Apple HIG design spec

**Status:** Ready for implementation  
**Scope:** `apps/driver` only; no backend, API, lifecycle, or data-contract changes  
**Date:** 2026-09-14  
**Related:** [Responsive rules](05-responsive-rules.md), [Driver screen-by-screen proposal](14-driver-screen-by-screen-redesign-proposal.md)

## 1. Goal

Render every Driver route as a phone-sized experience on the web instead of stretching
across a laptop or desktop viewport. Keep the native iOS/Android app full-screen and
responsive. Improve the shared visual behavior according to Apple Human Interface
Guidelines (HIG) without copying Apple assets or introducing unsupported business
features.

## 2. Non-goals

- Do not change order lifecycle, permissions, API payloads, navigation destinations, or
  persistence.
- Do not redesign every screen in this slice. Screen-by-screen visual work remains in
  `docs/ui/14-driver-screen-by-screen-redesign-proposal.md`.
- Do not add a fake iPhone notch, Dynamic Island, hardware buttons, device branding, or
  a device-selector toolbar to production.
- Do not cap native iOS/Android width or height.
- Do not apply the Driver web constraint to `apps/mobile` or shared consumers of
  `@leopard/mobile-core`.

## 3. Current-state findings

- `apps/driver/app/_layout.tsx` renders `SafeAreaView > Slot` with `flex: 1`; web content
  can therefore occupy the full browser width.
- `packages/mobile-core/src/theme/tokens.ts` defines `layout.contentMaxWidth = 768`, and
  `ScreenScaffold` uses it. That width is suitable for a shared mobile/tablet primitive,
  but is too wide for the requested Driver phone preview on laptops.
- The Driver app is portrait-only and does not support iPad in `apps/driver/app.json`.
- Several Driver screens already use fixed and absolute bottom UI. The root shell must
  establish the containing block so docks, sheets, and sticky actions remain inside the
  phone frame.
- `DriverDrawerProvider` renders the drawer after its children, so wrapping only `<Slot />`
  would leave the drawer outside the frame. The viewport shell must wrap the drawer
  provider itself.
- `IncomingDispatchModal` and `DriverIncidentModal` use React Native `Modal`. On web that
  presentation can be portalled to the browser viewport, so a Driver-local contained
  modal surface is required for web while native keeps the platform modal.
- The working tree contains unrelated and overlapping Driver changes. The implementer
  must preserve them and keep this slice limited to the root shell, its tests, and docs.

## 4. Authoritative design guidance

This spec translates the following official Apple guidance into cross-platform React
Native behavior:

- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout): adapt
  to different screen sizes and orientations, respect safe areas, preserve hierarchy,
  and test common sizes.
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography):
  use legible hierarchy, support Dynamic Type, and avoid losing useful text at larger
  accessibility sizes.
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility):
  design for enlarged text, assistive technology, sufficient contrast, and multiple
  input methods.
- [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars):
  use the tab bar for top-level navigation, keep labels concise, and do not use tabs as
  actions.
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials):
  use translucent/Liquid Glass treatment as a restrained functional layer for controls
  and navigation, not as decoration across the content layer.

The centered phone frame on desktop is a LEOPARD web-preview/product decision, not an
Apple HIG requirement.

## 5. Responsive contract

### 5.1 Platform behavior

| Runtime | Width | Height | Outer presentation |
| --- | --- | --- | --- |
| Native iOS/Android | Device window | Device window | None; full-screen native app |
| Web `< 480px` | `100%` | `100dvh` equivalent | Edge-to-edge; no decorative border/shadow |
| Web `480–767px` | `min(100%, 430px)` | Available viewport | Centered on a neutral canvas |
| Web `>= 768px` | `430px` maximum | `min(932px, viewport - 32px)` | Centered, rounded frame, subtle border/shadow |

Use `useWindowDimensions()` numeric width/height instead of a fixed `vh` value so mobile
browser chrome and window resizing update the shell. A short browser viewport must never
produce document-level vertical overflow solely because of the decorative frame.

### 5.2 Frame constants

- `compactWebBreakpoint`: `480`
- `framedWebBreakpoint`: `768`
- `phoneFrameMaxWidth`: `430`
- `phoneFrameMaxHeight`: `932`
- desktop outer inset: `16` on every side
- desktop frame radius: `28`
- frame border: one device pixel using the existing neutral border token
- outer canvas: the existing cool neutral Driver canvas, without a gradient
- frame surface: current Driver screen canvas

These are web presentation constants owned by Driver, not additions to shared mobile
layout tokens unless another app explicitly adopts the same contract later.

### 5.3 Scroll and positioning

- The outer web canvas does not scroll. The framed app is the viewport; each existing
  screen's own `ScrollView`/`FlatList` remains the scroll owner.
- The frame uses `overflow: hidden` only at the outer rounded boundary on framed web.
- Bottom navigation, modals, sheets, toast, sticky CTA, and keyboard-avoiding content
  must be clipped/positioned relative to the inner app frame, never the laptop viewport.
- Do not add a second `ScrollView` around `<Slot />`.
- Keep exactly one safe-area owner: the root `SafeAreaView` in the Driver shell.

## 6. Component contract

Create an app-local shell at
`apps/driver/src/navigation/DriverViewportShell.tsx`.

```ts
export const DRIVER_PHONE_FRAME = {
  compactWebBreakpoint: 480,
  framedWebBreakpoint: 768,
  maxWidth: 430,
  maxHeight: 932,
  outerInset: 16,
} as const;

export type DriverViewportMode = 'native' | 'edge-to-edge-web' | 'centered-web' | 'framed-web';

export function resolveDriverViewportMode(
  platform: 'web' | 'native',
  width: number,
): DriverViewportMode;

export function DriverViewportShell(props: Readonly<{ children: React.ReactNode }>): React.JSX.Element;
```

`DriverViewportShell` owns the outer canvas, inner frame, root `SafeAreaView`, and test
IDs. `apps/driver/app/_layout.tsx` retains providers and error boundary, but composes the
frame outside `DriverDrawerProvider` so both route content and the provider-rendered
drawer share the same containing boundary.

Required test IDs:

- `driver-viewport-canvas`
- `driver-viewport-frame`
- `driver-safe-area`

Create `apps/driver/src/navigation/DriverModalSurface.tsx` for Driver operational
modals. It renders the existing React Native `Modal` on native. On web it renders an
absolute-fill modal layer in the current framed tree, returns `null` when hidden, exposes
modal accessibility semantics, and handles the existing close callback. Migrate only
`IncomingDispatchModal` and `DriverIncidentModal` in this slice.

## 7. Apple-HIG-aligned polish guardrails

This slice establishes global guardrails; it does not require rewriting every screen.

- Preserve iOS system font behavior; do not introduce a bundled imitation of SF Pro.
- Body copy should normally be 15–17pt; never reduce decision-critical content to make
  it fit the frame. Let text wrap and content scroll.
- Interactive targets are at least `44 x 44` points on native and CSS pixels on web.
- Support font scaling. Avoid fixed-height text containers, forced one-line truncation
  for addresses/actions, and layouts that overlap at 200% text size.
- Keep the four-item Driver bottom navigation for top-level destinations only. Use
  toolbars or contextual buttons for actions.
- Translucency belongs on navigation/control surfaces only. Content cards remain opaque
  and readable, and reduced transparency must have a solid fallback.
- Status meaning must include text, not color alone. Icon-only controls require an
  `accessibilityLabel`; dynamic errors/status use an appropriate live region.
- Respect reduced motion. Press feedback may be subtle, but operational information
  must not depend on animation.
- Primary actions remain inset from frame edges and safe areas; avoid visually
  edge-to-edge full-width buttons.

## 8. Acceptance criteria

1. At `1440x900` and `1024x768`, every Driver route appears inside one centered frame no
   wider than `430px`; content, drawer, dock, modal, and sticky actions do not escape it.
2. At `768x1024`, the same centered frame contract applies.
3. At `390x844`, `393x852`, `430x932`, `360x800`, and `360x640`, the app uses the full
   available width without decorative desktop chrome or horizontal overflow.
4. Native iOS/Android behavior remains full-screen and uses the root safe area.
5. Resizing the browser recomputes presentation without reload.
6. Each route keeps its existing navigation, data behavior, loading/error/empty states,
   and business actions.
7. Keyboard, 200% text scaling, and long Vietnamese content do not hide the primary CTA
   or make content unreachable.
8. Automated unit tests, Driver test/typecheck/lint, web export, and the manual viewport
   matrix in the companion test plan pass.

## 9. Explicit review decisions

- A `430px` cap intentionally targets the largest mainstream iPhone portrait class while
  allowing narrower phones to reflow.
- Desktop frame height is capped only for web presentation; the app remains scrollable
  within the frame and is not rendered as a static screenshot.
- Shared `ScreenScaffold` stays unchanged in this slice. Changing its `768px` token would
  create avoidable blast radius in Customer screens and shared tests.
- Visual screen redesign beyond root framing should be implemented as later vertical
  slices using `docs/ui/14-driver-screen-by-screen-redesign-proposal.md`.
