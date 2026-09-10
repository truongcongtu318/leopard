import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { HomeServiceIllustration } from './HomeServiceIllustrations';

export type HomePromoSlide = Readonly<{
  id: string; title: string; subtitle: string; eyebrow: string; action: string;
  kind: 'vehicle' | 'address' | 'tracking';
}>;

function JourneyArtwork({ tracking }: Readonly<{ tracking: boolean }>) {
  return (
    <Svg width="100%" height={112} viewBox="0 0 160 130" {...(Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false })}>
      <Rect x="12" y="10" width="136" height="110" rx="18" fill={tracking ? '#D3EBE4' : '#FBE0B8'} />
      <Path d="M22 42H138M22 84H138M52 20V110M108 20V110" stroke={tracking ? '#B4D8CB' : '#EDC997'} strokeWidth="8" />
      <Path d="M44 40V86Q44 98 56 98H100Q116 98 116 82V51" fill="none" stroke="#17395A" strokeWidth="3" strokeDasharray="5 5" />
      <Circle cx="44" cy="40" r="12" fill="#FFFFFF" /><Circle cx="44" cy="40" r="6" fill="#087F68" />
      <Path d="M116 25C94 25 93 48 116 67C139 48 138 25 116 25Z" fill="#EB7B23" />
      <Circle cx="116" cy="40" r="6" fill="#FFF7E8" />
      {tracking ? <><Circle cx="79" cy="97" r="13" fill="#0B2347" /><Path d="m73 97 4 4 8-9" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" /></> : <><Rect x="56" y="59" width="35" height="26" rx="4" fill="#FFFFFF" /><Path d="M64 68H82M64 75H75" stroke="#7390A8" strokeWidth="3" strokeLinecap="round" /></>}
    </Svg>
  );
}

/** Native text and original vector scenes stay sharp at every screen size. */
export function HomePromoArtwork({ slide }: Readonly<{ slide: HomePromoSlide }>) {
  const vehicle = slide.kind === 'vehicle';
  const tracking = slide.kind === 'tracking';
  return (
    <View style={[styles.banner, vehicle ? styles.navy : tracking ? styles.mint : styles.sand]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, vehicle && styles.eyebrowLight]}>{slide.eyebrow}</Text>
        <Text style={[styles.title, vehicle && styles.white]}>{slide.title}</Text>
        <Text style={[styles.subtitle, vehicle && styles.subtitleLight]}>{slide.subtitle}</Text>
        <View style={[styles.actionChip, vehicle && styles.actionWarm]}>
          <Text style={styles.action}>{slide.action} →</Text>
        </View>
      </View>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.illustration}>
        {vehicle ? <HomeServiceIllustration kind="light" height={112} /> : <JourneyArtwork tracking={tracking} />}
        <Text style={[styles.brand, vehicle && styles.subtitleLight]}>LEOPARD</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18, gap: 10 },
  navy: { backgroundColor: '#0B2347' }, sand: { backgroundColor: '#FFF0DB' }, mint: { backgroundColor: '#E5F3ED' },
  copy: { flex: 1, minWidth: 0, gap: 7 },
  eyebrow: { color: '#526176', fontSize: 9, lineHeight: 13, fontWeight: '700', letterSpacing: 0.8 },
  eyebrowLight: { color: '#FFD18A' },
  title: { color: '#0B2347', fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.4 },
  white: { color: '#FFFFFF' }, subtitle: { color: '#465C70', fontSize: 12, lineHeight: 18 },
  subtitleLight: { color: '#CEDCEF' },
  actionChip: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginTop: 3 },
  actionWarm: { backgroundColor: '#FFBF65' }, action: { color: '#0B2347', fontSize: 11, fontWeight: '800' },
  illustration: { width: '32%', maxWidth: 160, alignItems: 'center', gap: 10 },
  brand: { color: '#526176', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
});
