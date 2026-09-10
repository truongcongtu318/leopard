import { Text, View } from 'react-native';
import { HomeDashboardScreen } from '../src/features/home/HomeDashboardScreen';

// Temporary local visual check. No runtime adapters or authenticated data.
export default function HomeDesignCheck() {
  if (!__DEV__) return null;
  return <View style={{ flex: 1 }}>
    <Text style={{ textAlign: 'center', backgroundColor: '#FFF0DB', color: '#0B2347', fontSize: 11 }}>Bản xem trước · Dữ liệu mô phỏng</Text>
    <HomeDashboardScreen savedAddresses={[]} activeShipment={null} recentOrders={[]} onOpenNotifications={() => {}} />
  </View>;
}
