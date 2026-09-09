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

import { colors, leopardPalette, radius, spacing } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import {
  IconCamera,
  IconClock,
  IconIdCard,
  IconPhone,
  IconSecurityShield,
  IconSpeedTruck,
  IconSupport247,
  IconUser,
  IconWarningShield,
} from '../../../ui/icons/CoreIcons';

export type DriverEditProfileScreenProps = Readonly<{
  initialName: string;
  initialEmail: string;
  phone?: string;
  vehicleLabel?: string | null;
  fleetLabel?: string | null;
  driverCode?: string;
  avatarUrl: string | null;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (input: { name: string; email: string }) => void;
  onPickAvatar: (file: { uri: string; name: string; type: string }) => void;
  onBack?: () => void;
}>;

export function DriverEditProfileScreen({
  avatarUrl,
  driverCode = 'DRV-88924',
  errorMessage,
  fleetLabel = 'Fleet Tân Bình (Pilot)',
  initialEmail,
  initialName,
  isSaving,
  onBack,
  onPickAvatar,
  onSave,
  phone = '0987 *** 892',
  vehicleLabel = '51C-889.24 · Xe tải 2.5T',
}: DriverEditProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validate = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Vui lòng nhập họ và tên tài xế');
      isValid = false;
    } else if (trimmedName.length < 2) {
      setNameError('Họ và tên tối thiểu 2 ký tự');
      isValid = false;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Định dạng email không hợp lệ');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ name: name.trim(), email: email.trim() });
  };

  const handlePickFromLibrary = async () => {
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
          name: asset.fileName ?? 'driver-avatar.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Quyền máy ảnh',
          'Vui lòng cấp quyền máy ảnh trong Cài đặt để chụp ảnh đại diện.',
        );
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
          name: asset.fileName ?? 'driver-photo.jpg',
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động máy ảnh.');
    }
  };

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      stickyFooter={
        <View style={styles.footerContainer}>
          <Button
            disabledLabel="Lưu thông tin hồ sơ"
            isLoading={isSaving}
            label="Lưu thông tin hồ sơ"
            loadingLabel="Đang lưu thay đổi…"
            onPress={handleSave}
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
        {/* 1. Avatar Studio Section */}
        <View style={styles.avatarStudioCard}>
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(name || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconPill}>
              <IconCamera color="#FFFFFF" size={16} />
            </View>
          </View>

          <View style={styles.avatarActionRow}>
            <Pressable
              accessibilityLabel="Chụp ảnh chân dung"
              accessibilityRole="button"
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.avatarActionBtn, pressed ? styles.pressed : null]}
            >
              <IconCamera color={colors.brand.background} size={15} />
              <Text style={styles.avatarActionBtnText}>Chụp ảnh mới</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Chọn ảnh từ thư viện"
              accessibilityRole="button"
              onPress={handlePickFromLibrary}
              style={({ pressed }) => [styles.avatarActionBtn, pressed ? styles.pressed : null]}
            >
              <IconIdCard color={colors.brand.background} size={15} />
              <Text style={styles.avatarActionBtnText}>Chọn từ thư viện</Text>
            </Pressable>
          </View>

          {/* Avatar Guideline Box */}
          <View style={styles.guidelineCard}>
            <View style={styles.guidelineHeader}>
              <IconSecurityShield color="#059669" size={15} />
              <Text style={styles.guidelineTitle}>Tiêu chuẩn ảnh nhận diện đối tác</Text>
            </View>
            <Text style={styles.guidelineText}>
              • Chụp rõ khuôn mặt, nhìn thẳng, không đeo kính râm hoặc khẩu trang.
            </Text>
            <Text style={styles.guidelineText}>
              • Trang phục lịch sự hoặc áo đồng phục đối tác LEOPARD Logistics.
            </Text>
            <Text style={styles.guidelineText}>
              • Ảnh chân dung sắc nét giúp khách hàng yên tâm bàn giao hàng hóa.
            </Text>
          </View>
        </View>

        {/* 2. Editable Information Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>THÔNG TIN LIÊN HỆ & HIỂN THỊ</Text>
          <View style={styles.card}>
            {/* Field: Full Name */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <IconUser color={colors.brand.background} size={18} />
              </View>
              <View style={styles.fieldInputCol}>
                <Text style={styles.fieldLabel}>Họ và tên tài xế</Text>
                <TextInput
                  accessibilityLabel="Nhập họ và tên tài xế"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onChangeText={(val) => {
                    setName(val);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Nhập họ và tên đầy đủ"
                  placeholderTextColor={leopardPalette.textSubtle}
                  style={styles.textInput}
                  value={name}
                />
              </View>
            </View>
            {nameError && <Text style={styles.errorTextRow}>{nameError}</Text>}

            <View style={styles.rowDivider} />

            {/* Field: Email */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <IconSupport247 color={colors.brand.background} size={18} />
              </View>
              <View style={styles.fieldInputCol}>
                <Text style={styles.fieldLabel}>Địa chỉ Email</Text>
                <TextInput
                  accessibilityLabel="Nhập địa chỉ email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={(val) => {
                    setEmail(val);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="email@example.com (nhận sao kê & hóa đơn)"
                  placeholderTextColor={leopardPalette.textSubtle}
                  style={styles.textInput}
                  value={email}
                />
              </View>
            </View>
            {emailError && <Text style={styles.errorTextRow}>{emailError}</Text>}
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>

        {/* 3. Protected Identity Section (Read-Only) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ĐỊNH DANH BUỒNG LÁI & ĐỘI XE (FLEET)</Text>
          <View style={styles.card}>
            {/* Registered Phone */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconPhone color="#64748B" size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Số điện thoại đăng ký</Text>
                <Text style={styles.readonlyValue}>{phone}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Xác thực OTP</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Driver Code */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconIdCard color="#64748B" size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Mã số tài xế đối tác</Text>
                <Text style={styles.readonlyValue}>{driverCode}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Assigned Vehicle */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconSpeedTruck color="#64748B" size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Phương tiện phân công</Text>
                <Text style={styles.readonlyValue}>{vehicleLabel}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Fleet Name */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconClock color="#64748B" size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Đội xe chủ quản</Text>
                <Text style={styles.readonlyValue}>{fleetLabel}</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* KYC Status */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconSecurityShield color="#059669" size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Hồ sơ pháp lý vận tải</Text>
                <Text style={styles.readonlyValue}>4/4 Giấy tờ kiểm duyệt</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Đã duyệt</Text>
              </View>
            </View>
          </View>

          {/* Security Notice Box */}
          <View style={styles.securityNoticeCard}>
            <IconWarningShield color="#D97706" size={18} />
            <Text style={styles.securityNoticeText}>
              Các thông tin định danh (SĐT, biển số xe, đội xe) được khóa để đảm bảo an toàn pháp
              lý vận tải. Để cập nhật, vui lòng liên hệ quản lý Fleet hoặc Hotline 1900-LEOPARD.
            </Text>
          </View>
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

  // Avatar Studio Card
  avatarStudioCard: {
    alignItems: 'center',
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  avatarWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  avatarImage: {
    borderColor: '#F59E0B',
    borderRadius: 48,
    borderWidth: 2.5,
    height: 96,
    width: 96,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#F59E0B',
    borderRadius: 48,
    borderWidth: 2.5,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  avatarInitial: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '800',
  },
  cameraIconPill: {
    alignItems: 'center',
    backgroundColor: colors.brand.background,
    borderColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 2,
    bottom: 0,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 30,
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 14,
    width: '100%',
  },
  avatarActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderColor: colors.brand.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  avatarActionBtnText: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Guideline Card
  guidelineCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    padding: 12,
    width: '100%',
  },
  guidelineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  guidelineTitle: {
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '700',
  },
  guidelineText: {
    color: '#047857',
    fontSize: 11.5,
    lineHeight: 16,
  },

  // Sections & Form Cards
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

  // Read-only Rows
  readonlyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyTextCol: {
    flex: 1,
    gap: 2,
  },
  readonlyLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11.5,
    fontWeight: '600',
  },
  readonlyValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },

  // Security Notice Box
  securityNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    padding: 12,
  },
  securityNoticeText: {
    color: '#92400E',
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
});
