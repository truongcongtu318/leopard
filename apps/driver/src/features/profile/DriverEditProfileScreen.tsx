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

import {
  Button,
  IconCamera,
  IconCheck,
  IconIdCard,
  IconMessage,
  IconPhone,
  IconSecurityShield,
  IconSpeedTruck,
  IconUser,
  ScreenScaffold,
  colors,
  driverPrimitives,
  iconSize,
  iosContinuousCurve,
} from '@leopard/mobile-core';
import { formatPhoneNumber } from './ProfileScreen';

export type DriverEditProfileScreenProps = Readonly<{
  initialName: string;
  initialEmail: string;
  phone?: string | null;
  vehicleLabel?: string | null;
  avatarUrl: string | null;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (input: { name: string; email: string }) => void;
  onPickAvatar: (file: { uri: string; name: string; type: string }) => void;
  onBack?: () => void;
}>;

export function DriverEditProfileScreen({
  avatarUrl,
  errorMessage,
  initialEmail,
  initialName,
  isSaving,
  onBack,
  onPickAvatar,
  onSave,
  phone = null,
  vehicleLabel = null,
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

  const displayPhone = phone ? (formatPhoneNumber(phone) || phone) : '—';
  const displayVehicle = vehicleLabel ? vehicleLabel : '—';

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      stickyFooter={
        <Button
          disabledLabel="Lưu thông tin hồ sơ"
          isLoading={isSaving}
          label="Lưu thông tin hồ sơ"
          loadingLabel="Đang lưu thay đổi…"
          onPress={handleSave}
        />
      }
      title="Chỉnh sửa hồ sơ"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollWrap}
      >
        {/* ── 1. Avatar Studio Hero ── */}
        <View style={styles.avatarHeroContainer}>
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : name.trim() ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconUser color={colors.neutral.surface} size={38} />
              </View>
            )}

            <Pressable
              accessibilityLabel="Chụp hoặc đổi ảnh đại diện"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleTakePhoto}
              style={styles.cameraBadgePill}
            >
              <IconCamera color={colors.neutral.surface} size={13} />
            </Pressable>
          </View>

          {/* Action Buttons */}
          <View style={styles.avatarActionRow}>
            <Pressable
              accessibilityLabel="Chụp ảnh mới"
              accessibilityRole="button"
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.avatarActionPill, pressed ? styles.pressed : null]}
            >
              <IconCamera color={driverPrimitives.colors.gray700} size={15} />
              <Text style={styles.avatarActionText}>Chụp ảnh mới</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Chọn từ thư viện"
              accessibilityRole="button"
              onPress={handlePickFromLibrary}
              style={({ pressed }) => [styles.avatarActionPill, pressed ? styles.pressed : null]}
            >
              <IconIdCard color={driverPrimitives.colors.gray700} size={15} />
              <Text style={styles.avatarActionText}>Chọn từ thư viện</Text>
            </Pressable>
          </View>

          {/* Guideline Card */}
          <View style={styles.guidelineCard}>
            <View style={styles.guidelineHeader}>
              <IconSecurityShield color={driverPrimitives.colors.green600} size={14} />
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

        {/* ── 2. Editable Form Section (Apple Inset Grouped) ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>THÔNG TIN LIÊN HỆ & HIỂN THỊ</Text>
          <View style={styles.card}>
            {/* Field: Full Name */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <IconUser color={driverPrimitives.colors.gray400} size={18} />
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
                  placeholderTextColor={driverPrimitives.colors.gray400}
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
                <IconMessage color={driverPrimitives.colors.gray400} size={18} />
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
                  placeholderTextColor={driverPrimitives.colors.gray400}
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

        {/* ── 3. Protected Read-Only Identity Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>THÔNG TIN ĐỊNH DANH (CHỈ ĐỌC)</Text>
          <View style={styles.card}>
            {/* Phone */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconPhone color={driverPrimitives.colors.gray400} size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Số điện thoại đăng ký</Text>
                <Text style={styles.readonlyValue}>{displayPhone}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <IconCheck color={driverPrimitives.colors.green600} size={iconSize.xs} />
                <Text style={styles.verifiedBadgeText}>Xác thực OTP</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Vehicle */}
            <View style={styles.readonlyRow}>
              <View style={styles.fieldIconWrap}>
                <IconSpeedTruck color={driverPrimitives.colors.gray400} size={18} />
              </View>
              <View style={styles.readonlyTextCol}>
                <Text style={styles.readonlyLabel}>Phương tiện phân công</Text>
                <Text style={styles.readonlyValue}>{displayVehicle}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    backgroundColor: colors.neutral.canvas,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 0,
    paddingVertical: 12,
    paddingBottom: 48,
  },

  /* Avatar Studio Hero */
  avatarHeroContainer: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    borderColor: driverPrimitives.colors.white,
    borderRadius: 48,
    borderWidth: 3,
    height: 96,
    width: 96,
    ...driverPrimitives.shadows.md,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: driverPrimitives.colors.white,
    borderRadius: 48,
    borderWidth: 3,
    height: 96,
    justifyContent: 'center',
    width: 96,
    ...driverPrimitives.shadows.md,
  },
  avatarInitial: {
    color: colors.neutral.surface,
    fontSize: 36,
    fontWeight: '700',
  },
  cameraBadgePill: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.blue600,
    borderColor: driverPrimitives.colors.white,
    borderRadius: 14,
    borderWidth: 2,
    bottom: 0,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 28,
    ...driverPrimitives.shadows.sm,
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  avatarActionPill: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 9999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    justifyContent: 'center',
    ...driverPrimitives.shadows.sm,
  },
  avatarActionText: {
    color: driverPrimitives.colors.gray700,
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* Guideline Box */
  guidelineCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderRadius: 14,
    ...iosContinuousCurve,
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
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  guidelineText: {
    color: '#166534',
    fontSize: 11,
    lineHeight: 16,
  },

  /* Form Sections */
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: colors.neutral.border,
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
    ...driverPrimitives.shadows.sm,
  },

  /* Field Rows */
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldIconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  fieldInputCol: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '600',
  },
  textInput: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14.5,
    fontWeight: '600',
    padding: 0,
  },
  rowDivider: {
    backgroundColor: driverPrimitives.colors.gray100,
    height: 1,
    marginLeft: 52,
  },
  errorTextRow: {
    color: driverPrimitives.colors.red500,
    fontSize: 11.5,
    fontWeight: '500',
    marginLeft: 52,
    paddingBottom: 8,
  },

  /* Readonly Rows */
  readonlyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  readonlyTextCol: {
    flex: 1,
    gap: 2,
  },
  readonlyLabel: {
    color: driverPrimitives.colors.gray500,
    fontSize: 11.5,
    fontWeight: '600',
  },
  readonlyValue: {
    color: driverPrimitives.colors.gray900,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  verifiedBadge: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedBadgeText: {
    color: driverPrimitives.colors.green700,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Error Banner */
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    padding: 10,
  },
  errorBannerText: {
    color: driverPrimitives.colors.red600,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
