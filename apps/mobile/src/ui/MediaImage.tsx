import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { httpClient } from '../api/http-client';
import { colors, radius, spacing, typography } from '@leopard/mobile-core';

type MediaImageState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'ready'; url: string }>
  | Readonly<{ kind: 'error' }>;

export type MediaImageProps = Readonly<{
  mediaId: string;
}>;

export function MediaImage({ mediaId }: MediaImageProps) {
  const [state, setState] = useState<MediaImageState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });

    httpClient
      .get<{ url: string; expiresAt: string }>(`/media/${mediaId}/url`)
      .then((response) => {
        if (active) setState({ kind: 'ready', url: response.url });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });

    return () => {
      active = false;
    };
  }, [mediaId]);

  if (state.kind === 'loading') {
    return (
      <View accessibilityState={{ busy: true }} style={styles.placeholder}>
        <Text style={styles.helper}>Đang tải ảnh…</Text>
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View style={[styles.placeholder, styles.errorPlaceholder]}>
        <Text accessibilityRole="alert" style={styles.helper}>
          Không thể tải ảnh
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityRole="image"
      resizeMode="cover"
      source={{ uri: state.url }}
      style={styles.image}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    aspectRatio: 4 / 3,
    borderRadius: radius.card,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: colors.neutral.surface,
    borderRadius: radius.card,
    justifyContent: 'center',
    padding: spacing.sm,
    width: '100%',
  },
  errorPlaceholder: {
    backgroundColor: colors.danger.background,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
  },
});
