import { StyleSheet } from "react-native";

export const colors = {
  accent: "#176B5B",
  background: "#F7F8FA",
  border: "#D9E0E7",
  muted: "#5D6878",
  surface: "#FFFFFF",
  text: "#162033"
} as const;

export const spacing = {
  sm: 8,
  md: 16,
  lg: 24
} as const;

export const textStyles = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
