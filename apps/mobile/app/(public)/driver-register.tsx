import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandLoginLogo, LeopardEmblem, radius, spacing } from '@leopard/mobile-core';

export default function DriverRegisterGuideRoute() {
  const router = useRouter();

  const handleOpenDriverApp = async () => {
    const url = 'leoparddriver://';
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <LeopardEmblem width={36} />
          <BrandLoginLogo height={30} />
        </View>
        <Text style={styles.badge}>DÀNH CHO TÀI XẾ</Text>
        <Text accessibilityRole="header" style={styles.headline}>
          Ứng dụng LEOPARD Driver độc lập
        </Text>
        <Text style={styles.subline}>
          Trải nghiệm đăng ký hồ sơ đối tác và nhận chuyến đã được chuyển sang ứng dụng riêng LEOPARD Driver. Vui lòng sử dụng ứng dụng tài xế để tiếp tục.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={handleOpenDriverApp}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>Mở ứng dụng LEOPARD Driver</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← Quay lại ứng dụng khách</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CAD9EB',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 12,
    shadowColor: 'rgba(15, 23, 42, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: radius.pill,
    borderWidth: 1,
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headline: {
    color: '#0B1F3A',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subline: {
    color: '#5B6B80',
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: '#1E5BB8',
    borderRadius: radius.pill,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 4,
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#5B6B80',
    fontSize: 13.5,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
