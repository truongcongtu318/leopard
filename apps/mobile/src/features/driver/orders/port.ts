import type {
  DriverAvailabilityView,
  DriverDetailView,
  DriverListView,
  DriverProofView,
  DriverTrackingView,
} from './model';

export type DriverOrdersPort = Readonly<{
  getOrdersView: () => Promise<DriverListView>;
  getOrderDetailView: (orderId: string) => Promise<DriverDetailView>;
  setAvailability: (commandId: string) => Promise<DriverAvailabilityView>;
  acceptOrder: (commandId: string) => Promise<DriverDetailView>;
  executeLifecycle: (commandId: string) => Promise<DriverDetailView>;
}>;

export type DriverTrackingPort = Readonly<{
  observeHealth: (
    orderId: string,
    onChange: (health: DriverTrackingView) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
  retryConnection: (orderId: string) => Promise<DriverTrackingView>;
  openForegroundLocationSettings: () => Promise<void>;
}>;

export type DriverProofPort = Readonly<{
  selectProof: () => Promise<Readonly<{ name: string; mimeType: string; size: number }> | null>;
  uploadProof: (commandId: string) => Promise<DriverProofView>;
}>;

// Wave 4 leaves every network, Socket, picker, and location implementation outside UI files.
