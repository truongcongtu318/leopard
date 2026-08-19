import type {
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderFilter,
  CustomerOrderIntent,
  CustomerPaymentView,
  CustomerTrackingView,
} from './model';

export type CustomerOrdersPort = Readonly<{
  getOrdersView: (filter: CustomerOrderFilter) => Promise<CustomerListView>;
  getCreateView: () => Promise<CustomerCreateView>;
  getOrderDetailView: (orderId: string) => Promise<CustomerDetailView>;
  estimateOrder: (form: CustomerCreateFormView) => Promise<CustomerCreateView>;
  createOrder: (form: CustomerCreateFormView) => Promise<CustomerDetailView>;
  executeIntent: (intent: CustomerOrderIntent) => Promise<CustomerDetailView>;
  createPaymentQr?: (
    orderId: string,
    amountVnd?: number,
  ) => Promise<CustomerDetailView>;
  getPaymentStatus?: (paymentId: string) => Promise<CustomerPaymentView>;
  getTrackingHistory?: (
    orderId: string,
  ) => Promise<CustomerTrackingView | unknown>;
  reconcileTrackingHistory?: (
    orderId: string,
    currentView?: CustomerDetailView,
  ) => Promise<CustomerDetailView>;
}>;

export type CustomerMediaPickerPort = Readonly<{
  pickCargoImage: () => Promise<
    Readonly<{ name: string; mimeType: string; size: number }>
  >;
}>;
