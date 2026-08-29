import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IndexRoute() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          🐆 LEOPARD Mobile
        </Text>
        <Text style={styles.subtitle}>
          Nền tảng kết nối Logistics & Vận tải thông minh
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.customerButton]}
            onPress={() => router.push('/customer/orders')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>📦</Text>
            <View>
              <Text style={styles.buttonTitle}>Khách Hàng (Customer)</Text>
              <Text style={styles.buttonDesc}>Tạo đơn vận chuyển & Theo dõi lộ trình</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.driverButton]}
            onPress={() => router.push('/driver/orders')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>🚗</Text>
            <View>
              <Text style={styles.buttonTitle}>Tài Xế (Driver)</Text>
              <Text style={styles.buttonDesc}>Bật nhận chuyến & Cập nhật giao hàng</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => router.push('/(public)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>🔑</Text>
            <View>
              <Text style={styles.buttonTitle}>Đăng Nhập Tài Khoản</Text>
              <Text style={styles.buttonDesc}>Đăng nhập OTP hoặc chế độ Demo</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  customerButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  driverButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  loginButton: {
    backgroundColor: '#fafafa',
    borderColor: '#e5e7eb',
  },
  buttonEmoji: {
    fontSize: 28,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

