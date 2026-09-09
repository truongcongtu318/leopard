import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandSplashScreen } from '../src/features/splash/BrandSplashScreen';
import { useRootSessionRouter } from '../src/navigation/role-router';
import { colors, leopardPalette } from '../src/theme/tokens';

export default function IndexRoute() {
  const { isHydrated, redirectTo } = useRootSessionRouter();
  const router = useRouter();
  const [isSplashDone, setIsSplashDone] = useState(false);

  useEffect(() => {
    if (isSplashDone && isHydrated && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isSplashDone, isHydrated, redirectTo, router]);

  const handleSplashFinish = () => {
    setIsSplashDone(true);
  };

  return (
    <View style={styles.container}>
      <BrandSplashScreen onFinish={handleSplashFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: leopardPalette.primary,
  },
});
