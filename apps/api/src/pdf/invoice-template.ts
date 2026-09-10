// apps/api/src/pdf/invoice-template.ts
/**
 * Fixed "Bên bán" (seller) details for the self-issued invoice PDF. This is
 * a pilot-stage placeholder (user decision 2026-09-08) — not sourced from
 * env vars because it is not a secret and does not vary by deployment yet.
 * Update these constants directly when real company registration details
 * are available; do not thread them through InvoicePdfInput unless a future
 * requirement needs per-tenant sellers.
 */

export interface InvoiceSellerDetails {
  readonly companyName: string;
  readonly taxCode: string | null;
  readonly address: string | null;
}

export const INVOICE_SELLER: InvoiceSellerDetails = {
  companyName: 'Công ty TNHH Leopard Logistics',
  taxCode: null,
  address: null,
};
