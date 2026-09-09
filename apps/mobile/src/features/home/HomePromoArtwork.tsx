import { StyleSheet, Text, View } from 'react-native';
import { IconLocationPin, IconVehicleLightTruck, IconOrders } from '@leopard/mobile-core';

export type HomePromoSlide = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  action: string;
  kind: 'vehicle' | 'address' | 'tracking';
}>;

/** Live text and a small vector illustration stay readable at mobile widths. */
export function HomePromoArtwork({ slide }: Readonly<{ slide: HomePromoSlide }>) {
  const Icon = slide.kind === 'vehicle' ? IconVehicleLightTruck
    : slide.kind === 'address' ? IconLocationPin : IconOrders;
  return (
    <View style={[styles.banner, slide.kind === 'address' && styles.warm, slide.kind === 'tracking' && styles.cool]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.action}>{slide.action} →</Text>
      </View>
      <View accessible={false} style={styles.illustration}>
        <Icon color="#0B1E42" size={48} />
        <View style={styles.rule} />
        <Text style={styles.brand}>LEOPARD</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, backgroundColor: '#EAF1FA' },
  warm: { backgroundColor: '#FFF3E5' },
  cool: { backgroundColor: '#EAF5F1' },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  eyebrow: { color: '#526176', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#0B1E42', fontSize: 19, lineHeight: 24, fontWeight: '800' },
  subtitle: { color: '#475569', fontSize: 12, lineHeight: 18 },
  action: { color: '#0B1E42', fontSize: 12, fontWeight: '700', marginTop: 4 },
  illustration: { width: 64, alignItems: 'center', gap: 10 },
  rule: { height: 2, width: 42, backgroundColor: '#D97706' },
  brand: { fontSize: 8, letterSpacing: 1, color: '#526176', fontWeight: '700' },
});
