import type { Metadata } from 'next';

import { WithdrawalsScreen } from '../../../../features/admin/WithdrawalsScreen';

export const metadata: Metadata = {
  title: 'Yêu cầu rút tiền — LEOPARD Operations',
};

export default function AdminWithdrawalsPage() {
  return <WithdrawalsScreen />;
}
