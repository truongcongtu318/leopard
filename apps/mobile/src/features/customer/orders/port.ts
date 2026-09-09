import type {
  AddressCandidate,
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderDetailDataView,
  CustomerOrderFilter,
  CustomerOrderIntent,
  CustomerTrackingView,
} from './model';

export type CustomerOrdersPort = Readonly<{
  getOrdersView: (filter: CustomerOrderFilter) => Promise<CustomerListView>;
  getCreateView: () => Promise<CustomerCreateView>;
  getOrderDetailView: (orderId: string) => Promise<CustomerDetailView>;
  searchAddress: (query: string) => Promise<readonly AddressCandidate[]>;
  estimateOrder: (form: CustomerCreateFormView) => Promise<CustomerCreateView>;
  createOrder: (form: CustomerCreateFormView, estimateToken: string) => Promise<CustomerDetailView>;
  executeIntent: (intent: CustomerOrderIntent) => Promise<CustomerDetailView>;
  createPaymentQr?: (orderId: string) => Promise<CustomerDetailView>;
  getTrackingHistory?: (
    orderId: string,
  ) => Promise<CustomerTrackingView | unknown>;
  reconcileTrackingHistory?: (
    orderId: string,
    currentView?: CustomerDetailView,
  ) => Promise<CustomerDetailView>;
  sendInvoiceEmail?: (invoiceId: string, orderId: string, email: string) => Promise<CustomerDetailView>;
  getInvoiceDownloadUrl?: (invoiceId: string) => Promise<string>;
}>;

export type CustomerMediaPickerPort = Readonly<{
  pickCargoImage: () => Promise<
    Readonly<{ name: string; mimeType: string; size: number; uri: string }> | null
  >;
  uploadCargoImage: (orderId: string) => Promise<CustomerOrderDetailDataView['media']>;
}>;
