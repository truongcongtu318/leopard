import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsWebhookController } from './payments-webhook.controller.js';
import { PaymentsService } from './payments.service.js';
import { PaymentWebhookService } from './payment-webhook.service.js';
import { PaymentsRepository } from './payments.repository.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { PaymentProvider, DemoPaymentProvider, PayOsPaymentProvider, VietQrPaymentProvider } from './payment.provider.js';

function buildPayOsProvider(source: NodeJS.ProcessEnv): PayOsPaymentProvider {
  return new PayOsPaymentProvider({
    clientId: source.PAYOS_CLIENT_ID ?? '',
    apiKey: source.PAYOS_API_KEY ?? '',
    checksumKey: source.PAYOS_CHECKSUM_KEY ?? '',
    returnUrl: source.PAYOS_RETURN_URL ?? 'https://leopard.vn/payment/return',
    cancelUrl: source.PAYOS_CANCEL_URL ?? 'https://leopard.vn/payment/cancel',
  });
}

@Module({
  imports: [DatabaseModule, AuthModule, OrdersModule, AuditModule, NotificationsModule, InvoicesModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [
    PaymentsRepository,
    PaymentsService,
    PaymentWebhookService,
    {
      provide: PayOsPaymentProvider,
      useFactory: (): PayOsPaymentProvider | null => {
        if ((process.env.PAYMENT_PROVIDER ?? 'demo').toLowerCase() !== 'payos') {
          return null;
        }
        return buildPayOsProvider(process.env);
      },
    },
    {
      provide: PaymentProvider,
      useFactory: (payOsProvider: PayOsPaymentProvider | null): PaymentProvider => {
        const provider = (process.env.PAYMENT_PROVIDER ?? 'demo').toLowerCase();
        if (provider === 'payos' && payOsProvider) {
          return payOsProvider;
        } else if (provider === 'vietqr') {
          return new VietQrPaymentProvider();
        }
        return new DemoPaymentProvider();
      },
      inject: [PayOsPaymentProvider],
    },
  ],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
