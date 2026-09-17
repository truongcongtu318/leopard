import { Stack } from 'expo-router';
import { colors } from '@leopard/mobile-core';

export default function DriverPublicLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: colors.neutral.canvas },
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          contentStyle: { backgroundColor: colors.neutral.canvas },
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: colors.neutral.canvas },
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="driver-register"
        options={{
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: colors.neutral.canvas },
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
