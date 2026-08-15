import type {
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerDetailView,
  CustomerListView,
  CustomerOrderFilter,
  CustomerOrderIntent,
} from './model';

export type CustomerOrdersPort = Readonly<{
  getOrdersView: (filter: CustomerOrderFilter) => Promise<CustomerListView>;
  getCreateView: () => Promise<CustomerCreateView>;
  getOrderDetailView: (orderId: string) => Promise<CustomerDetailView>;
  estimateOrder: (form: CustomerCreateFormView) => Promise<CustomerCreateView>;
  createOrder: (form: CustomerCreateFormView) => Promise<CustomerDetailView>;
  executeIntent: (intent: CustomerOrderIntent) => Promise<CustomerDetailView>;
}>;

export type CustomerMediaPickerPort = Readonly<{
  pickCargoImage: () => Promise<Readonly<{ name: string; mimeType: string; size: number }>>;
}>;

// Wave 3 will provide adapters. Wave 4 components only depend on these ports/callbacks.
