import { StyleSheet, Text, View } from 'react-native';

export default function IndexRoute() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        LEOPARD Pilot
      </Text>
      <Text>Ứng dụng vận hành đang được khởi tạo.</Text>
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
