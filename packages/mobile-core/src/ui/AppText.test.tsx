import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, dynamicType, typeScale } from '../theme/tokens';
import { AppText } from './AppText';

const flatten = (element: { props: { style?: unknown } }) =>
  StyleSheet.flatten(element.props.style) as Record<string, unknown>;

describe('AppText', () => {
  it('applies the HIG body style and primary tone by default', async () => {
    const screen = await render(<AppText>Nội dung</AppText>);
    const element = screen.getByText('Nội dung');

    expect(flatten(element)).toMatchObject({
      fontSize: typeScale.body.fontSize,
      lineHeight: typeScale.body.lineHeight,
      color: colors.neutral.text,
    });
  });

  it('keeps Dynamic Type enabled and hands iOS Apple\u2019s HIG ramp', async () => {
    const screen = await render(<AppText>Nội dung</AppText>);
    const element = screen.getByText('Nội dung');

    expect(element.props.allowFontScaling).toBe(true);
    expect(element.props.dynamicTypeRamp).toBe('body');
    // Content is deliberately uncapped: Apple carries Body to AX5 (53pt), which
    // is beyond the WCAG 200% floor. Layouts reflow instead of clamping text.
    expect(element.props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('raises a legacy alias onto a real HIG ramp', async () => {
    const screen = await render(<AppText variant="label">Nhãn</AppText>);

    expect(screen.getByText('Nhãn').props.dynamicTypeRamp).toBe('subheadline');
  });

  it('caps only fixed-geometry chrome', async () => {
    const screen = await render(<AppText chrome>Tab</AppText>);

    expect(screen.getByText('Tab').props.maxFontSizeMultiplier).toBe(
      dynamicType.chromeMaxScale,
    );
  });

  it('maps every tone onto a semantic colour token', async () => {
    const cases = [
      ['secondary', colors.neutral.mutedText],
      ['subtle', colors.neutral.subtleText],
      ['inverse', colors.brand.text],
      ['danger', colors.danger.text],
    ] as const;

    for (const [tone, color] of cases) {
      const screen = await render(<AppText tone={tone}>x</AppText>);
      expect(flatten(screen.getByText('x')).color).toBe(color);
    }
  });

  it('applies the requested HIG variant', async () => {
    const screen = await render(<AppText variant="title2">Tiêu đề</AppText>);

    expect(flatten(screen.getByText('Tiêu đề'))).toMatchObject({
      fontSize: typeScale.title2.fontSize,
      lineHeight: typeScale.title2.lineHeight,
      fontWeight: typeScale.title2.fontWeight,
    });
  });

  it('aligns digits when numeric so live values do not jitter', async () => {
    const screen = await render(<AppText numeric>1.250.000 đ</AppText>);

    expect(flatten(screen.getByText('1.250.000 đ')).fontVariant).toEqual(['tabular-nums']);
  });

  it('lets a caller override the style without losing the variant', async () => {
    const screen = await render(
      <AppText variant="caption1" style={{ textAlign: 'center' }}>
        Nhãn
      </AppText>,
    );

    expect(flatten(screen.getByText('Nhãn'))).toMatchObject({
      fontSize: typeScale.caption1.fontSize,
      textAlign: 'center',
    });
  });
});
