import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MobileShell } from "./components/layout/MobileShell";
import { AuthPlaceholder } from "./features/auth/AuthPlaceholder";
import { CustomerPlaceholder } from "./features/customer/CustomerPlaceholder";
import { DriverPlaceholder } from "./features/driver/DriverPlaceholder";
import { mobileSections } from "./navigation/surfaces";
import { colors, spacing } from "./theme";

export function AppRoot() {
  return (
    <SafeAreaProvider>
      <MobileShell
        eyebrow="LEOPARD Mobile"
        title="Customer and Driver foundation"
        subtitle="Phase 2.1 keeps mobile scope focused on placeholders, shared contracts, and a clean app shell."
      >
        <StatusBar barStyle="dark-content" />
        <AuthPlaceholder />
        <CustomerPlaceholder />
        <DriverPlaceholder />

        <View style={styles.surfaceList}>
          {mobileSections.map((section) => (
            <View key={section.role} style={styles.surfaceItem}>
              <Text style={styles.surfaceLabel}>{section.label}</Text>
              <Text style={styles.surfaceValue}>{section.initialSurface}</Text>
            </View>
          ))}
        </View>
      </MobileShell>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  surfaceList: {
    gap: spacing.sm
  },
  surfaceItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md
  },
  surfaceLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  surfaceValue: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4
  }
});
