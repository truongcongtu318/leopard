import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, spacing, typography } from '../theme/tokens';

export type TabBarItem = Readonly<{
  id: string;
  label: string;
  route: string;
}>;

export type TabBarProps = Readonly<{
  items: readonly TabBarItem[];
}>;

export function TabBar({ items }: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {items.map((item) => {
        const isActive = pathname === item.route;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={item.id}
            onPress={() => router.push(item.route)}
            style={styles.tab}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: colors.neutral.subtleBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: control.minimumTouchHeight,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.neutral.mutedText,
  },
  labelActive: {
    color: colors.brand.background,
  },
});
