export const MOBILE_PREVIEW_ENABLED_FLAG = 'enabled' as const;

export type MobilePreviewMode = 'fixtures' | 'runtime';

export type MobilePreviewModeInput = Readonly<{
  environment: string | undefined;
  buildPreviewFlag: string | undefined;
  localPreviewEnabled: boolean;
}>;

export function resolveMobilePreviewMode({
  environment,
  buildPreviewFlag,
  localPreviewEnabled,
}: MobilePreviewModeInput): MobilePreviewMode {
  const isLocalEnvironment = environment === 'development' || environment === 'test';
  const isBuildEnabled = buildPreviewFlag === MOBILE_PREVIEW_ENABLED_FLAG;

  return localPreviewEnabled && isBuildEnabled && isLocalEnvironment ? 'fixtures' : 'runtime';
}
