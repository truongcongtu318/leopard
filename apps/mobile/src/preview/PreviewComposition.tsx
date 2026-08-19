import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme/tokens';
import { PreviewBanner } from './PreviewBanner';
import type { MobilePreviewFixture, MobilePreviewSelection } from './scenario';

export type MobilePreviewCompositionProps = Readonly<{
  selection: MobilePreviewSelection;
  renderRuntime: () => ReactNode;
  renderFixture: (fixture: MobilePreviewFixture) => ReactNode;
}>;

export function MobilePreviewComposition({
  selection,
  renderRuntime,
  renderFixture,
}: MobilePreviewCompositionProps) {
  if (selection.mode === 'runtime') {
    return <>{renderRuntime()}</>;
  }

  return (
    <View style={styles.container}>
      <PreviewBanner />
      {renderFixture(selection.fixture)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
});
