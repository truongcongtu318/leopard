export interface InvoiceIssuanceResult {
  readonly invoiceId: string;
  /** True when the invoice was issued but has no email on file to notify. */
  readonly needsEmailPrompt: boolean;
}

/**
 * Narrow port `PaymentsModule` depends on instead of importing invoice
 * controller/service code directly — mirrors how other cross-module
 * integrations in this codebase (e.g. `NotificationTriggers`) are injected
 * as a single-purpose abstract class rather than a whole feature module's
 * surface.
 */
export abstract class InvoiceIssuancePort {
  /**
   * Best-effort: implementations must never throw. Returns `null` when
   * issuance failed (already logged internally) so the caller does not
   * additionally trigger a missing-email notification for an invoice that
   * doesn't exist yet.
   */
  abstract ensureInvoiceForPayment(
    orderId: string,
    paymentIntentId: string,
  ): Promise<InvoiceIssuanceResult | null>;
}
