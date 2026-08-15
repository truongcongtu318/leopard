export type MobilePreviewMode = 'fixtures' | 'runtime';

export type MobilePreviewModeInput = Readonly<{
  environment: string | undefined;
  localPreviewEnabled: boolean;
}>;

export function resolveMobilePreviewMode({
  environment,
  localPreviewEnabled,
}: MobilePreviewModeInput): MobilePreviewMode {
  const isLocalEnvironment = environment === 'development' || environment === 'test';

  return localPreviewEnabled && isLocalEnvironment ? 'fixtures' : 'runtime';
}
