import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { leopardPalette, radius, spacing, typography } from '../../theme/tokens';
import { LeopardEmblem, LeopardMobileLogo } from '../../ui/icons/CoreIcons';


const truckSource = require('../../../assets/brand/truck.png');

export type OnboardingScreenProps = Readonly<{
  onGetStarted: () => void;
  onDriverRegister?: () => void;
  onExploreGuest?: () => void;
}>;

/** Professional 3D elevated highway palette. */
const scene = {
  canvas: '#EEF3F9',
  mapGround: '#E2EAF4',
  block: '#D5E1F0',
  blockBorder: '#CAD9EB',

  // 3D Elevated Highway layers
  roadCastShadow: 'rgba(15, 23, 42, 0.15)', // ambient ground shadow
  roadOverpassWall: '#627387', // 3D vertical concrete bridge thickness
  roadShoulder: '#8C9CAA', // curb / guardrail
  roadHighlight: 'rgba(255, 255, 255, 0.7)', // top 3D edge highlight
  roadFill: '#B8C5D3', // asphalt surface
  roadLine: '#FFFFFF', // crisp reflective dashed lines

  // Aerodynamic wind streaks (Pure crisp white)
  windPrimary: '#FFFFFF',
  windSecondary: 'rgba(255, 255, 255, 0.9)',
  windGlow: 'rgba(255, 255, 255, 0.65)',

  // Wheel dust clouds
  dustCloud: 'rgba(203, 213, 225, 0.85)',
  dustCloudBorder: '#94A3B8',

  shadow: 'rgba(15, 23, 42, 0.24)',
  ink: '#0B1F3A',
  muted: '#5B6B80',
  ctaTop: '#2E6FD6',
  ctaBottom: '#1E5BB8',
  pinDrop: '#16A34A',
} as const;

const TRUCK_RATIO = 600 / 450;
const ROAD_SAMPLES = 48;
const TRAVEL_MS = 8400; // drive duration at a smooth, relaxed cruising pace

// Native driver is unsupported on react-native-web; gate it to avoid warnings.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Point = Readonly<{ x: number; y: number }>;
type Segment = Readonly<{ x: number; y: number; length: number; angle: number; t: number }>;
type StageSize = Readonly<{ width: number; height: number }>;

/**
 * 3D Winding Highway that extends beyond stage boundaries:
 * Starts outside top-left, curves gracefully across center, and sweeps outside bottom-right.
 */
function sampleRoad({ width: w, height: h }: StageSize): Point[] {
  if (w === 0 || h === 0) return [];
  const p0 = { x: -w * 0.10, y: -h * 0.04 }; // starts outside top-left
  const p1 = { x: w * 0.50, y: h * 0.22 };  // sweeps into top-right quadrant
  const p2 = { x: w * 0.20, y: h * 0.68 };  // curves deeply into bottom-left quadrant
  const p3 = { x: w * 1.14, y: h * 1.04 };  // sweeps outside bottom-right
  const points: Point[] = [];
  for (let i = 0; i < ROAD_SAMPLES; i++) {
    const t = i / (ROAD_SAMPLES - 1);
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    const y =
      mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    points.push({ x, y });
  }
  return points;
}

function toSegments(points: readonly Point[]): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    segments.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      length: Math.hypot(dx, dy) + 10,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      t: i / (points.length - 2),
    });
  }
  return segments;
}

// Road narrows in distance (top-left) and widens near viewer (bottom-right).
const roadWidthAt = (t: number): number => 46 + t * 54;

/** Reflects the OS "reduce motion" preference so we can serve a static frame. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(Boolean(value));
      })
      .catch(() => {
        /* default to motion-on */
      });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) =>
      setReduced(Boolean(value)),
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

export function OnboardingScreen({
  onDriverRegister,
  onGetStarted,
}: OnboardingScreenProps) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<StageSize>({ width: 0, height: 0 });

  const travel = useRef(new Animated.Value(0)).current; // truck along road 0→1
  const topBarIn = useRef(new Animated.Value(0)).current; // top bar reveal
  const roadIn = useRef(new Animated.Value(0)).current; // road reveal
  const windAnim = useRef(new Animated.Value(0)).current; // aerodynamic wind pulse
  const dustAnim = useRef(new Animated.Value(0)).current; // wheel dust loop
  const contentIn = useRef(new Animated.Value(0)).current; // bottom slide-up
  const exit = useRef(new Animated.Value(0)).current; // drive-off + fade

  const isExiting = useRef(false);
  const autoAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loops = useRef<Animated.CompositeAnimation[]>([]);
  const onGetStartedRef = useRef(onGetStarted);
  onGetStartedRef.current = onGetStarted;

  const points = useMemo(() => sampleRoad(stage), [stage]);
  const segments = useMemo(() => toSegments(points), [points]);
  const ready = stage.width > 0 && stage.height > 0;

  const truckWidth = Math.max(120, Math.min(168, stage.width * 0.42));
  const truckHeight = truckWidth / TRUCK_RATIO;

  const finish = useMemo(() => {
    return () => {
      if (isExiting.current) return;
      isExiting.current = true;
      if (autoAdvance.current) clearTimeout(autoAdvance.current);
      loops.current.forEach((l) => l.stop());
      if (reduceMotion) {
        onGetStartedRef.current();
        return;
      }
      Animated.timing(exit, {
        toValue: 1,
        duration: 540,
        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) onGetStartedRef.current();
      });
    };
  }, [exit, reduceMotion]);

  useEffect(() => {
    if (!ready) return;

    if (reduceMotion) {
      travel.setValue(1);
      topBarIn.setValue(1);
      roadIn.setValue(1);
      contentIn.setValue(1);
      return;
    }

    travel.setValue(0);
    topBarIn.setValue(0);
    roadIn.setValue(0);
    contentIn.setValue(0);
    exit.setValue(0);
    windAnim.setValue(0);
    dustAnim.setValue(0);

    // Dynamic wind pulse loop
    const windLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(windAnim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(windAnim, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );

    // Dynamic wheel dust expansion loop
    const dustLoop = Animated.loop(
      Animated.timing(dustAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    loops.current = [windLoop, dustLoop];

    const intro = Animated.parallel([
      Animated.timing(topBarIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(roadIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(contentIn, {
        toValue: 1,
        duration: 620,
        delay: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);

    const drive = Animated.timing(travel, {
      toValue: 1,
      duration: TRAVEL_MS,
      delay: 350,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });

    intro.start();
    windLoop.start();
    dustLoop.start();
    drive.start();

    autoAdvance.current = setTimeout(finish, TRAVEL_MS + 1000);

    return () => {
      intro.stop();
      drive.stop();
      windLoop.stop();
      dustLoop.stop();
      if (autoAdvance.current) clearTimeout(autoAdvance.current);
    };
  }, [ready, reduceMotion, travel, roadIn, contentIn, exit, windAnim, dustAnim, finish]);

  // Truck rides along the road centreline; wheels sit ~80% down the sprite.
  const truckStyle = useMemo(() => {
    if (points.length === 0) return null;
    const inputRange = points.map((_, i) => i / (points.length - 1));
    const tx = travel.interpolate({
      inputRange,
      outputRange: points.map((p) => p.x - truckWidth / 2),
    });
    const ty = travel.interpolate({
      inputRange,
      outputRange: points.map((p) => p.y - truckHeight * 0.8),
    });
    const exitX = exit.interpolate({ inputRange: [0, 1], outputRange: [0, stage.width * 0.35] });
    const exitY = exit.interpolate({ inputRange: [0, 1], outputRange: [0, stage.height * 0.35] });
    const travelScale = travel.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1.10] });
    const exitScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
    return {
      opacity: Animated.multiply(
        travel.interpolate({ inputRange: [0, 0.03, 1], outputRange: [0, 1, 1] }),
        exit.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 0.8, 0] }),
      ),
      transform: [
        { translateX: Animated.add(tx, exitX) },
        { translateY: Animated.add(ty, exitY) },
        { scale: Animated.multiply(travelScale, exitScale) },
      ],
    };
  }, [travel, exit, points, truckWidth, truckHeight, stage.width, stage.height]);

  // Isometric angled shadow following the truck orientation (slanted down-right along the truck chassis)
  const shadowStyle = useMemo(() => {
    if (points.length === 0) return null;
    const inputRange = points.map((_, i) => i / (points.length - 1));
    const shadowW = truckWidth * 0.76;
    const shadowH = 20;
    const sx = travel.interpolate({
      inputRange,
      outputRange: points.map((p) => p.x - shadowW / 2 + truckWidth * 0.02),
    });
    const sy = travel.interpolate({
      inputRange,
      outputRange: points.map((p) => p.y - shadowH / 2 - truckHeight * 0.04),
    });
    const exitX = exit.interpolate({ inputRange: [0, 1], outputRange: [0, stage.width * 0.35] });
    const exitY = exit.interpolate({ inputRange: [0, 1], outputRange: [0, stage.height * 0.35] });
    const travelScale = travel.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1.10] });
    const exitScale = exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

    return {
      opacity: Animated.multiply(
        travel.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 0.95, 0.95] }),
        exit.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 0.8, 0] }),
      ),
      transform: [
        { translateX: Animated.add(sx, exitX) },
        { translateY: Animated.add(sy, exitY) },
        { rotate: '27deg' },
        { scale: Animated.multiply(travelScale, exitScale) },
      ],
    };
  }, [travel, exit, points, truckWidth, truckHeight, stage.width, stage.height]);


  // Overall active opacity for dust/wind trails when truck is driving
  const trailActiveOpacity = travel.interpolate({
    inputRange: [0, 0.04, 0.94, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Wind speed streak 1 (tucked closely behind top rear roof)
  const windStreak1Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      windAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.0] }),
    ),
    transform: [
      {
        translateX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [2, -10],
        }),
      },
      {
        scaleX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1.25],
        }),
      },
      { rotate: '-24deg' },
    ],
  };

  // Wind speed streak 2 (tucked closely behind mid container)
  const windStreak2Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      windAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
    ),
    transform: [
      {
        translateX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, -12],
        }),
      },
      {
        scaleX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1.3],
        }),
      },
      { rotate: '-22deg' },
    ],
  };

  // Wind speed streak 3 (tucked closely behind lower container edge)
  const windStreak3Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      windAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
    ),
    transform: [
      {
        translateX: windAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      { rotate: '-20deg' },
    ],
  };

  // Wheel dust puff 1 (tucked closely behind rear wheels)
  const dustPuff1Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      dustAnim.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0.2, 0.95, 0.6, 0],
      }),
    ),
    transform: [
      {
        translateX: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, -14],
        }),
      },
      {
        translateY: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
      {
        scale: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.4],
        }),
      },
    ],
  };

  // Wheel dust puff 2 (secondary offset cloud)
  const dustPuff2Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      dustAnim.interpolate({
        inputRange: [0, 0.4, 0.85, 1],
        outputRange: [0.6, 0.9, 0.3, 0],
      }),
    ),
    transform: [
      {
        translateX: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -11],
        }),
      },
      {
        translateY: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, -3],
        }),
      },
      {
        scale: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.2],
        }),
      },
    ],
  };

  // Wheel dust puff 3 (small ground drift)
  const dustPuff3Style = {
    opacity: Animated.multiply(
      trailActiveOpacity,
      dustAnim.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: [0.3, 0.85, 0.4, 0],
      }),
    ),
    transform: [
      {
        translateX: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [2, -8],
        }),
      },
      {
        scale: dustAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1.1],
        }),
      },
    ],
  };

  const topBarStyle = {
    opacity: Animated.multiply(
      topBarIn,
      exit.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.3, 0] }),
    ),
    transform: [
      {
        translateY: Animated.add(
          topBarIn.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
          }),
          exit.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        ),
      },
    ],
  };

  const stageStyle = {
    opacity: exit.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 0.35, 0] }),
    transform: [
      { scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
    ],
  };

  const contentStyle = {
    opacity: Animated.multiply(
      contentIn,
      exit.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.25, 0] }),
    ),
    transform: [
      {
        translateY: Animated.add(
          contentIn.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }),
          exit.interpolate({ inputRange: [0, 1], outputRange: [0, 36] }),
        ),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top brand bar */}
        <Animated.View style={[styles.topBar, topBarStyle]}>
          <View style={styles.brandLogoWrap}>
            <LeopardEmblem testID="onboarding-brand-emblem" width={74} />
            <View style={styles.wordmarkWrap}>
              <LeopardMobileLogo height={30} testID="onboarding-brand-logo" width={150} />
            </View>
            <View style={styles.brandNameHiddenAccessible}>
              <Text style={styles.brandGlyph}>Leo</Text>
              <Text style={styles.brandGlyph}>pard</Text>
            </View>
          </View>



          <Pressable
            accessibilityLabel="Bỏ qua"
            accessibilityRole="button"
            hitSlop={8}
            onPress={finish}
            style={({ pressed, hovered }: any) => [
              styles.skipBtn,
              hovered && styles.skipBtnHovered,
              pressed && styles.skipBtnPressed,
            ]}
          >
            {({ hovered, pressed }: any) => (
              <Text style={[styles.skipText, (hovered || pressed) && styles.skipTextHovered]}>
                Bỏ qua
              </Text>
            )}
          </Pressable>
        </Animated.View>




        {/* Road stage with 3D Elevated Highway */}
        <Animated.View
          onLayout={(e) =>
            setStage({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          style={[styles.stage, stageStyle]}
        >
          {/* Decorative City Blocks */}
          <View style={[styles.block, styles.blockA]} />
          <View style={[styles.block, styles.blockB]} />
          <View style={[styles.block, styles.blockC]} />
          <View style={[styles.block, styles.blockD]} />

          {ready && (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: roadIn }]}>
              {/* Layer 1: Ambient Drop Shadow beneath the elevated overpass */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 12;
                return (
                  <View
                    key={`shd-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 + 10,
                      width: s.length,
                      height: wdt,
                      borderRadius: 10,
                      backgroundColor: scene.roadCastShadow,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 2: 3D Concrete Bridge Side Thickness (Overpass Wall) */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`wall-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 + 5,
                      width: s.length,
                      height: wdt,
                      borderRadius: 8,
                      backgroundColor: scene.roadOverpassWall,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 3: Road Shoulder / Curb */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`sh-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2,
                      width: s.length,
                      height: wdt,
                      borderRadius: 8,
                      backgroundColor: scene.roadShoulder,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 4: 3D Upper Light Reflection on Edge */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t) + 8;
                return (
                  <View
                    key={`hgl-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2 - 1,
                      width: s.length,
                      height: 2,
                      borderRadius: 1,
                      backgroundColor: scene.roadHighlight,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 5: Main Asphalt Surface */}
              {segments.map((s, i) => {
                const wdt = roadWidthAt(s.t);
                return (
                  <View
                    key={`rd-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - s.length / 2,
                      top: s.y - wdt / 2,
                      width: s.length,
                      height: wdt,
                      borderRadius: 6,
                      backgroundColor: scene.roadFill,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                );
              })}

              {/* Layer 6: Reflective Dashed Centre Line */}
              {segments.map((s, i) =>
                i % 2 === 0 ? (
                  <View
                    key={`ln-${i}`}
                    style={{
                      position: 'absolute',
                      left: s.x - Math.min(16, s.length * 0.55) / 2,
                      top: s.y - 2,
                      width: Math.min(16, s.length * 0.55),
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: scene.roadLine,
                      opacity: 0.95,
                      transform: [{ rotate: `${s.angle}deg` }],
                    }}
                  />
                ) : null,
              )}
            </Animated.View>
          )}

          {ready && truckStyle && shadowStyle && (
            <>
              {/* Contact shadow under the truck (tilted to match isometric chassis angle) */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.truckShadow,
                  shadowStyle,
                  { width: truckWidth * 0.76, height: 22 },
                ]}
              />

              {/* Truck + Multi-layer Wind & Dust Trails */}
              <Animated.View
                pointerEvents="none"
                style={[styles.truckWrap, truckStyle, { width: truckWidth }]}
              >
                {/* 1. Aerodynamic Wind Speed Streaks in pure white */}
                <Animated.View style={[styles.windStreak, styles.windStreak1, windStreak1Style]} />
                <Animated.View style={[styles.windStreak, styles.windStreak2, windStreak2Style]} />
                <Animated.View style={[styles.windStreak, styles.windStreak3, windStreak3Style]} />

                {/* 2. Wheel Dust Cloud Puffs behind rear wheels */}
                <Animated.View style={[styles.dustPuff, styles.dustPuff1, dustPuff1Style]} />
                <Animated.View style={[styles.dustPuff, styles.dustPuff2, dustPuff2Style]} />
                <Animated.View style={[styles.dustPuff, styles.dustPuff3, dustPuff3Style]} />

                {/* Truck Sprite */}
                <Image
                  resizeMode="contain"
                  source={truckSource}
                  style={{ width: truckWidth, height: truckHeight }}
                />
              </Animated.View>
            </>
          )}

          <Animated.View style={[styles.routeChip, { opacity: roadIn }]}>
            <View style={styles.routeDot} />
            <Text style={styles.routeChipText}>Đang giao hàng · GPS Realtime</Text>
          </Animated.View>
        </Animated.View>

        {/* Bottom content */}
        <Animated.View style={[styles.bottomArea, contentStyle]}>
          <View style={styles.textGroup}>
            <Text style={styles.title}>
              Vận chuyển hàng hóa & vật liệu thông minh
            </Text>
            <Text style={styles.subtitle}>
              Điều phối tức thì · Định vị GPS realtime · Tối ưu chi phí cho SME & Công trình
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Bắt đầu ngay"
            accessibilityRole="button"
            onPress={finish}
            style={({ pressed }) => [styles.primaryCtaBtn, pressed && styles.pressed]}
          >
            <View style={styles.ctaHighlight} pointerEvents="none" />
            <Text style={styles.primaryCtaText}>Bắt đầu ngay</Text>
          </Pressable>

          {onDriverRegister && (
            <View style={styles.subLinksRow}>
              <Pressable
                accessibilityLabel="Đăng ký đối tác tài xế"
                accessibilityRole="button"
                onPress={onDriverRegister}
                style={styles.linkTouch}
              >
                <Text style={styles.driverLinkText}>Đăng ký đối tác tài xế</Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: scene.canvas },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 0,
    minHeight: 50,
  },

  brandLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 0,
    flexShrink: 1,
  },
  wordmarkWrap: {
    paddingTop: 5,
  },



  brandNameHiddenAccessible: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    opacity: 0.01,
    pointerEvents: 'none',
  },
  brandGlyph: { fontSize: 1, color: leopardPalette.primaryDark },
  skipBtn: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skipBtnHovered: {
    transform: [{ translateY: -1 }],
  },
  skipBtnPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  skipText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  skipTextHovered: {
    color: scene.ink,
  },



  stage: {
    flex: 1,
    borderRadius: radius.cardXl,
    backgroundColor: scene.mapGround,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#D4E2F0',
  },
  block: {
    position: 'absolute',
    backgroundColor: scene.block,
    borderColor: scene.blockBorder,
    borderWidth: 1,
    borderRadius: 8,
    transform: [{ rotate: '-18deg' }],
  },
  blockA: { width: 78, height: 78, right: '4%', top: '10%' },
  blockB: { width: 62, height: 62, left: '4%', top: '34%' },
  blockC: { width: 68, height: 68, left: '8%', bottom: '12%' },
  blockD: { width: 52, height: 52, right: '4%', top: '68%' },

  // Angled isometric shadow under truck chassis
  truckShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 999,
    backgroundColor: scene.shadow,
  },

  truckWrap: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },

  // Pure White Aerodynamic Wind Streaks (Tucked closely behind truck body)
  windStreak: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  windStreak1: {
    width: 32,
    height: 3.5,
    left: '6%',
    top: '18%',
    opacity: 0.95,
  },
  windStreak2: {
    width: 26,
    height: 3,
    left: '12%',
    top: '28%',
    opacity: 0.85,
  },
  windStreak3: {
    width: 20,
    height: 2.5,
    left: '16%',
    top: '38%',
    opacity: 0.75,
  },

  // Wheel Dust Cloud Puffs (Tucked closely behind rear wheels)
  dustPuff: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(203, 213, 225, 0.85)',
    borderColor: '#94A3B8',
    borderWidth: 1,
  },
  dustPuff1: {
    width: 16,
    height: 16,
    left: '8%',
    top: '64%',
  },
  dustPuff2: {
    width: 12,
    height: 12,
    left: '14%',
    top: '68%',
  },
  dustPuff3: {
    width: 9,
    height: 9,
    left: '20%',
    top: '74%',
  },

  routeChip: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DBE6F2',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: scene.pinDrop },
  routeChipText: { fontSize: 12, fontWeight: '600', color: scene.ink },

  bottomArea: { gap: spacing.md, paddingBottom: spacing.xs },
  textGroup: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.pageTitle,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '700',
    color: scene.ink,
    textAlign: 'center',
    maxWidth: 340,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: scene.muted,
    textAlign: 'center',
    maxWidth: 320,
    fontWeight: '500',
    alignSelf: 'center',
  },
  primaryCtaBtn: {
    backgroundColor: scene.ctaBottom,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: scene.ctaBottom,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: scene.ctaTop,
    opacity: 0.55,
  },
  primaryCtaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.9 },
  subLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTouch: { paddingVertical: 6, paddingHorizontal: 12 },
  driverLinkText: { color: leopardPalette.primary, fontSize: 13.5, fontWeight: '600' },
});


