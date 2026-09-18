import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { PayOsPaymentProvider } from './payment.provider.js';
import { PaymentsRepository } from './payments.repository.js';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    @Optional() @Inject(PayOsPaymentProvider) private readonly payOsProvider: PayOsPaymentProvider | null,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async handlePayosWebhook(rawBody: unknown): Promise<void> {
    if (!this.payOsProvider) {
      this.logger.warn('Received a payOS webhook while PAYMENT_PROVIDER is not payos; ignoring');
      return;
    }

    let verified;
    try {
      verified = await this.payOsProvider.verifyWebhook(rawBody);
    } catch (error) {
      this.logger.warn(`Rejected payOS webhook: invalid signature (${(error as Error).message})`);
      throw new BadRequestException('Invalid webhook signature');
    }

    const orderCodeBigInt = BigInt(verified.orderCode);
    const intent = await this.paymentsRepo.findByPayosOrderCode(orderCodeBigInt);
    if (!intent) {
      // Check if this webhook corresponds to a DriverDeposit
      const deposit = await this.prisma.driverDeposit.findUnique({
        where: { payosOrderCode: orderCodeBigInt },
      });

      if (deposit) {
        if (deposit.status === 'COMPLETED') return; // already processed

        if (deposit.amountVnd !== verified.amount) {
          this.logger.error(
            `payOS webhook amount mismatch for DriverDeposit ${deposit.id}: expected ${deposit.amountVnd}, got ${verified.amount}`,
          );
          return;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.driverDeposit.update({
            where: { id: deposit.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });

          await this.auditService.append(
            {
              actorId: deposit.driverId,
              action: 'DRIVER_DEPOSIT_COMPLETED',
              resourceType: 'DriverDeposit',
              resourceId: deposit.id,
              idempotencyRequestId: `payos-webhook-deposit-${verified.orderCode}`,
              metadata: {
                paymentLinkId: verified.paymentLinkId,
                transactionReference: verified.reference,
                amountVnd: verified.amount,
              },
            },
            tx,
          );
        });

        this.logger.log(`Driver deposit ${deposit.id} completed successfully for driver ${deposit.driverId}`);
        return;
      }

      this.logger.error(`payOS webhook orderCode ${verified.orderCode} matches neither PaymentIntent nor DriverDeposit`);
      return;
    }

    if (intent.status === 'PAID_MANUAL') {
      return; // already processed — idempotent no-op, matches Điều 6 of the design doc
    }

    if (intent.amountVnd !== verified.amount) {
      this.logger.error(
        `payOS webhook amount mismatch for PaymentIntent ${intent.id}: expected ${intent.amountVnd}, got ${verified.amount}`,
      );
      return;
    }

    const paidAt = new Date(verified.transactionDateTime.replace(' ', 'T'));

    await this.prisma.$transaction(async (tx) => {
      await this.paymentsRepo.updateStatus(
        intent.id,
        {
          status: 'PAID_MANUAL',
          providerReference: verified.reference,
          confirmedAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
          confirmationNote: 'Xác nhận tự động qua webhook payOS',
        },
        tx,
      );

      await this.auditService.append(
        {
          actorId: null,
          action: 'CONFIRM_PAYMENT_WEBHOOK',
          resourceType: 'PaymentIntent',
          resourceId: intent.id,
          idempotencyRequestId: `payos-webhook-${verified.orderCode}`,
          metadata: { paymentLinkId: verified.paymentLinkId, transactionReference: verified.reference },
        },
        tx,
      );
    });
  }
}
