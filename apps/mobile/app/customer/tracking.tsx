import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { RealtimeTrackingScreen } from '../../src/features/tracking/RealtimeTrackingScreen';

// Demo data for the Realtime Tracking screen
const demoDriver = {
  name: 'Nguyễn Văn Hùng',
  rating: 4.8,
  totalTrips: 342,
  phone: '0901234567',
  vehiclePlate: '59C-882.14',
  vehicleType: 'Xe Tải Nặng',
  vehicleCapacity: '5 Tấn',
};

const demoTrip = {
  bookingCode: '#LP-00201',
  origin: 'Kho VLXD Tân Bình',
  destination: 'KCN Tân Tạo, Bình Tân',
  cargoLabel: 'Xi Măng Hà Tiên',
  weightKg: 3000,
  priceVnd: '850.000 ₫',
  distanceTotalKm: 12.5,
  distanceRemainingKm: 1.5,
  etaMinutes: 10,
  etaLabel: '10 phút',
  status: 'IN_TRANSIT' as const,
  hasDeliveryProof: false,
};

export default function CustomerTrackingPage() {
  const router = useRouter();

  return (
    <RealtimeTrackingScreen
      driver={demoDriver}
      onBack={() => router.back()}
      onCallDriver={() => {
        void Linking.openURL(`tel:${demoDriver.phone}`);
      }}
      onChatDriver={() => {
        router.push('/customer/chat');
      }}
      onShowVietQR={() => {
        router.push('/customer/wallet');
      }}
      trip={demoTrip}
    />
  );
}
