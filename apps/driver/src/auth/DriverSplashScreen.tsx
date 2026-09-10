import { ActivityIndicator, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

const driverHeroBg = require('../../assets/brand/driver-hero-bg.jpg');
const leopardEmblem = require('../../assets/brand/leopard-emblem.png');

export function DriverSplashScreen() {
  return (
    <View style={styles.container} testID="driver-splash-screen">
      <ImageBackground
        resizeMode="cover"
        source={driverHeroBg}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.darkOverlay} />
        <View style={styles.vignetteOverlay} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.emblemWrapper}>
          <Image
            accessibilityLabel="LEOPARD Emblem"
            resizeMode="contain"
            source={leopardEmblem}
            style={styles.emblem}
          />
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.brandTitle}>LEOPARD</Text>
          <View style={styles.driverTag}>
            <Text style={styles.driverTagText}>DRIVER PARTNER</Text>
          </View>
          <Text style={styles.tagline}>Chuyên nghiệp • An toàn • Vững vàng tay lái</Text>
        </View>

        <View style={styles.loaderContainer}>
          <ActivityIndicator color="#38BDF8" size="large" />
          <Text style={styles.loadingText}>Đang khởi động hệ thống...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D17',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 13, 23, 0.72)',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 25, 41, 0.45)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblemWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  emblem: {
    width: 80,
    height: 80,
  },
  textGroup: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#F8FAFC',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  driverTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  driverTagText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
