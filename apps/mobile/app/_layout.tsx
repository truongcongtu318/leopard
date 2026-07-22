import { Slot } from 'expo-router';
import { Component, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type RootErrorBoundaryState = {
  hasError: boolean;
};

class RootErrorBoundary extends Component<PropsWithChildren, RootErrorBoundaryState> {
  public state: RootErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RootErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.boundary}>
          <Text accessibilityRole="alert">Ứng dụng chưa thể khởi động.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootProviders>
        <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.boundary}>
          <Slot />
        </SafeAreaView>
      </RootProviders>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boundary: {
    flex: 1,
  },
});
