import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Mock expo-router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  const MockQRCode = (props: any) => <View testID="qr-code" {...props} />;
  return {
    __esModule: true,
    default: MockQRCode,
    QRCode: MockQRCode,
  };
});

import CustomerDeliveriesScreen from '../../../app/customer/deliveries';
import { OrderChatScreen } from './chat/OrderChatScreen';
import { OrderReviewScreen } from './review/OrderReviewScreen';
import { ReportIssueScreen } from './report/ReportIssueScreen';

describe('Customer Delivery, Chat, Review & Report Screens (Task 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CustomerDeliveriesScreen (Màn 14 - Bảng điều phối chuyến xe)', () => {
    it('renders header, search bar, filter pills, and active shipment cards', async () => {
      const screen = await render(<CustomerDeliveriesScreen />);

      expect(screen.getByText('Bảng điều phối chuyến xe')).toBeTruthy();
      expect(screen.getByPlaceholderText('Tìm theo mã đơn, biển số, điểm giao...')).toBeTruthy();
      expect(screen.getByText('Tất cả')).toBeTruthy();
      expect(screen.getAllByText('Đang giao').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đã giao').length).toBeGreaterThanOrEqual(1);

      // Renders active shipment cards
      expect(screen.getByText('#LP-260815-001')).toBeTruthy();
      expect(screen.getByText('59C-882.14')).toBeTruthy();
      expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
      expect(screen.getByText(/ETA dự kiến: 14 phút · Còn 3.8 km/)).toBeTruthy();

      await screen.unmount();
    });

    it('filters shipment cards by status and search keyword', async () => {
      const screen = await render(<CustomerDeliveriesScreen />);

      // Filter by "Đã giao"
      const deliveredPill = screen.getByLabelText('Chuyến đã giao');
      await fireEvent.press(deliveredPill);

      expect(screen.queryByText('#LP-260815-001')).toBeNull();
      expect(screen.getByText('#LP-260815-003')).toBeTruthy();
      expect(screen.getByText('50H-192.65')).toBeTruthy();

      // Search keyword
      const searchInput = screen.getByPlaceholderText('Tìm theo mã đơn, biển số, điểm giao...');
      await fireEvent.changeText(searchInput, 'Landmark 81');

      // None delivered match Landmark 81
      expect(screen.getByText('Không tìm thấy chuyến xe')).toBeTruthy();

      await screen.unmount();
    });

    it('jumps 1-tap to tracking or chat', async () => {
      const screen = await render(<CustomerDeliveriesScreen />);

      const trackingBtn = screen.getByLabelText('Theo dõi trực tiếp đơn #LP-260815-001');
      await fireEvent.press(trackingBtn);
      expect(mockPush).toHaveBeenCalledWith('/customer/tracking');

      const chatBtn = screen.getByLabelText('Nhắn tin tài xế đơn #LP-260815-001');
      await fireEvent.press(chatBtn);
      expect(mockPush).toHaveBeenCalledWith('/customer/chat/LP-D-260815-001');

      await screen.unmount();
    });
  });

  describe('OrderChatScreen (Màn 13 - Trò chuyện trong chuyến)', () => {
    it('renders driver info, call button, message bubbles, and quick reply chips', async () => {
      const screen = await render(<OrderChatScreen />);

      expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
      expect(screen.getByText('59C-882.14')).toBeTruthy();
      expect(screen.getByLabelText('Gọi điện tài xế')).toBeTruthy();

      // Message bubbles
      expect(screen.getByText(/Chào bạn, mình đang trên đường qua kho/)).toBeTruthy();
      expect(screen.getByText(/Dạ vâng, hàng đã đóng gói sẵn/)).toBeTruthy();

      // Quick suggestions
      expect(screen.getByText('Tôi đã đến điểm bốc')).toBeTruthy();
      expect(screen.getByText('Hàng đã sẵn sàng')).toBeTruthy();
      expect(screen.getByText('Vui lòng gọi khi đến')).toBeTruthy();

      await screen.unmount();
    });

    it('sends a quick suggestion message on press', async () => {
      const screen = await render(<OrderChatScreen />);

      const quickChip = screen.getByLabelText('Gợi ý tin nhắn: Tôi đã đến điểm bốc');
      await fireEvent.press(quickChip);

      expect(screen.getAllByText('Tôi đã đến điểm bốc').length).toBeGreaterThanOrEqual(1);

      await screen.unmount();
    });

    it('sends a typed message via the input bar', async () => {
      const screen = await render(<OrderChatScreen />);

      const input = screen.getByLabelText('Nhập tin nhắn trao đổi');
      await fireEvent.changeText(input, 'Bác tài đi cẩn thận nhé!');

      const sendBtn = screen.getByLabelText('Gửi tin nhắn');
      await fireEvent.press(sendBtn);

      expect(screen.getByText('Bác tài đi cẩn thận nhé!')).toBeTruthy();

      await screen.unmount();
    });
  });

  describe('OrderReviewScreen (Màn 16 - Đánh giá chuyến đi)', () => {
    it('renders 1-5 star rating without emoji, quick tags, and tip options', async () => {
      const screen = await render(<OrderReviewScreen />);

      expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
      expect(screen.getByText('Xe tải 2.5T · 59C-882.14')).toBeTruthy();

      // 5 star buttons
      expect(screen.getByLabelText('Đánh giá 5 sao')).toBeTruthy();
      expect(screen.getByLabelText('Đánh giá 4 sao')).toBeTruthy();
      expect(screen.getByText('Tuyệt vời!')).toBeTruthy();

      // Quick tags
      expect(screen.getByText('Đúng giờ')).toBeTruthy();
      expect(screen.getByText('Cẩn thận')).toBeTruthy();
      expect(screen.getByText('Thân thiện')).toBeTruthy();
      expect(screen.getByText('Lái xe an toàn')).toBeTruthy();

      // Tip options
      expect(screen.getByText('+10.000 đ')).toBeTruthy();
      expect(screen.getByText('+20.000 đ')).toBeTruthy();
      expect(screen.getByText('+50.000 đ')).toBeTruthy();

      await screen.unmount();
    });

    it('allows changing rating and submitting review with success feedback', async () => {
      const screen = await render(<OrderReviewScreen />);

      // Change rating to 4 stars
      const star4 = screen.getByLabelText('Đánh giá 4 sao');
      await fireEvent.press(star4);
      expect(screen.getByText('Rất tốt')).toBeTruthy();

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Gửi đánh giá/ });
      await fireEvent.press(submitBtn);

      expect(screen.getByText('Cảm ơn bạn đã đánh giá!')).toBeTruthy();

      await screen.unmount();
    });
  });

  describe('ReportIssueScreen (Màn 17 - Báo cáo sự cố)', () => {
    it('renders category selector, photo upload box without emoji, and submit button', async () => {
      const screen = await render(<ReportIssueScreen />);

      expect(screen.getByText('Hàng vỡ hỏng')).toBeTruthy();
      expect(screen.getByText('Giao trễ')).toBeTruthy();
      expect(screen.getByText('Tài xế không liên lạc được')).toBeTruthy();
      expect(screen.getByText('Sai cước phí')).toBeTruthy();

      expect(screen.getByLabelText('Đính kèm ảnh minh chứng sự cố')).toBeTruthy();
      expect(screen.getByText('Tải lên hình ảnh kiện hàng bị sự cố')).toBeTruthy();

      await screen.unmount();
    });

    it('submits report when description is filled and shows confirmation', async () => {
      const screen = await render(<ReportIssueScreen />);

      // Select category
      const lateCat = screen.getByLabelText('Loại sự cố: Giao trễ');
      await fireEvent.press(lateCat);

      // Fill description
      const descInput = screen.getByPlaceholderText('Vui lòng mô tả chi tiết hoàn cảnh, thời gian và mức độ thiệt hại...');
      await fireEvent.changeText(descInput, 'Xe giao trễ hơn 2 tiếng làm lỡ ca thi công.');

      // Toggle photo
      const photoBtn = screen.getByLabelText('Đính kèm ảnh minh chứng sự cố');
      await fireEvent.press(photoBtn);
      expect(screen.getByText('Đã đính kèm ảnh minh chứng (Bấm để đổi ảnh)')).toBeTruthy();

      // Submit
      const submitBtn = screen.getByRole('button', { name: 'Gửi báo cáo sự cố' });
      await fireEvent.press(submitBtn);

      expect(screen.getByText('Đã tiếp nhận sự cố')).toBeTruthy();
      expect(screen.getByText('#TK-260815')).toBeTruthy();

      await screen.unmount();
    });
  });
});
