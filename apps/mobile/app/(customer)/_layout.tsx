import { Slot, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useProtectedLayout } from '../../src/navigation/role-router';

export default function CustomerLayout() {
  const decision = useProtectedLayout('customer');
  const router = useRouter();
  const redirectTo = decision.kind === 'denied' ? decision.redirectTo : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (decision.kind === 'loading') {
    return (
      <View style={styles.container}>
        <Text accessibilityLiveRegion="polite">Đang kiểm tra phiên và quyền truy cập.</Text>
      </View>
    );
  }

  if (decision.kind === 'denied') return null;

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
