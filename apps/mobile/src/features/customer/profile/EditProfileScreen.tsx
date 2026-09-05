import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '../../../ui/Button';
import { FormField } from '../../../ui/FormField';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { colors, spacing } from '../../../theme/tokens';

export type EditProfileScreenProps = Readonly<{
  eyebrow?: string;
  initialName: string;
  initialEmail: string;
  avatarUrl: string | null;
  isSaving: boolean;
  errorMessage?: string;
  onSave: (input: { name: string; email: string }) => void;
  onPickAvatar: (file: { uri: string; name: string; type: string }) => void;
}>;

export function EditProfileScreen({
  avatarUrl,
  errorMessage,
  eyebrow = 'CUSTOMER · HỒ SƠ',
  initialEmail,
  initialName,
  isSaving,
  onPickAvatar,
  onSave,
}: EditProfileScreenProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
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
  }

  return (
    <ScreenScaffold
      eyebrow={eyebrow}
      stickyFooter={
        <Button
          isLoading={isSaving}
          label="Lưu thay đổi"
          loadingLabel="Đang lưu…"
          onPress={() => onSave({ name, email })}
        />
      }
      title="Chỉnh sửa hồ sơ"
    >
      <View style={styles.avatarSection}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Pressable accessibilityRole="button" onPress={() => void handlePickImage()}>
          <Text style={styles.changeAvatarText}>Đổi ảnh đại diện</Text>
        </Pressable>
      </View>

      <FormField label="Họ và tên" onChangeText={setName} value={name} />
      <FormField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  avatarSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brand.softBackground,
  },
  changeAvatarText: { color: '#0284C7', fontSize: 13, fontWeight: '700' },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
