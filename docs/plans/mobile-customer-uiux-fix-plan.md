# Plan: Fix All Mobile Customer UI/UX Issues (Apple HIG & Mobile Best Practices)

## Objective
Fix critical UI/UX flaws identified in the comprehensive 7-domain audit of `apps/mobile` and `packages/mobile-core` to achieve full compliance with Apple Human Interface Guidelines, WCAG 2.1 AA, and LEOPARD mobile standards without breaking existing test suites (596 tests).

## Scope & Tasks

### Task 1: Foundation Primitives & Showstoppers (Mobile-Core)
- **1.1 Native Vector Icons (`packages/mobile-core/src/ui/icons/CoreIcons.tsx` & `svg-icons.tsx`)**:
  - Replace HTML `<svg>` and empty `View` native fallbacks with proper React Native vector rendering (`react-native-svg` or lucide/phosphor RN equivalents) so iOS/Android render clean vector glyphs instead of empty boxes.
- **1.2 Haptics Modernization (`packages/mobile-core/src/ui/haptics.ts`)**:
  - Replace crude `Vibration.vibrate()` with `expo-haptics` (`impactAsync`, `selectionAsync`, `notificationAsync`) with graceful fallback.
  - Fix `Button.tsx` to stop vibrating on every single tap (reserve haptics for selection, confirmation, and critical actions).
- **1.3 Color Contrast & Token Updates (`packages/mobile-core/src/theme/tokens.ts`)**:
  - Fix amber/warning text contrast: Ensure primary CTA button text on amber `#F59E0B` is dark slate `#0F172A` (WCAG 4.5:1+) instead of unreadable white.
  - Update secondary text token from `#94A3B8` (2.56:1) to `#64748B` (4.6:1).
  - Add missing glassmorphism tokens to `tokens.ts`.
  - Remove unapproved "AI ETA & VRP" pilot boundary violations in `ProcessingModal.tsx` and `AnalyticsHeroCard.tsx`.
- **1.4 Reduced Motion Support (`TruckLoader.tsx`, `Skeleton.tsx`)**:
  - Add `AccessibilityInfo.isReduceMotionEnabled` checks so loaders and skeleton shimmers respect system reduced-motion settings.

### Task 2: Layout, Safe Area & Bottom Dock Clearance
- **2.1 Root Safe Area Correction (`apps/mobile/app/_layout.tsx`)**:
  - Remove double `SafeAreaView` at root; manage safe areas cleanly in child screens / `ScreenScaffold` to allow full-bleed edge-to-edge maps.
- **2.2 Floating Dock Clearance (`FloatingNavBar.tsx`, `ProfileScreen.tsx`, `EditProfileScreen.tsx`)**:
  - Add `maxWidth: 480` and centered self-alignment on `FloatingNavBar` for tablets.
  - Fix scroll container `paddingBottom: 110` on screens with floating bottom dock so logout button in `ProfileScreen` and CTAs in `EditProfileScreen` are never clipped.
  - Fix `BookingDetailsModal.tsx` bottom inset to respect iOS Home Indicator (34pt).

### Task 3: Touch Targets & Form Keyboard Handling
- **3.1 HitSlop & Min Touch Target (≥44pt iOS / ≥48dp Android)**:
  - Add `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` or minimum dimension wrapper to small action buttons:
    - Close (✕) and clear buttons in `MapAddressPickerModal.tsx`, `SavedAddressPickerModal.tsx`.
    - Copy buttons in `CustomerOrderDetailScreen.tsx`, `VietQRPaymentModal.tsx`, `CustomerWalletScreen.tsx`.
    - Action buttons in `AddressBookScreen.tsx`, eye toggle in `ProfileScreen.tsx`, auth links in `LoginScreen.tsx`.
- **3.2 Keyboard Handling (`KeyboardAvoidingView` & Tap Outside)**:
  - Wrap forms (`LoginScreen.tsx`, `BookingDetailsModal.tsx`, `EditProfileScreen.tsx`, `AddressBookScreen.tsx`) in `KeyboardAvoidingView` (with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`).
  - Add `TouchableWithoutFeedback onPress={Keyboard.dismiss}` so tapping outside closes the keyboard.

### Task 4: Navigation, Modals & Platform Conventions
- **4.1 Tab Navigation & Android Back Stack (`apps/mobile/src/navigation/TabBar.tsx`)**:
  - Use `router.replace()` instead of `router.push()` for tab transitions to prevent infinite back stack loop on Android.
- **4.2 Modal Backdrops & Android Back Handling**:
  - Add `onRequestClose` and backdrop tap dismiss to `VietQRPaymentModal.tsx` so Android hardware back button closes the modal.
  - Ensure modals have proper accessible dismiss gestures or buttons.
- **4.3 Status Bar Configuration**:
  - Configure `expo-status-bar` appropriately for dark headers and map views.

### Task 5: Accessibility & Typography Compliance
- **5.1 Switch & Control Labels (`CustomerSettingsScreen.tsx`)**:
  - Add `accessibilityLabel` to all Switch controls (Notifications, Biometrics, Sounds).
- **5.2 Chat Accessibility (`OrderChatScreen.tsx`)**:
  - Add accessible sender role and text to message bubbles so VoiceOver announces "Tin nhắn từ bạn" vs "Tin nhắn từ tài xế".
- **5.3 Dynamic Type Guard (`maxFontSizeMultiplier`)**:
  - Set `maxFontSizeMultiplier={1.3}` on fixed-height components (`FloatingNavBar`, `SlideToAction`, primary buttons) to prevent truncation when iOS Dynamic Type is large.
- **5.4 Notification Cards (`NotificationsScreen.tsx`)**:
  - Combine title, body, and timestamp in `accessibilityLabel` rather than title alone.

### Task 6: Verification & Test Suite
- Run `pnpm --filter @leopard/mobile-core test`
- Run `pnpm --filter @leopard/mobile-core typecheck`
- Run `pnpm --filter mobile test`
- Run `pnpm --filter mobile typecheck`
