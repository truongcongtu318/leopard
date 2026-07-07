import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../theme";

interface FoundationCardProps extends PropsWithChildren {
  title: string;
  caption: string;
}

export function FoundationCard({
  title,
  caption,
  children
}: FoundationCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.caption}>{caption}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  caption: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
