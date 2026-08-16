import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsRepository } from './payments.repository.js';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { PaymentProvider, DemoPaymentProvider, PayOsPaymentProvider, VietQrPaymentProvider } from './payment.provider.js';

@Module({
  imports: [DatabaseModule, AuthModule, OrdersModule, AuditModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsRepository,
    PaymentsService,
    {
      provide: PaymentProvider,
      useFactory: () => {
        const provider = (process.env.PAYMENT_PROVIDER ?? 'demo').toLowerCase();
        if (provider === 'payos') {
          return new PayOsPaymentProvider();
        } else if (provider === 'vietqr') {
          return new VietQrPaymentProvider();
        }
        return new DemoPaymentProvider();
      },
    },
  ],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
