import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  FeDropShadow,
  Filter,
  Image as SvgImage,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { BrandLoginLogo, IconChevronLeft, LeopardEmblem } from '../ui/icons/CoreIcons';

const HERO_HEIGHT = 380;
const VIEW_W = 375;
const VIEW_H = 380;
const WAVE_PATH = 'M0 364 C42 308 76 266 124 266 C184 266 234 300 292 300 C335 300 362 270 375 224 V0 H0 Z';
const truckBackground = require('../../assets/brand/auth-truck-background.jpg');

export interface AuthHeroHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTestID?: string;
}

/**
 * Shared auth header with a rising left edge, crest at 33%, and trough at 78%.
 * The wave shape is a static SVG path — it does not need to track the
 * device width because `preserveAspectRatio="none"` stretches it to fill.
 */
export function AuthHeroHeader({ title, subtitle, onBack, backTestID }: AuthHeroHeaderProps) {
  const { width, fontScale } = useWindowDimensions();
  const heroHeight = HERO_HEIGHT + Math.max(0, fontScale - 1) * 160;
  // Keep the 736 × 1104 photo undistorted after the SVG stretches to the header.
  // Its truck sits at 53% of the source height; align that point above the wave.
  const photoHeight = Math.min(width, 520) * (1104 / 736) * (VIEW_H / heroHeight);
  const photoY = 160 - photoHeight * 0.53;

  return (
    <View style={[styles.wrap, { height: heroHeight }]}>
      <Svg
        {...(Platform.OS === 'web'
          ? { 'aria-hidden': true, focusable: false }
          : { accessible: false })}
        height={heroHeight}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
      >
        <Defs>
          <ClipPath id="authHeroPhotoClip">
            <Path d={WAVE_PATH} />
          </ClipPath>
          <LinearGradient
            gradientUnits="userSpaceOnUse"
            id="authHeroGrad"
            x1="187.5"
            x2="187.5"
            y1="0"
            y2="310"
          >
            <Stop offset="0%" stopColor="#E64A19" />
            <Stop offset="48%" stopColor="#F97808" />
            <Stop offset="85%" stopColor="#FFA726" />
            <Stop offset="100%" stopColor="#FFB74D" />
          </LinearGradient>
          <Filter
            filterUnits="userSpaceOnUse"
            height="420"
            id="waveShadow"
            width="415"
            x="-20"
            y="0"
          >
            <FeDropShadow dx="0" dy="10" floodColor="#111827" floodOpacity="0.28" stdDeviation="6" />
            <FeDropShadow dx="0" dy="4" floodColor="#111827" floodOpacity="0.18" stdDeviation="2" />
          </Filter>
        </Defs>
        <Path
          d={WAVE_PATH}
          fill="url(#authHeroGrad)"
          filter="url(#waveShadow)"
        />
        <SvgImage
          clipPath="url(#authHeroPhotoClip)"
          height={photoHeight}
          href={truckBackground}
          opacity={0.18}
          preserveAspectRatio="none"
          width={VIEW_W}
          x={0}
          y={photoY}
        />
      </Svg>

      <View style={styles.content}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onBack}
            style={styles.backBtn}
            testID={backTestID ?? 'auth-hero-back-btn'}
          >
            <IconChevronLeft color="#FFFFFF" size={20} />
          </Pressable>
        ) : null}

        <View style={styles.brandBadge}>
          <LeopardEmblem testID="auth-hero-emblem" width={46} />
          <BrandLoginLogo height={26} testID="auth-hero-logo" />
        </View>

        <Text style={[styles.title, width < 380 && styles.compactTitle]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    height: HERO_HEIGHT,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 100 : 94,
    gap: 6,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 14 : 18,
    left: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 14,
    shadowColor: '#7C2D12',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    alignSelf: 'center',
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(154, 52, 18, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  compactTitle: {
    fontSize: 29,
    letterSpacing: 0,
  },
  subtitle: {
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.96)',
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 2,
    maxWidth: '92%',
    textAlign: 'center',
    lineHeight: 19,
  },
});
