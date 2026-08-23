export type ProfileContentView = Readonly<{
  scenarioId: string;
  kind: 'content';
  phone: string;
  roleLabel: string;
  statusLabel: string;
  statusTone: 'active' | 'danger';
  appVersion: string;
  isLoggingOut: boolean;
}>;

export type ProfileBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'error' | 'session-expired';
  title: string;
  message: string;
}>;

export type DriverProfileView = ProfileContentView | ProfileBoundaryView;
