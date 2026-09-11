import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors, leopardPalette, radius, spacing, Button, ScreenScaffold, IconCamera, IconIdCard, IconSecurityShield, IconSupport247, IconUser } from '@leopard/mobile-core';

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
    onSave({ name: trimmedName, email: email.trim() });
  };

  async function handlePickImage() {
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* Avatar Studio (Double-Bezel) */}
        <View style={styles.doubleBezelOuter}>
          <View style={styles.avatarCardInner}>
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
              <View style={styles.cameraIconPill}>
                <IconCamera color="#FFFFFF" size={15} />
              </View>
            </View>

            <View style={styles.avatarBtnRow}>
              <Pressable
                accessibilityLabel="Chụp ảnh đại diện"
                accessibilityRole="button"
                onPress={handleTakePhoto}
                style={({ pressed }) => [styles.avatarActionBtn, pressed ? styles.pressed : null]}
              >
                <IconCamera color={colors.brand.background} size={15} />
                <Text style={styles.avatarActionBtnText}>Chụp ảnh</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Đổi ảnh đại diện"
                accessibilityRole="button"
                onPress={handlePickImage}
                style={({ pressed }) => [styles.avatarActionBtn, pressed ? styles.pressed : null]}
              >
                <IconIdCard color={colors.brand.background} size={15} />
                <Text style={styles.avatarActionBtnText}>Đổi ảnh đại diện</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Information Form Card (Double-Bezel) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>THÔNG TIN CÁ NHÂN</Text>
          <View style={styles.doubleBezelOuter}>
            <View style={styles.cardInner}>
              {/* Name Field */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <IconUser color={colors.brand.background} size={18} />
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
                    placeholderTextColor={leopardPalette.textSubtle}
                    style={styles.textInput}
                    value={name}
                  />
                </View>
              </View>
              {nameError && <Text style={styles.errorTextRow}>{nameError}</Text>}

              <View style={styles.rowDivider} />

              {/* Email Field */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <IconSupport247 color={colors.brand.background} size={18} />
                </View>
                <View style={styles.fieldInputCol}>
                  <Text style={styles.fieldLabel}>Địa chỉ Email</Text>
                  <TextInput
                    accessibilityLabel="Email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="Nhập email nhận hóa đơn"
                    placeholderTextColor={leopardPalette.textSubtle}
                    style={styles.textInput}
                    value={email}
                  />
                </View>
              </View>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>

        {/* Security / Trust Notice */}
        <View style={styles.securityNoticeCard}>
          <IconSecurityShield color="#059669" size={16} />
          <Text style={styles.securityNoticeText}>
            Thông tin của bạn được bảo mật an toàn theo tiêu chuẩn bảo mật dữ liệu khách hàng LEOPARD.
          </Text>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  footerContainer: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderTopColor: leopardPalette.cardBorder,
    borderTopWidth: 1,
    padding: spacing.md,
  },

  doubleBezelOuter: {
    backgroundColor: 'rgba(11, 30, 66, 0.04)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
  },
  avatarCardInner: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: 18,
    padding: spacing.md,
  },
  cardInner: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    borderColor: colors.brand.background,
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    width: 88,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.border,
    borderRadius: 44,
    borderWidth: 2,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarInitial: {
    color: colors.brand.background,
    fontSize: 32,
    fontWeight: '800',
  },
  cameraIconPill: {
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    bottom: 0,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 28,
  },
  avatarBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  avatarActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 9,
  },
  avatarActionBtnText: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Form Section
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldInputCol: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '600',
  },
  textInput: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '700',
    padding: 0,
  },
  rowDivider: {
    backgroundColor: leopardPalette.subtleDivider,
    height: 1,
    marginLeft: 62,
  },
  errorTextRow: {
    color: '#DC2626',
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 62,
    marginTop: -6,
    paddingBottom: 8,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Notice
  securityNoticeCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    padding: 12,
  },
  securityNoticeText: {
    color: '#065F46',
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
});

