import { Stack } from 'expo-router';

export default function DriverPublicLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: '#F8FAFC' },
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          contentStyle: { backgroundColor: '#0B1E42' },
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: '#0B1E42' },
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="driver-register"
        options={{
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: '#F8FAFC' },
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
