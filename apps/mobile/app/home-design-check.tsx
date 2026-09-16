import { Text, View } from 'react-native';
import { customerPalette } from '@leopard/mobile-core';
import { HomeDashboardScreen } from '../src/features/home/HomeDashboardScreen';

// Temporary local visual check. No runtime adapters or authenticated data.
export default function HomeDesignCheck() {
  if (!__DEV__) return null;
  return <View style={{ flex: 1 }}>
    <Text style={{ textAlign: 'center', backgroundColor: customerPalette.primaryBg, color: customerPalette.primaryText, fontSize: 11 }}>Bản xem trước · Dữ liệu mô phỏng</Text>
    <HomeDashboardScreen savedAddresses={[]} activeShipment={null} recentOrders={[]} onOpenNotifications={() => {}} />
  </View>;
}
