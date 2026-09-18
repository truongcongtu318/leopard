import type {
  RouteEtaResponse,
  StopProgressCommandResponse,
} from '@leopard/shared';
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
  getRouteEta?: (orderId: string) => Promise<RouteEtaResponse>;
  recordStopProgress?: (
    orderId: string,
    stopId: string,
    payload: { step: string; clientRequestId: string; occurredAt?: string },
  ) => Promise<StopProgressCommandResponse>;
  setAvailability: (commandId: string) => Promise<DriverAvailabilityView>;
  acceptOrder: (commandId: string) => Promise<DriverDetailView>;
  executeLifecycle: (commandId: string) => Promise<DriverDetailView>;
  reportIncident?: (
    orderId: string,
    payload: { reason: string; note?: string; evidenceMediaId?: string },
  ) => Promise<DriverDetailView>;
  confirmCashPayment?: (
    orderId: string,
    clientRequestId?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  declineOrder?: (orderId: string) => Promise<void>;
}>;

export type DriverTrackingPort = Readonly<{
  observeHealth: (
    orderId: string,
    onChange: (health: DriverTrackingView) => void,
  ) => Readonly<{ unsubscribe: () => void }>;
  retryConnection: (orderId: string) => Promise<DriverTrackingView>;
  openForegroundLocationSettings: () => Promise<void>;
}>;

export type ProofFileInput = Readonly<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file?: File | Blob;
}>;

export type DriverProofPort = Readonly<{
  selectProof: () => Promise<Readonly<{ name: string; mimeType: string; size: number }> | null>;
  /**
   * Uploads a proof file the caller already captured. Passing the file in keeps
   * the upload from opening a picker of its own, which previously made the
   * driver choose a second image after already taking one.
   */
  uploadProof: (commandId: string, file?: ProofFileInput) => Promise<DriverProofView>;
}>;

// Wave 4 leaves every network, Socket, picker, and location implementation outside UI files.
