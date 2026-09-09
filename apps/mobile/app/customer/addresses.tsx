import { useRouter } from 'expo-router';
import { AddressBookScreen } from '../../src/features/customer/addresses/AddressBookScreen';

export default function CustomerAddressesRoute() {
  const router = useRouter();
  return (
    <AddressBookScreen
      onBack={() => router.back()}
      onOpenAddAddress={() => router.push('/(public)/customer-address')}
    />
  );
}
