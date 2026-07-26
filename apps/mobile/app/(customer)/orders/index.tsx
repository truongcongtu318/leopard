import { StyleSheet, Text, View } from 'react-native';

export default function CustomerOrdersRoute() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Đơn hàng của khách hàng
      </Text>
      <Text>Nội dung đơn hàng chưa được triển khai.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
