import { StyleSheet, Text, View } from 'react-native';

export default function LoginRoute() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Đăng nhập
      </Text>
      <Text>Xác thực chưa được triển khai trong giai đoạn này.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
