import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { sessionStore, TruckLoader } from '@leopard/mobile-core';

export default function DriverIndex() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void (async () => {
      await sessionStore.hydrate();
      if (!active) return;
      const token = sessionStore.getAccessToken();
      const role = sessionStore.getRole();
      if (token && role === 'DRIVER') {
        router.replace('/orders');
      } else {
        router.replace('/(public)/login');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <TruckLoader size="md" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F9',
  },
});
