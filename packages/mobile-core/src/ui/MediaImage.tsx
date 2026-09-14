import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { httpClient } from '../api/http-client';
import { colors, radius, spacing, typography } from '../theme/tokens';

type MediaImageState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'ready'; url: string }>
  | Readonly<{ kind: 'error' }>;

export type MediaImageProps = Readonly<{
  mediaId: string;
}>;

export function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('file:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiBase = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

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
      onError={() => setState({ kind: 'error' })}
      resizeMode="cover"
      source={{ uri: resolveMediaUrl(state.url) }}
      style={styles.image}
      testID="media-image"
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
