import { useRouter } from 'expo-router';

import { type DeliveryOrder, MyDeliveriesScreen } from '../../src/features/deliveries/MyDeliveriesScreen';

// Demo data for the redesigned My Deliveries screen
const demoOrders: DeliveryOrder[] = [
  {
    id: 'ord-demo-1',
    bookingCode: '#LP-00201',
    cargoType: 'CEMENT_STEEL',
    cargoLabel: '3 tấn Xi Măng Hà Tiên',
    origin: 'Kho VLXD Tân Bình',
    destination: 'KCN Tân Tạo, Bình Tân',
    scheduledDate: '31/08/2026 • 08:30',
    status: 'IN_TRANSIT',
    vehicleName: 'Xe Tải 5T',
    weightKg: 3000,
    priceVnd: '850.000 ₫',
  },
  {
    id: 'ord-demo-2',
    bookingCode: '#LP-00198',
    cargoType: 'FURNITURE',
    cargoLabel: 'Bàn ghế văn phòng (15 bộ)',
    origin: 'Quận 1, TP.HCM',
    destination: 'Quận 7, TP.HCM',
    scheduledDate: '30/08/2026 • 14:00',
    status: 'DELIVERED',
    vehicleName: 'Xe Van 1.5T',
    weightKg: 800,
    priceVnd: '320.000 ₫',
  },
  {
    id: 'ord-demo-3',
    bookingCode: '#LP-00205',
    cargoType: 'BA_GAC_MISC',
    cargoLabel: 'Gạch ốp lát (50 thùng)',
    origin: 'Chợ Bình Tây',
    destination: 'Quận Gò Vấp',
    scheduledDate: '01/09/2026 • 07:00',
    status: 'LOADING',
    vehicleName: 'Xe Ba Gác',
    weightKg: 450,
    priceVnd: '180.000 ₫',
  },
  {
    id: 'ord-demo-4',
    bookingCode: '#LP-00192',
    cargoType: 'PRODUCE',
    cargoLabel: '2 tấn Gạo ST25 Sóc Trăng',
    origin: 'Kho Nông sản Thủ Đức',
    destination: 'Chợ đầu mối Bình Điền',
    scheduledDate: '29/08/2026 • 05:00',
    status: 'DELIVERED',
    vehicleName: 'Xe Tải 3T',
    weightKg: 2000,
    priceVnd: '450.000 ₫',
  },
  {
    id: 'ord-demo-5',
    bookingCode: '#LP-00210',
    cargoType: 'GENERAL',
    cargoLabel: 'Thiết bị máy lạnh (8 cụm)',
    origin: 'KCN Tân Thuận, Q7',
    destination: 'Thủ Dầu Một, Bình Dương',
    scheduledDate: '02/09/2026 • 09:00',
    status: 'REQUESTED',
    vehicleName: 'Xe Tải 5T',
    weightKg: 1200,
    priceVnd: '720.000 ₫',
  },
];

export default function CustomerDeliveriesPage() {
  const router = useRouter();

  return (
    <MyDeliveriesScreen
      onCreateOrder={() => router.push('/customer/orders/new')}
      onOrderPress={() => router.push('/customer/tracking')}
      orders={demoOrders}
    />
  );
}
