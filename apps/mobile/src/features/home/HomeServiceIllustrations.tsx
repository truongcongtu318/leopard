import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

export type HomeServiceKind = '3wheel' | 'light' | 'heavy' | 'express' | 'loading' | 'cod';

const BACKGROUNDS: Record<HomeServiceKind, readonly [string, string]> = {
  '3wheel': ['#EEF6FF', '#DCEBFC'],
  light: ['#EFFAFF', '#D5F0FB'],
  heavy: ['#EEF1FA', '#DCE3F4'],
  express: ['#FFFBEB', '#FDECC0'],
  loading: ['#FFF4EC', '#FCE1CE'],
  cod: ['#EEFAF4', '#D6F1E3'],
};

/** Native vector artwork adapted from the prototype's six service illustrations. */
export function HomeServiceIllustration({ kind, height = 90 }: Readonly<{ kind: HomeServiceKind; height?: number }>) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const backgroundId = 'home-service-background-' + instanceId;
  const motionId = 'home-service-motion-' + instanceId;
  const colors = BACKGROUNDS[kind];
  const accessibilityProps = Platform.OS === 'web'
    ? { 'aria-hidden': true as const }
    : { accessible: false };

  return (
    <Svg width="100%" height={height} viewBox="0 0 160 100" fill="none" {...accessibilityProps}>
      <Defs>
        <LinearGradient id={backgroundId} x1="0" y1="0" x2="160" y2="100" gradientUnits="userSpaceOnUse">
          <Stop stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
        <LinearGradient id={motionId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop stopColor="#F59E0B" stopOpacity="0" />
          <Stop offset="1" stopColor="#F59E0B" />
        </LinearGradient>
      </Defs>
      <Rect width="160" height="100" rx="14" fill={`url(#${backgroundId})`} />
      {kind === '3wheel' && <ThreeWheel />}
      {kind === 'light' && <LightTruck />}
      {kind === 'heavy' && <HeavyTruck />}
      {kind === 'express' && <ExpressTruck motionId={motionId} />}
      {kind === 'loading' && <Loading />}
      {kind === 'cod' && <CashOnDelivery />}
    </Svg>
  );
}

function ThreeWheel() {
  return (
    <>
    <Path d="M10 84H150" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="6 4" />
    <Rect x="18" y="24" width="22" height="50" rx="2" fill="#E2E8F0" />
    <Rect x="44" y="32" width="18" height="42" rx="2" fill="#E2E8F0" />
    <Rect x="68" y="44" width="62" height="26" rx="4" fill="#0B192C" />
    <Rect x="72" y="48" width="54" height="4" rx="1" fill="#1E3E62" />
    <Rect x="72" y="56" width="54" height="4" rx="1" fill="#1E3E62" />
    <Rect x="74" y="32" width="24" height="14" rx="2" fill="#D97706" />
    <Rect x="100" y="30" width="26" height="16" rx="2" fill="#B45309" />
    <Line x1="86" y1="32" x2="86" y2="46" stroke="#92400E" strokeWidth="1" />
    <Line x1="113" y1="30" x2="113" y2="46" stroke="#78350F" strokeWidth="1" />
    <Path d="M42 66L52 50H66V70H50Z" fill="#F59E0B" />
    <Path d="M48 50L45 42H52" stroke="#0B192C" strokeWidth="3" strokeLinecap="round" />
    <Circle cx="43" cy="40" r="3" fill="#0B192C" />
    <Circle cx="41" cy="53" r="3" fill="#FEF08A" />
    <Circle cx="48" cy="74" r="10" fill="#1E293B" />
    <Circle cx="48" cy="74" r="5" fill="#94A3B8" />
    <Circle cx="106" cy="74" r="10" fill="#1E293B" />
    <Circle cx="106" cy="74" r="5" fill="#94A3B8" />
    <Rect x="80" y="50" width="24" height="6" rx="2" fill="#F59E0B" />
    </>
  );
}

function LightTruck() {
  return (
    <>
    <Path d="M10 84H150" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="6 4" />
    <Rect x="56" y="30" width="76" height="42" rx="4" fill="#0B192C" />
    <Path d="M60 48H128" stroke="#1E3E62" strokeWidth="1.5" />
    <Rect x="66" y="38" width="38" height="18" rx="3" fill="#1E3E62" />
    <Circle cx="74" cy="47" r="4" fill="#F59E0B" />
    <Rect x="82" y="44" width="16" height="3" rx="1" fill="#F8FAFC" />
    <Rect x="82" y="49" width="10" height="2" rx="1" fill="#F59E0B" />
    <Path d="M28 72H56V38H45L32 52L28 72Z" fill="#F59E0B" />
    <Path d="M35 52L44 42H53V54H33L35 52Z" fill="#38BDF8" fillOpacity="0.4" />
    <Circle cx="28" cy="62" r="3" fill="#FEF08A" />
    <Rect x="25" y="66" width="12" height="4" rx="1" fill="#1E293B" />
    <Circle cx="44" cy="74" r="11" fill="#0F172A" />
    <Circle cx="44" cy="74" r="5" fill="#E2E8F0" />
    <Circle cx="108" cy="74" r="11" fill="#0F172A" />
    <Circle cx="108" cy="74" r="5" fill="#E2E8F0" />
    </>
  );
}

function HeavyTruck() {
  return (
    <>
    <Path d="M10 84H150" stroke="#94A3B8" strokeWidth="2.5" />
    <Rect x="52" y="22" width="86" height="50" rx="4" fill="#1E293B" />
    <Rect x="56" y="26" width="78" height="42" rx="2" fill="#0B192C" />
    <Line x1="66" y1="26" x2="66" y2="68" stroke="#1E3E62" strokeWidth="1.5" />
    <Line x1="78" y1="26" x2="78" y2="68" stroke="#1E3E62" strokeWidth="1.5" />
    <Line x1="90" y1="26" x2="90" y2="68" stroke="#1E3E62" strokeWidth="1.5" />
    <Line x1="102" y1="26" x2="102" y2="68" stroke="#1E3E62" strokeWidth="1.5" />
    <Line x1="114" y1="26" x2="114" y2="68" stroke="#1E3E62" strokeWidth="1.5" />
    <Path d="M22 72H52V26H38L24 40V72Z" fill="#EA580C" />
    <Path d="M28 42H48V30H38L28 42Z" fill="#BAE6FD" />
    <Rect x="20" y="62" width="6" height="4" rx="1" fill="#FEF08A" />
    <Rect x="22" y="66" width="16" height="5" rx="1" fill="#0F172A" />
    <Circle cx="36" cy="74" r="10" fill="#0F172A" />
    <Circle cx="36" cy="74" r="4" fill="#94A3B8" />
    <Circle cx="94" cy="74" r="10" fill="#0F172A" />
    <Circle cx="94" cy="74" r="4" fill="#94A3B8" />
    <Circle cx="118" cy="74" r="10" fill="#0F172A" />
    <Circle cx="118" cy="74" r="4" fill="#94A3B8" />
    </>
  );
}

function ExpressTruck( { motionId }: Readonly<{ motionId: string }> ) {
  return (
    <>
    <Path d="M6 34H36M12 42H48M4 52H28M10 68H38" stroke={`url(#${motionId})`} strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M12 84H152" stroke="#FDE68A" strokeWidth="2.5" strokeDasharray="6 4" />
    <G transform="skewX(-6) translate(10, 0)">
    <Rect x="52" y="32" width="68" height="38" rx="4" fill="#0B192C" />
    <Path d="M84 40L76 52H84L82 62L92 48H84L86 40H84Z" fill="#F59E0B" />
    <Path d="M28 70H52V38H42L32 50L28 70Z" fill="#F59E0B" />
    <Path d="M34 50L42 42H50V52H32L34 50Z" fill="#E0F2FE" />
    <Circle cx="28" cy="62" r="3" fill="#FEF08A" />
    <Circle cx="44" cy="72" r="10" fill="#0F172A" />
    <Circle cx="44" cy="72" r="4" fill="#F59E0B" />
    <Circle cx="102" cy="72" r="10" fill="#0F172A" />
    <Circle cx="102" cy="72" r="4" fill="#F59E0B" />
    </G>
    </>
  );
}

function Loading() {
  return (
    <>
    <Path d="M10 84H150" stroke="#CBD5E1" strokeWidth="2.5" />
    <Path d="M85 30H140V72H85V30Z" fill="#0B192C" />
    <Rect x="88" y="34" width="48" height="34" rx="2" fill="#1E3E62" />
    <Path d="M78 72L85 58V72H78Z" fill="#94A3B8" />
    <Rect x="92" y="48" width="18" height="18" rx="2" fill="#D97706" />
    <Rect x="114" y="42" width="20" height="24" rx="2" fill="#B45309" />
    <Circle cx="44" cy="34" r="6" fill="#FDBA74" />
    <Path d="M40 32C40 28 48 28 50 31L54 33H40V32Z" fill="#0B192C" />
    <Path d="M38 40H52L54 62H36L38 40Z" fill="#F59E0B" />
    <Path d="M38 62L34 82M50 62L52 82" stroke="#0B192C" strokeWidth="4" strokeLinecap="round" />
    <Rect x="50" y="44" width="20" height="18" rx="2" fill="#D97706" />
    <Line x1="60" y1="44" x2="60" y2="62" stroke="#78350F" strokeWidth="1.5" />
    <Path d="M42 46L52 50L64 54" stroke="#FDBA74" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function CashOnDelivery() {
  return (
    <>
    <Path d="M10 84H150" stroke="#BBF7D0" strokeWidth="2.5" />
    <Rect x="34" y="40" width="34" height="34" rx="4" fill="#D97706" />
    <Rect x="42" y="40" width="18" height="34" fill="#F59E0B" />
    <Line x1="34" y1="57" x2="68" y2="57" stroke="#78350F" strokeWidth="1.5" />
    <Rect x="38" y="46" width="12" height="7" rx="1" fill="#FEF3C7" />
    <Rect x="80" y="32" width="54" height="32" rx="4" fill="#0B192C" />
    <Rect x="84" y="36" width="46" height="24" rx="3" fill="#15803D" />
    <Circle cx="107" cy="48" r="6" fill="#86EFAC" />
    <SvgText x="107" y="52" fill="#14532D" fontSize="10" fontWeight="bold" textAnchor="middle">₫</SvgText>
    <Circle cx="128" cy="24" r="12" fill="#F59E0B" />
    <Path d="M128 17V24L132 27" stroke="#0B192C" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="68" cy="34" r="10" fill="#22C55E" />
    <Path d="M64 34L67 37L73 31" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}
