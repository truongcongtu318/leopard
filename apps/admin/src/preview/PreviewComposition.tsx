import type { ReactNode } from "react";

import { PreviewBanner } from "./PreviewBanner";
import type {
  PreviewFixtureValue,
  WebPreviewSelection,
  WebUiScenario,
} from "./scenario";

export type WebPreviewCompositionProps<
  TData extends PreviewFixtureValue = PreviewFixtureValue,
> = Readonly<{
  selection: WebPreviewSelection<TData>;
  renderRuntime: () => ReactNode;
  renderFixture: (scenario: WebUiScenario<TData>) => ReactNode;
}>;

export function WebPreviewComposition<
  TData extends PreviewFixtureValue = PreviewFixtureValue,
>({
  selection,
  renderRuntime,
  renderFixture,
}: WebPreviewCompositionProps<TData>) {
  if (!selection.enabled) {
    return <>{renderRuntime()}</>;
  }

  return (
    <section
      aria-label="Bản xem trước giao diện"
      className="flex flex-col gap-md"
    >
      <PreviewBanner />
      {renderFixture(selection.scenario)}
    </section>
  );
}
