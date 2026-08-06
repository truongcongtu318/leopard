import { Slot } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useProtectedLayout } from '../../src/navigation/role-router';

export default function CustomerLayout() {
  const decision = useProtectedLayout('customer');

  if (!decision.canRenderProtectedContent) {
    return (
      <View style={styles.container}>
        <Text accessibilityLiveRegion="polite">Đang kiểm tra phiên và quyền truy cập.</Text>
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
