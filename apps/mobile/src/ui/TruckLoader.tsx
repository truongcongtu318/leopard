import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { leopardPalette, radius, spacing, typography } from '@leopard/mobile-core';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export type TruckLoaderSize = 'sm' | 'md' | 'lg';

export type TruckLoaderProps = Readonly<{
  size?: TruckLoaderSize;
  title?: string;
  message?: string;
  showRoad?: boolean;
  showText?: boolean;
  testID?: string;
  style?: ViewStyle;
}>;

const SIZE_CONFIG = {
  sm: {
    truckWidth: 62,
    truckHeight: 34,
    roadWidth: 130,
    roadHeight: 9,
    containerHeight: 64,
    dashWidth: 14,
    dashGap: 10,
    shadowWidth: 54,
    wheelSize: 10,
  },
  md: {
    truckWidth: 86,
    truckHeight: 46,
    roadWidth: 180,
    roadHeight: 11,
    containerHeight: 84,
    dashWidth: 20,
    dashGap: 14,
    shadowWidth: 74,
    wheelSize: 14,
  },
  lg: {
    truckWidth: 112,
    truckHeight: 60,
    roadWidth: 230,
    roadHeight: 13,
    containerHeight: 106,
    dashWidth: 26,
    dashGap: 18,
    shadowWidth: 98,
    wheelSize: 18,
  },
};

/**
 * 🚚 Side-Profile Horizontal Delivery Truck Vector Component ("Xe đi ngang")
 * Features sleek aerodynamic cabin, Leopard brand racing stripes, cargo container,
 * tinted reflective glass, and spinning alloy wheel hubs.
 */
function HorizontalTruckSprite({
  width,
  height,
  wheelSize,
  wheelRotation,
}: {
  width: number;
  height: number;
  wheelSize: number;
  wheelRotation: Animated.AnimatedInterpolation<string>;
}) {
  const containerW = width * 0.60;
  const cabinW = width * 0.36;
  const chassisH = Math.max(4, height * 0.12);
  const containerH = height * 0.68;
  const cabinH = height * 0.60;

  return (
    <View style={[styles.truckBodyContainer, { width, height }]}>
      {/* 1. Main Cargo Box (Rear / Left) */}
      <View
        style={[
          styles.cargoBox,
          {
            width: containerW,
            height: containerH,
            bottom: wheelSize * 0.6 + chassisH * 0.5,
            left: 0,
          },
        ]}
      >
        {/* Top Roof Reinforcement Bevel */}
        <View style={styles.cargoRoofBevel} />

        {/* Leopard Brand Racing Stripes (Blue & Orange) */}
        <View style={styles.stripeBlue} />
        <View style={styles.stripeOrange} />

        {/* Container Rear Door Hinge / Frame */}
        <View style={styles.cargoDoorFrame} />
        <View style={styles.cargoDoorHandle} />

        {/* Aerodynamic Speed Swoosh Icon */}
        <View style={styles.cargoBrandPill}>
          <Text style={styles.cargoBrandText}>LEOPARD</Text>
        </View>
      </View>

      {/* 2. Aerodynamic Cabin (Front / Right) */}
      <View
        style={[
          styles.cabinBox,
          {
            width: cabinW,
            height: cabinH,
            bottom: wheelSize * 0.6 + chassisH * 0.5,
            left: containerW + 2,
          },
        ]}
      >
        {/* Roof Wind Deflector Fairing */}
        <View style={styles.cabinFairing} />

        {/* Tinted Reflective Glass Window */}
        <View style={styles.cabinWindow}>
          <View style={styles.windowGlare} />
        </View>

        {/* Side Mirror */}
        <View style={styles.sideMirror} />

        {/* Front Chrome Grille */}
        <View style={styles.frontGrille}>
          <View style={styles.grilleSlot} />
          <View style={styles.grilleSlot} />
        </View>

        {/* Headlight & Amber Signal */}
        <View style={styles.headlightWrap}>
          <View style={styles.headlightLens} />
          <View style={styles.amberTurnSignal} />
        </View>
      </View>

      {/* 3. Dark Heavy-Duty Chassis & Mudguards */}
      <View
        style={[
          styles.truckChassis,
          {
            width: width - 4,
            height: chassisH,
            bottom: wheelSize * 0.5,
            left: 2,
          },
        ]}
      />

      {/* 4. Front Mudguard & Rear Mudguard */}
      <View
        style={[
          styles.mudguard,
          {
            width: wheelSize + 6,
            height: wheelSize * 0.6,
            bottom: wheelSize * 0.45,
            left: width * 0.16,
          },
        ]}
      />
      <View
        style={[
          styles.mudguard,
          {
            width: wheelSize + 6,
            height: wheelSize * 0.6,
            bottom: wheelSize * 0.45,
            left: width * 0.72,
          },
        ]}
      />

      {/* 5. Realistic Wheels with Spinning Alloy Hubs */}
      {/* Rear Wheel */}
      <View
        style={[
          styles.wheelTire,
          {
            width: wheelSize,
            height: wheelSize,
            borderRadius: wheelSize / 2,
            bottom: 0,
            left: width * 0.16 + 3,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.wheelRim,
            {
              width: wheelSize * 0.65,
              height: wheelSize * 0.65,
              borderRadius: (wheelSize * 0.65) / 2,
              transform: [{ rotate: wheelRotation }],
            },
          ]}
        >
          <View style={styles.wheelSpokeH} />
          <View style={styles.wheelSpokeV} />
          <View style={styles.wheelCenterCap} />
        </Animated.View>
      </View>

      {/* Front Wheel */}
      <View
        style={[
          styles.wheelTire,
          {
            width: wheelSize,
            height: wheelSize,
            borderRadius: wheelSize / 2,
            bottom: 0,
            left: width * 0.72 + 3,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.wheelRim,
            {
              width: wheelSize * 0.65,
              height: wheelSize * 0.65,
              borderRadius: (wheelSize * 0.65) / 2,
              transform: [{ rotate: wheelRotation }],
            },
          ]}
        >
          <View style={styles.wheelSpokeH} />
          <View style={styles.wheelSpokeV} />
          <View style={styles.wheelCenterCap} />
        </Animated.View>
      </View>
    </View>
  );
}

export function TruckLoader({
  size = 'md',
  title,
  message,
  showRoad = true,
  showText = false,
  testID = 'truck-loader',
  style,
}: TruckLoaderProps) {
  const cfg = SIZE_CONFIG[size];

  // 1. Suspension bounce & rumble animation
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // 2. Parallax road line scrolling animation (0 -> 1 loop)
  const roadScrollAnim = useRef(new Animated.Value(0)).current;
  // 3. Aerodynamic wind streams animation
  const windAnim = useRef(new Animated.Value(0)).current;
  // 4. Wheel dust cloud animation
  const dustAnim = useRef(new Animated.Value(0)).current;
  // 5. GPS pulse beacon animation
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // 6. Loading text dots bounce
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Truck chassis suspension bounce (rhythmic engine rumble)
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0.3,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0.8,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );

    // 2. Road dashed line translation (scrolling to the left)
    const roadLoop = Animated.loop(
      Animated.timing(roadScrollAnim, {
        toValue: 1,
        duration: 460,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    // 3. Wind speed streaks loop
    const windLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(windAnim, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(windAnim, {
          toValue: 0,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );

    // 4. Wheel dust clouds loop
    const dustLoop = Animated.loop(
      Animated.timing(dustAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    // 5. GPS Pulse beacon loop
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    );

    // 6. Text loading dots staggered bounce
    const dotStagger = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1Anim, {
          toValue: 1,
          duration: 260,
          easing: Easing.ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(dot2Anim, {
          toValue: 1,
          duration: 260,
          easing: Easing.ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(dot3Anim, {
          toValue: 1,
          duration: 260,
          easing: Easing.ease,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.parallel([
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration: 260,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]),
    );

    bounceLoop.start();
    roadLoop.start();
    windLoop.start();
    dustLoop.start();
    pulseLoop.start();
    dotStagger.start();

    return () => {
      bounceLoop.stop();
      roadLoop.stop();
      windLoop.stop();
      dustLoop.stop();
      pulseLoop.stop();
      dotStagger.stop();
    };
  }, [bounceAnim, roadScrollAnim, windAnim, dustAnim, pulseAnim, dot1Anim, dot2Anim, dot3Anim]);

  // Truck suspension vibration
  const truckTranslateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.5],
  });
  const truckRotate = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0.5deg', '-0.5deg'],
  });

  // Wheel continuous 360-degree rotation animation
  const wheelRotation = roadScrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Contact shadow under wheels: shrinks slightly as truck bounces up
  const shadowScaleX = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.90],
  });
  const shadowOpacity = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.20],
  });

  // Road cycle shift
  const roadShift = roadScrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(cfg.dashWidth + cfg.dashGap)],
  });

  // GPS pulse expand & fade
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.2],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.8, 0.4, 0],
  });

  // Wind speed streak styles
  const wind1TranslateX = windAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const wind1Opacity = windAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.85, 0.3],
  });

  const wind2TranslateX = windAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });
  const wind2Opacity = windAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 0.95, 0.4],
  });

  // Dust puff animations
  const dustScale1 = dustAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 1.2],
  });
  const dustTranslateX1 = dustAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });
  const dustTranslateY1 = dustAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });
  const dustOpacity1 = dustAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.65, 0.45, 0],
  });

  // Render repeated dash segments for seamless loop
  const totalDashes = Math.ceil(cfg.roadWidth / (cfg.dashWidth + cfg.dashGap)) + 2;
  const dashes = Array.from({ length: totalDashes }, (_, i) => i);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={[styles.container, style]}
      testID={testID}
    >
      {/* Visual Animation Scene */}
      <View
        style={[
          styles.animationStage,
          { width: cfg.roadWidth + 24, height: cfg.containerHeight },
        ]}
      >
        {/* Aerodynamic Wind Streaks (Trailing Behind Container) */}
        <Animated.View
          style={[
            styles.windStreak,
            styles.windStreakTop,
            {
              width: cfg.truckWidth * 0.38,
              height: 2,
              top: cfg.truckHeight * 0.22,
              left: (cfg.roadWidth + 24) / 2 - cfg.truckWidth / 2 - 10,
              opacity: wind1Opacity,
              transform: [{ translateX: wind1TranslateX }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.windStreak,
            styles.windStreakMid,
            {
              width: cfg.truckWidth * 0.52,
              height: 2.5,
              top: cfg.truckHeight * 0.42,
              left: (cfg.roadWidth + 24) / 2 - cfg.truckWidth / 2 - 16,
              opacity: wind2Opacity,
              transform: [{ translateX: wind2TranslateX }],
            },
          ]}
        />

        {/* Wheel Dust Clouds behind rear axle */}
        <Animated.View
          style={[
            styles.dustPuff,
            {
              width: 9,
              height: 9,
              top: cfg.truckHeight * 0.76,
              left: (cfg.roadWidth + 24) / 2 - cfg.truckWidth / 2 + 2,
              opacity: dustOpacity1,
              transform: [
                { translateX: dustTranslateX1 },
                { translateY: dustTranslateY1 },
                { scale: dustScale1 },
              ],
            },
          ]}
        />

        {/* GPS Pulse Beacon on Truck Cabin Antenna */}
        <Animated.View
          style={[
            styles.gpsPulse,
            {
              width: 16,
              height: 16,
              top: cfg.truckHeight * 0.16,
              right: (cfg.roadWidth + 24) / 2 - cfg.truckWidth / 2 + 10,
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        {/* Truck Contact Ground Shadow */}
        <Animated.View
          style={[
            styles.truckShadow,
            {
              width: cfg.shadowWidth,
              height: Math.max(5, cfg.roadHeight * 0.6),
              bottom: showRoad ? cfg.roadHeight - 2 : 2,
              opacity: shadowOpacity,
              transform: [{ scaleX: shadowScaleX }],
            },
          ]}
        />

        {/* Bouncing Side-Profile Delivery Truck Sprite */}
        <Animated.View
          style={[
            styles.truckWrap,
            {
              width: cfg.truckWidth,
              height: cfg.truckHeight,
              bottom: showRoad ? cfg.roadHeight - 1 : 4,
              transform: [{ translateY: truckTranslateY }, { rotate: truckRotate }],
            },
          ]}
        >
          <HorizontalTruckSprite
            height={cfg.truckHeight}
            wheelRotation={wheelRotation}
            wheelSize={cfg.wheelSize}
            width={cfg.truckWidth}
          />
        </Animated.View>

        {/* Synchronized Slate-Blue (Xám Xanh) Road Surface */}
        {showRoad ? (
          <View
            style={[
              styles.roadTrack,
              {
                width: cfg.roadWidth,
                height: cfg.roadHeight,
                bottom: 0,
              },
            ]}
          >
            {/* Upper Highway Concrete Curb Highlight */}
            <View style={styles.roadCurbs} />

            {/* Crisp White Dashed Lane Markings Scrolling Left */}
            <Animated.View
              style={[
                styles.dashesRow,
                {
                  transform: [{ translateX: roadShift }],
                },
              ]}
            >
              {dashes.map((idx) => (
                <View
                  key={`dash-${idx}`}
                  style={[
                    styles.roadDash,
                    {
                      width: cfg.dashWidth,
                      height: 2,
                      marginRight: cfg.dashGap,
                    },
                  ]}
                />
              ))}
            </Animated.View>
          </View>
        ) : null}
      </View>

      {/* Optional Status Label & Animated Bouncing Dots */}
      {showText ? (
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{title ?? 'Đang kết nối chuyến xe'}</Text>
            <View style={styles.dotsGroup}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: dot1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: dot2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: dot3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
          {message ? <Text style={styles.messageText}>{message}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  truckWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  /* Horizontal Delivery Truck Vector Details */
  truckBodyContainer: {
    position: 'relative',
  },
  cargoBox: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderColor: '#64748B',
    borderWidth: 1.2,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  cargoRoofBevel: {
    width: '100%',
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stripeBlue: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0B1E42',
  },
  stripeOrange: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FF6B00',
  },
  cargoDoorFrame: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#94A3B8',
  },
  cargoDoorHandle: {
    position: 'absolute',
    left: 4,
    top: '46%',
    width: 2,
    height: 5,
    backgroundColor: '#475569',
    borderRadius: 1,
  },
  cargoBrandPill: {
    position: 'absolute',
    top: 3,
    left: 8,
  },
  cargoBrandText: {
    fontSize: 6.5,
    fontWeight: '900',
    color: '#0B1E42',
    letterSpacing: 0.4,
  },
  cabinBox: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderColor: '#64748B',
    borderWidth: 1.2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 2,
    borderTopLeftRadius: 2,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  cabinFairing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E2E8F0',
  },
  cabinWindow: {
    position: 'absolute',
    top: 4,
    right: 3,
    width: '68%',
    height: '46%',
    backgroundColor: '#38BDF8',
    borderColor: '#0B1E42',
    borderWidth: 1,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 1,
    overflow: 'hidden',
  },
  windowGlare: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  sideMirror: {
    position: 'absolute',
    top: 7,
    right: '72%',
    width: 2.5,
    height: 4.5,
    backgroundColor: '#475569',
    borderRadius: 1,
  },
  frontGrille: {
    position: 'absolute',
    bottom: 3,
    right: 0,
    width: '45%',
    height: 5,
    backgroundColor: '#475569',
    borderTopLeftRadius: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  grilleSlot: {
    width: 1.5,
    height: 3,
    backgroundColor: '#94A3B8',
    borderRadius: 0.5,
  },
  headlightWrap: {
    position: 'absolute',
    bottom: 2,
    right: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  headlightLens: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 2,
  },
  amberTurnSignal: {
    width: 2,
    height: 3,
    borderRadius: 0.5,
    backgroundColor: '#F59E0B',
  },
  truckChassis: {
    position: 'absolute',
    backgroundColor: '#334155',
    borderRadius: 1,
  },
  mudguard: {
    position: 'absolute',
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  wheelTire: {
    position: 'absolute',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
  },
  wheelRim: {
    backgroundColor: '#CBD5E1',
    borderColor: '#94A3B8',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelSpokeH: {
    position: 'absolute',
    width: '80%',
    height: 1,
    backgroundColor: '#64748B',
  },
  wheelSpokeV: {
    position: 'absolute',
    width: 1,
    height: '80%',
    backgroundColor: '#64748B',
  },
  wheelCenterCap: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0B1E42',
  },

  truckShadow: {
    position: 'absolute',
    backgroundColor: '#0F172A',
    borderRadius: radius.pill,
    zIndex: 4,
  },

  /* Synchronized Slate-Blue (Xám Xanh) Road Palette */
  roadTrack: {
    position: 'absolute',
    backgroundColor: '#475569', // Sophisticated Slate-Blue / Xám Xanh road surface
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  roadCurbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#94A3B8', // Light slate curb highlight
    opacity: 0.85,
  },
  dashesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
  },
  roadDash: {
    backgroundColor: '#FFFFFF', // Crisp highway white lane paint matching main elevated highway
    borderRadius: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },

  windStreak: {
    position: 'absolute',
    backgroundColor: '#0B1E42',
    borderRadius: radius.pill,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    zIndex: 6,
  },
  windStreakTop: {},
  windStreakMid: {
    backgroundColor: '#38BDF8',
  },
  dustPuff: {
    position: 'absolute',
    backgroundColor: '#94A3B8',
    borderRadius: radius.pill,
    zIndex: 5,
  },
  gpsPulse: {
    position: 'absolute',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#0B1E42',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    zIndex: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  titleText: {
    ...typography.label,
    color: leopardPalette.primaryDark,
    fontWeight: '700',
  },
  dotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 2,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: leopardPalette.primary,
  },
  messageText: {
    ...typography.caption,
    color: '#64748B',
    textAlign: 'center',
  },
});
