import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  Button,
  IconCamera,
  IconIdCard,
  IconMessage,
  IconSecurityShield,
  IconUser,
  ScreenScaffold,
  colors,
  customerPalette,
  haptic,
  iosContinuousCurve,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

export type EditProfileScreenProps = Readonly<{
  eyebrow?: string;
  initialName: string;
  initialEmail: string;
  avatarUrl: string | null;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (input: { name: string; email: string }) => void;
  onPickAvatar: (file: { uri: string; name: string; type: string }) => void;
  onBack?: () => void;
}>;

export function EditProfileScreen({
  avatarUrl,
  errorMessage,
  eyebrow,
  initialEmail,
  initialName,
  isSaving,
  onBack,
  onPickAvatar,
  onSave,
}: EditProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateAndSave = () => {
    setNameError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Vui lòng nhập họ và tên');
      return;
    }
    haptic.light();
    onSave({ name: trimmedName, email: email.trim() });
  };

  async function handlePickImage() {
    haptic.selection();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onPickAvatar({
          uri: asset.uri,
          name: asset.fileName ?? 'avatar.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  }

  async function handleTakePhoto() {
    haptic.selection();
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền máy ảnh', 'Vui lòng cấp quyền máy ảnh để chụp ảnh đại diện.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onPickAvatar({
          uri: asset.uri,
          name: asset.fileName ?? 'avatar.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chụp ảnh.');
    }
  }

  return (
    <ScreenScaffold
      eyebrow={eyebrow}
      headerTone="plain"
      onBack={onBack}
      stickyFooter={
        <View style={styles.footerContainer}>
          <Button
            disabledLabel="Lưu thay đổi"
            isLoading={isSaving}
            label="Lưu thay đổi"
            loadingLabel="Đang lưu…"
            onPress={validateAndSave}
          />
        </View>
      }
      title="Chỉnh sửa hồ sơ"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollWrap}
        >
          {/* Avatar Hero Section (Apple Profile Style) */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(name || 'K').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityLabel="Đổi ảnh đại diện"
                accessibilityRole="button"
                onPress={handlePickImage}
                style={({ pressed }) => [
                  styles.cameraBadge,
                  pressed && styles.cameraBadgePressed,
                ]}
              >
                <IconCamera color={customerPalette.surfaceWhite} size={15} />
              </Pressable>
            </View>

            {/* Quick Action Pill Buttons */}
            <View style={styles.avatarActionRow}>
              <Pressable
                accessibilityLabel="Chụp ảnh đại diện"
                accessibilityRole="button"
                onPress={handleTakePhoto}
                style={({ pressed }) => [
                  styles.actionPillBtn,
                  pressed && styles.actionPillBtnPressed,
                ]}
              >
                <IconCamera color={customerPalette.primary} size={14} />
                <Text style={styles.actionPillText}>Chụp ảnh</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Đổi ảnh đại diện"
                accessibilityRole="button"
                onPress={handlePickImage}
                style={({ pressed }) => [
                  styles.actionPillBtn,
                  pressed && styles.actionPillBtnPressed,
                ]}
              >
                <IconIdCard color={customerPalette.primary} size={14} />
                <Text style={styles.actionPillText}>Đổi ảnh đại diện</Text>
              </Pressable>
            </View>
          </View>

          {/* Personal Information Group (Apple Inset Grouped Table View) */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeaderTitle}>Thông tin cá nhân</Text>

            <View style={styles.insetCard}>
              {/* Name Field */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconBox}>
                  <IconUser color={customerPalette.primary} size={18} />
                </View>
                <View style={styles.fieldInputCol}>
                  <Text style={styles.fieldLabel}>Họ và tên</Text>
                  <TextInput
                    accessibilityLabel="Họ và tên"
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={(val) => {
                      setName(val);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Nhập họ và tên"
                    placeholderTextColor={customerPalette.textSubtle}
                    style={styles.textInput}
                    value={name}
                  />
                </View>
              </View>

              {nameError ? (
                <View style={styles.errorTextRow}>
                  <Text style={styles.errorText}>{nameError}</Text>
                </View>
              ) : null}

              <View style={styles.rowDivider} />

              {/* Email Field */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconBox}>
                  <IconMessage color={customerPalette.primary} size={18} />
                </View>
                <View style={styles.fieldInputCol}>
                  <Text style={styles.fieldLabel}>Địa chỉ Email</Text>
                  <TextInput
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="Nhập email nhận thông báo và hóa đơn"
                    placeholderTextColor={customerPalette.textSubtle}
                    style={styles.textInput}
                    value={email}
                  />
                </View>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Security & Privacy Trust Footnote (Apple Style) */}
          <View style={styles.trustFootnote}>
            <IconSecurityShield color={colors.success.text} size={15} />
            <Text style={styles.trustFootnoteText}>
              Thông tin của bạn được bảo mật an toàn theo tiêu chuẩn bảo mật dữ liệu khách hàng LEOPARD.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  scrollWrap: {
    backgroundColor: customerPalette.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.xl * 2,
  },

  // Avatar Hero Studio
  avatarSection: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    borderColor: customerPalette.primary,
    borderRadius: 48,
    borderWidth: 2.5,
    height: 96,
    width: 96,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primaryBorder,
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarInitial: {
    color: customerPalette.primary,
    fontSize: 34,
    fontWeight: '700',
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: customerPalette.primary,
    borderColor: customerPalette.surfaceWhite,
    borderRadius: 16,
    borderWidth: 2.5,
    bottom: -2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraBadgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  avatarActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    ...iosContinuousCurve,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionPillBtnPressed: {
    backgroundColor: customerPalette.bgMuted,
    opacity: 0.85,
  },
  actionPillText: {
    color: customerPalette.primary,
    ...typeScale.footnote,
    fontWeight: '600',
  },

  // Form Group (Apple Inset Grouped Table View)
  sectionGroup: {
    gap: spacing.xs,
  },
  sectionHeaderTitle: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption2,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginLeft: spacing.xs,
  },
  insetCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: customerPalette.cardBorder,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  fieldIconBox: {
    alignItems: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldInputCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  fieldLabel: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  textInput: {
    color: customerPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '600',
    padding: 0,
    margin: 0,
  },
  rowDivider: {
    backgroundColor: customerPalette.cardBorder,
    height: 1,
    marginLeft: 58,
  },
  errorTextRow: {
    marginLeft: 58,
    marginTop: -4,
    paddingBottom: 8,
    paddingRight: spacing.md,
  },
  errorText: {
    color: colors.danger.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    marginTop: spacing.xs,
    padding: 10,
  },
  errorBannerText: {
    color: colors.danger.text,
    ...typeScale.footnote,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Privacy / Trust Footnote
  trustFootnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  trustFootnoteText: {
    color: customerPalette.textMutedSlate,
    ...typeScale.caption2,
    lineHeight: 16,
    flex: 1,
  },

  // Sticky Footer
  footerContainer: {
    backgroundColor: customerPalette.surfaceWhite,
    borderTopColor: customerPalette.cardBorder,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.select({ ios: 34, default: spacing.md }),
  },
});
