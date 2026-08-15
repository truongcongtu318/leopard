import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { layout, spacing, typography } from '../theme/tokens';
import { Button } from './Button';
import { MapPanel } from './MapPanel';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { RouteSpine, RouteSummary } from './RouteSpine';
import { SCREEN_SCAFFOLD_SAFE_AREA_OWNER, ScreenScaffold, SectionHeading } from './ScreenScaffold';
import { StatusTimeline, statusTimelineKeyExtractor } from './StatusTimeline';

const longPickup =
  'Cổng số 3, Khu công nghiệp Tân Bình, đường Tây Thạnh kéo dài, phường Tây Thạnh, Thành phố Hồ Chí Minh';
const longDropoff =
  'Kho nhận hàng phía sau tòa nhà điều hành, đường Nguyễn Văn Linh, phường Tân Phong, Thành phố Hồ Chí Minh';

const origin = { id: 'pickup-1', label: longPickup } as const;
const destination = { id: 'dropoff-1', label: longDropoff } as const;
const stops = [
  { id: 'stop-1', label: 'Điểm dừng thứ nhất tại Quận 10' },
  { id: 'stop-2', label: 'Điểm dừng thứ hai tại Quận 3' },
  { id: 'stop-3', label: 'Điểm dừng thứ ba tại Quận 1' },
] as const;

describe('ScreenScaffold and SectionHeading', () => {
  it('keeps root as the single safe-area owner and lays out the sticky footer in flow', async () => {
    const screen = await render(
      <ScreenScaffold
        stickyFooter={<Button label="Nhận đơn" size="driver-primary" />}
        subtitle="Theo dõi công việc hiện tại và các ngoại lệ cần xử lý."
        title="Đơn của tài xế"
      >
        <Text>Nội dung chuyến</Text>
      </ScreenScaffold>,
    );
    const scaffold = screen.getByTestId('screen-scaffold');
    const content = screen.getByTestId('screen-scaffold-content');
    const footer = screen.getByTestId('screen-scaffold-sticky-footer');
    const pageTitle = screen.getByText('Đơn của tài xế');

    expect(SCREEN_SCAFFOLD_SAFE_AREA_OWNER).toBe('root');
    expect(StyleSheet.flatten(scaffold.props.style).paddingBottom).toBeUndefined();
    expect(layout.contentMaxWidth).toBe(768);
    expect(StyleSheet.flatten(content.props.style).maxWidth).toBe(768);
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({
      paddingBottom: spacing.md,
      position: 'relative',
    });
    expect(StyleSheet.flatten(pageTitle.props.style)).toMatchObject(typography.pageTitle);
    expect(pageTitle.props.accessibilityRole).toBe('header');
    expect(screen.getByRole('button').props.style).toBeTruthy();

    await screen.unmount();
  });

  it('renders a wrapping semantic section heading', async () => {
    const screen = await render(
      <SectionHeading
        description="Lộ trình đầy đủ gồm các điểm dừng theo đúng thứ tự đã được cung cấp."
        title="Lộ trình vận chuyển"
      />,
    );
    const heading = screen.getByText('Lộ trình vận chuyển');

    expect(heading.props.accessibilityRole).toBe('header');
    expect(heading.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(heading.props.style)).toMatchObject(typography.sectionTitle);

    await screen.unmount();
  });

  it('keeps optional scaffold and section copy absent without placeholder layout', async () => {
    const screen = await render(
      <ScreenScaffold title="Danh sách đơn">
        <SectionHeading title="Đơn có thể nhận" />
      </ScreenScaffold>,
    );

    expect(screen.queryByTestId('screen-scaffold-sticky-footer')).toBeNull();
    expect(screen.queryByText('Theo dõi công việc hiện tại')).toBeNull();
    expect(screen.getByText('Đơn có thể nhận')).toBeTruthy();

    await screen.unmount();
  });
});

describe('RouteSpine and RouteSummary', () => {
  it('renders a direct pickup-to-dropoff route without a fake stop', async () => {
    const screen = await render(
      <RouteSpine destination={destination} origin={origin} stops={[]} />,
    );

    expect(screen.getByLabelText(`Điểm lấy hàng: ${longPickup}`)).toBeTruthy();
    expect(screen.getByLabelText(`Điểm giao hàng: ${longDropoff}`)).toBeTruthy();
    expect(screen.queryByText(/Điểm dừng 1/)).toBeNull();

    await screen.unmount();
  });

  it('renders three stable ordered stops and allows long addresses to wrap', async () => {
    const screen = await render(
      <RouteSpine destination={destination} origin={origin} stops={stops} />,
    );
    const pickupAddress = screen.getByTestId('route-address-pickup-1');

    expect(screen.getByLabelText(`Điểm dừng 1 trong 3: ${stops[0].label}`)).toBeTruthy();
    expect(screen.getByLabelText(`Điểm dừng 2 trong 3: ${stops[1].label}`)).toBeTruthy();
    expect(screen.getByLabelText(`Điểm dừng 3 trong 3: ${stops[2].label}`)).toBeTruthy();
    expect(pickupAddress.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(pickupAddress.props.style).flexShrink).toBe(1);

    await screen.unmount();
  });

  it('keeps compact route labels and stop count visible', async () => {
    const screen = await render(
      <RouteSummary destination={destination} origin={origin} stops={stops} />,
    );

    expect(screen.getByText(longPickup)).toBeTruthy();
    expect(screen.getByText(longDropoff)).toBeTruthy();
    expect(screen.getByText('3 điểm dừng')).toBeTruthy();

    await screen.unmount();
  });
});

describe('OrderSummary', () => {
  it('renders canonical order context as one 44px navigation target', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <OrderSummary
        destination={destination}
        metadata={[
          { id: 'eta', label: 'ETA dự kiến', value: '18 phút' },
          { id: 'updated', label: 'Cập nhật', value: '14:32' },
        ]}
        onPress={onPress}
        orderReference="LP-240815-01"
        origin={origin}
        status="IN_TRANSIT"
        stops={stops}
      />,
    );
    const order = screen.getByRole('button');

    expect(screen.getByText('Đơn LP-240815-01')).toBeTruthy();
    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();
    expect(screen.getByText('ETA dự kiến')).toBeTruthy();
    expect(screen.getByText('18 phút')).toBeTruthy();
    expect(order.props.accessibilityHint).toBe('Mở chi tiết đơn');
    expect(StyleSheet.flatten(order.props.style).minHeight).toBe(44);
    await fireEvent.press(order);
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('remains readonly when no navigation callback or metadata is supplied', async () => {
    const screen = await render(
      <OrderSummary
        destination={destination}
        orderReference="LP-READONLY"
        origin={origin}
        status="REQUESTED"
        stops={[]}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Chờ tài xế')).toBeTruthy();
    expect(screen.queryByText('ETA dự kiến')).toBeNull();

    await screen.unmount();
  });
});

describe('StatusTimeline', () => {
  it('uses stable item ids and renders canonical status history', async () => {
    const entries = [
      { id: 'history-1', status: 'REQUESTED', timestampLabel: '14:00' },
      {
        description: 'Tài xế đã xác nhận nhận chuyến.',
        id: 'history-2',
        status: 'ACCEPTED',
        timestampLabel: '14:05',
      },
    ] as const;
    const screen = await render(<StatusTimeline entries={entries} />);

    expect(statusTimelineKeyExtractor(entries[0])).toBe('history-1');
    expect(screen.getByText('Chờ tài xế')).toBeTruthy();
    expect(screen.getByText('Đã nhận đơn')).toBeTruthy();
    expect(screen.getByText('14:05')).toBeTruthy();

    await screen.rerender(<StatusTimeline entries={[...entries]} />);
    expect(screen.getAllByText('Chờ tài xế')).toHaveLength(1);
    expect(screen.getAllByText('Đã nhận đơn')).toHaveLength(1);

    await screen.unmount();
  });

  it('uses ListEmptyComponent for an understandable empty history', async () => {
    const screen = await render(<StatusTimeline entries={[]} />);

    expect(screen.getByText('Chưa có lịch sử trạng thái.')).toBeTruthy();
    await screen.unmount();
  });
});

describe('PaymentSummary', () => {
  it('renders readonly payment fields and delegates an explicit action callback', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PaymentSummary
        action={{ label: 'Tạo mã QR thanh toán', onPress }}
        amountLabel="250.000 ₫"
        expiresAtLabel="15:00, 15/08/2026"
        referenceLabel="PAY-240815-01"
        sourceLabel="VietQR"
        status="QR_CREATED"
      />,
    );

    expect(screen.getByText('Đã tạo mã QR')).toBeTruthy();
    expect(screen.getByText('250.000 ₫')).toBeTruthy();
    expect(screen.getByText('PAY-240815-01')).toBeTruthy();
    expect(screen.getByText('VietQR')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders status-only payment context without inventing fields or actions', async () => {
    const screen = await render(<PaymentSummary status="UNPAID" />);

    expect(screen.getByText('Chưa thanh toán')).toBeTruthy();
    expect(screen.queryByText('Số tiền')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    await screen.unmount();
  });
});

describe('MapPanel', () => {
  it('exposes ready map content through one concise text alternative', async () => {
    const screen = await render(
      <MapPanel state="ready" summary="Bản đồ lộ trình từ điểm lấy đến điểm giao">
        <Text>Lớp bản đồ</Text>
      </MapPanel>,
    );

    expect(
      screen.getByLabelText('Bản đồ lộ trình từ điểm lấy đến điểm giao').props.accessibilityRole,
    ).toBe('image');
    expect(screen.getByText('Lớp bản đồ')).toBeTruthy();
    await screen.unmount();
  });

  it('keeps a 280px busy layout while map content is loading', async () => {
    const screen = await render(<MapPanel state="loading" summary="Bản đồ lộ trình đang tải" />);
    const panel = screen.getByTestId('map-panel');

    expect(layout.mapMinimumHeight).toBe(280);
    expect(StyleSheet.flatten(panel.props.style).minHeight).toBe(280);
    expect(panel.props.accessibilityState).toEqual({ busy: true });
    expect(panel.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByLabelText('Bản đồ lộ trình đang tải')).toBe(panel);
    expect(screen.getByText('Đang tải bản đồ')).toBeTruthy();

    await screen.unmount();
  });

  it('keeps stable fallback geometry and delegates retry safely', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <MapPanel
        fallbackMessage="Chưa thể hiển thị bản đồ. Hãy dùng lộ trình dạng danh sách."
        onRetry={onRetry}
        state="fallback"
        summary="Bản đồ lộ trình chưa khả dụng"
      />,
    );
    const panel = screen.getByTestId('map-panel');

    expect(StyleSheet.flatten(panel.props.style).minHeight).toBe(280);
    expect(screen.getByText('Bản đồ chưa khả dụng')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('retains last-known map context and timestamp when stale', async () => {
    const screen = await render(
      <MapPanel lastUpdatedLabel="14:27" state="stale" summary="Bản đồ vị trí gần nhất của tài xế">
        <Text>Vị trí cuối đã biết</Text>
      </MapPanel>,
    );
    const panel = screen.getByTestId('map-panel');

    expect(StyleSheet.flatten(panel.props.style).minHeight).toBe(280);
    expect(screen.getByText('Vị trí cuối đã biết')).toBeTruthy();
    expect(screen.getByText('Dữ liệu vị trí có thể đã cũ')).toBeTruthy();
    expect(screen.getByText('Cập nhật lần cuối: 14:27')).toBeTruthy();
    expect(panel.props.accessibilityLiveRegion).toBe('polite');

    await screen.unmount();
  });
});
