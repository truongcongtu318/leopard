import { Redirect } from 'expo-router';

/**
 * Legacy route: /customer/deliveries
 * Now merged into /customer/orders — redirect for backward compatibility.
 */
export default function CustomerDeliveriesRedirect() {
  return <Redirect href="/customer/orders" />;
}
