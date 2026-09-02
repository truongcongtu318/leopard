import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native';

import { colors, leopardElevation, leopardPalette, leopardRadius, spacing, typography, pastelTheme } from '../../theme/tokens';

export type QuickAuthScreenProps = Readonly<{
  onLogin: (credentials: { identifier: string; pass: string }) => void;
  onGoogleLogin?: () => void;
  onGuestContinue?: () => void;
  onForgotPassword?: () => void;
  onSwitchToRegister?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}>;

export function QuickAuthScreen({
  errorMessage,
  isLoading = false,
  onForgotPassword,
  onGoogleLogin,
  onGuestContinue,
  onLogin,
  onSwitchToRegister,
}: QuickAuthScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSubmit = () => {
    if (!identifier.trim() || !password.trim()) return;
    onLogin({ identifier: identifier.trim(), pass: password });
  };

  const handleDemoLogin = (role: 'customer' | 'driver' | 'fleet') => {
    setIdentifier(role);
    setPassword('demo123');
    onLogin({ identifier: role, pass: 'demo123' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerArea}>
          <Pressable onPress={() => setShowAccountMenu(true)} style={styles.illustrationCard}>
            <Text style={styles.heroEmoji}>👨‍✈️ 🚚</Text>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>Sẵn sàng nhận hàng ngay!</Text>
            </View>
          </Pressable>
          <Text style={styles.welcomeTitle}>Đăng nhập LEOPARD</Text>
          <Text style={styles.welcomeSubtitle}>
            Hệ thống kết nối vận tải xe tải & xe ba gác thông minh
          </Text>
        </View>

        <View style={styles.formCard}>
          {errorMessage ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI HOẶC EMAIL</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                accessibilityLabel="Số điện thoại hoặc Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setIdentifier}
                placeholder="Nhập số điện thoại hoặc email"
                placeholderTextColor={leopardPalette.textMutedSlate}
                style={styles.textInput}
                value={identifier}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>MẬT KHẨU</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                accessibilityLabel="Mật khẩu"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={leopardPalette.textMutedSlate}
                secureTextEntry={!showPassword}
                style={styles.textInput}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                accessibilityRole="button"
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeToggle}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              onPress={() => setRememberMe((prev) => !prev)}
              style={styles.rememberRow}
            >
              <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
                {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.rememberText}>Ghi nhớ</Text>
            </Pressable>

            {onForgotPassword ? (
              <Pressable
                accessibilityRole="button"
                onPress={onForgotPassword}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>Quên mật khẩu?</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="Đăng nhập"
            accessibilityRole="button"
            disabled={isLoading || !identifier.trim() || !password.trim()}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.primaryBtn,
              isLoading || !identifier.trim() || !password.trim() ? styles.primaryBtnDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </Text>
          </Pressable>
          
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>TÀI KHOẢN TRẢI NGHIỆM</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.demoGrid}>
            <Pressable
              onPress={() => handleDemoLogin('customer')}
              style={[styles.demoCard, { backgroundColor: pastelTheme.blueCard.bg, borderColor: pastelTheme.blueCard.border }]}
            >
              <Text style={styles.demoCardIcon}>📦</Text>
              <Text style={[styles.demoCardText, { color: pastelTheme.blueCard.text }]}>Khách hàng</Text>
            </Pressable>
            
            <Pressable
              onPress={() => handleDemoLogin('driver')}
              style={[styles.demoCard, { backgroundColor: pastelTheme.greenCard.bg, borderColor: pastelTheme.greenCard.border }]}
            >
              <Text style={styles.demoCardIcon}>🚚</Text>
              <Text style={[styles.demoCardText, { color: pastelTheme.greenCard.text }]}>Tài xế</Text>
            </Pressable>
            
            <Pressable
              onPress={() => handleDemoLogin('fleet')}
              style={[styles.demoCard, { backgroundColor: pastelTheme.yellowCard.bg, borderColor: pastelTheme.yellowCard.border }]}
            >
              <Text style={styles.demoCardIcon}>🏢</Text>
              <Text style={[styles.demoCardText, { color: pastelTheme.yellowCard.text }]}>Chủ xe</Text>
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>HOẶC TIẾP TỤC VỚI</Text>
            <View style={styles.dividerLine} />
          </View>

          {onGoogleLogin ? (
            <Pressable
              accessibilityLabel="Đăng nhập với Google"
              accessibilityRole="button"
              onPress={onGoogleLogin}
              style={({ pressed }) => [styles.googleBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Đăng nhập bằng Google</Text>
            </Pressable>
          ) : null}

          <View style={styles.bottomLinks}>
            {onGuestContinue ? (
              <Pressable
                accessibilityLabel="Tra cứu nhanh không cần tài khoản"
                accessibilityRole="button"
                onPress={onGuestContinue}
                style={styles.guestBtn}
              >
                <Text style={styles.guestText}>🚀 Tiếp tục với tư cách Khách / Tra cứu</Text>
              </Pressable>
            ) : null}

            {onSwitchToRegister ? (
              <Pressable
                accessibilityLabel="Đăng ký tài khoản mới"
                accessibilityRole="button"
                onPress={onSwitchToRegister}
                style={styles.registerBtn}
              >
                <Text style={styles.registerPrompt}>
                  Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký ngay</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Account Bottom Sheet Menu Mock */}
      <Modal visible={showAccountMenu} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAccountMenu(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Quản lý tài khoản</Text>
            <Pressable style={styles.menuItem}>
              <Text style={styles.menuItemText}>Đổi tài khoản</Text>
            </Pressable>
            <Pressable 
              style={styles.menuItem} 
              onPress={() => {
                setShowAccountMenu(false);
                setShowLogoutModal(true);
              }}
            >
              <Text style={[styles.menuItemText, { color: colors.danger.border }]}>Đăng xuất</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.processingModal}>
            <Text style={styles.processingModalIcon}>⚠️</Text>
            <Text style={styles.processingModalTitle}>Xác nhận đăng xuất</Text>
            <Text style={styles.processingModalDesc}>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?</Text>
            <View style={styles.modalActionRow}>
              <Pressable 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Hủy</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, styles.modalBtnConfirm]} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalBtnConfirmText}>Đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: leopardPalette.bgMuted,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerArea: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  illustrationCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: leopardPalette.primaryBg,
    borderRadius: leopardRadius.xl,
    padding: spacing.md,
    width: 140,
    height: 100,
    position: 'relative',
    ...leopardElevation.subtle,
  },
  heroEmoji: {
    fontSize: 38,
  },
  speechBubble: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: leopardPalette.accentYellow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: leopardRadius.pill,
  },
  speechText: {
    color: leopardPalette.textSlateDark,
    fontSize: 9.5,
    fontWeight: '800',
  },
  welcomeTitle: {
    ...typography.pageTitle,
    color: leopardPalette.textSlateDark,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  welcomeSubtitle: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  formCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...leopardElevation.subtle,
  },
  errorBox: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    borderRadius: leopardRadius.sm,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger.text,
    fontSize: 12.5,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: leopardPalette.textSlateDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: leopardPalette.bgMuted,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
  eyeToggle: {
    padding: spacing.xs,
  },
  eyeIcon: {
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: leopardPalette.textMutedSlate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: leopardPalette.primary,
    borderColor: leopardPalette.primary,
  },
  checkmark: {
    color: colors.brand.text,
    fontSize: 11,
    fontWeight: '800',
  },
  rememberText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    fontWeight: '600',
  },
  forgotBtn: {
    paddingVertical: 4,
  },
  forgotText: {
    color: leopardPalette.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: leopardPalette.primaryDark,
    borderRadius: leopardRadius.pill,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...leopardElevation.subtle,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    color: colors.brand.text,
    fontSize: 15,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xxs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: leopardPalette.cardBorder,
  },
  dividerLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  demoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  demoCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: leopardRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  demoCardIcon: {
    fontSize: 20,
  },
  demoCardText: {
    fontSize: 11,
    fontWeight: '700',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1.5,
    borderRadius: leopardRadius.pill,
    minHeight: 48,
    gap: spacing.sm,
  },
  googleIcon: {
    color: '#EA4335',
    fontSize: 16,
    fontWeight: '900',
  },
  googleBtnText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  bottomLinks: {
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  guestBtn: {
    paddingVertical: spacing.xs,
  },
  guestText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    fontWeight: '700',
  },
  registerBtn: {
    paddingVertical: spacing.xxs,
  },
  registerPrompt: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
  },
  registerHighlight: {
    color: leopardPalette.primary,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderTopLeftRadius: leopardRadius.xl,
    borderTopRightRadius: leopardRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: leopardPalette.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: leopardPalette.subtleDivider,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: leopardPalette.textSlateDark,
    textAlign: 'center',
  },
  processingModal: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: leopardRadius.lg,
    padding: spacing.xl,
    margin: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...leopardElevation.modal,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  processingModalIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  processingModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: leopardPalette.textSlateDark,
  },
  processingModalDesc: {
    fontSize: 14,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: leopardRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: leopardPalette.bgMuted,
  },
  modalBtnCancelText: {
    color: leopardPalette.textSlateDark,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: colors.danger.border,
  },
  modalBtnConfirmText: {
    color: colors.brand.text,
    fontWeight: '600',
  },
});
