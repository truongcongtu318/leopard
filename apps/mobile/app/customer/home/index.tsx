import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { sessionStore } from '../../../src/auth/session-store';
import { addressStore, type SavedAddress } from '../../../src/features/customer/addresses/address-store';
import { HomeDashboardScreen } from '../../../src/features/home/HomeDashboardScreen';

export default function CustomerHomePage() {
  const router = useRouter();
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);

  const [customerUser, setCustomerUser] = useState<{ name?: string; phone?: string } | null>(null);

  // Sync address when screen is active
  useEffect(() => {
    let mounted = true;
    async function loadDefaultAddress() {
      const addr = await addressStore.getDefaultAddress();
      if (mounted && addr) {
        setDefaultAddress(addr);
      }
    }
    void loadDefaultAddress();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync authenticated user info from /me
  useEffect(() => {
    let mounted = true;
    async function loadCustomerUser() {
      try {
        if (sessionStore.isAuthenticated()) {
          const { httpClient } = require('../../../src/api/http-client');
          const user = await httpClient.get('/me');
          if (mounted && user) {
            setCustomerUser({
              name: user.name || undefined,
              phone: user.phone || undefined,
            });
          }
        }
      } catch {
        // Silently ignore if unauthenticated or network unavailable
      }
    }
    void loadCustomerUser();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSwitchRole = async (targetRole: 'CUSTOMER' | 'DRIVER') => {
    await sessionStore.setSession('preview-acc-token', 'preview-ref-token', targetRole);
    if (targetRole === 'DRIVER') {
      router.replace('/driver/orders');
    } else {
      router.replace('/customer/home');
    }
  };

  return (
    <HomeDashboardScreen
      defaultPickupLabel={defaultAddress?.label}
      defaultPickupLocation={defaultAddress?.address}
      userName={customerUser?.name}
      userPhone={customerUser?.phone}
      onCreateOrder={() => router.push('/customer/orders/new')}
      onNavigateTab={(tab) => {
        switch (tab) {
          case 'orders':
            router.push('/customer/orders');
            break;
          case 'tracking':
            router.push('/customer/deliveries');
            break;
          case 'account':
            router.push('/customer/profile');
            break;
          default:
            break;
        }
      }}
      onOpenActiveOrder={() => router.push('/customer/tracking')}
      onOpenNotifications={() => router.push('/customer/notifications')}
      onOpenOrder={(orderId) => router.push(`/customer/orders/${orderId}`)}
      onOpenProfile={() => router.push('/customer/profile')}
      onOpenQrScan={() => router.push('/customer/wallet')}
      onOpenSavedAddresses={() => router.push('/(public)/customer-address')}
      onQuickBook={(pickup, dropoff) =>
        router.push({
          pathname: '/customer/orders/new',
          params: { pickup, dropoff },
        })
      }
      onRegisterDriver={() => router.push('/(public)/driver-register')}
      onSelectVehicleAndBook={() => router.push('/customer/orders/new')}
      onSwitchRole={handleSwitchRole}
      onTopUpWallet={() => router.push('/customer/wallet')}
      onViewAllOrders={() => router.push('/customer/orders')}
    />
  );
}
