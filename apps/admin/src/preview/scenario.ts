export const WEB_UI_SCENARIO_NAMES = Object.freeze([
  "loading",
  "empty",
  "error",
  "success",
  "permission-denied",
] as const);

export type WebUiScenarioName = (typeof WEB_UI_SCENARIO_NAMES)[number];

export type PreviewFixtureValue =
  | null
  | boolean
  | number
  | string
  | readonly PreviewFixtureValue[]
  | { readonly [key: string]: PreviewFixtureValue };

export interface WebUiScenarioCopy {
  readonly title: string;
  readonly description: string;
}

interface WebUiScenarioBase<TKind extends WebUiScenarioName> {
  readonly kind: TKind;
  readonly copy: WebUiScenarioCopy;
}

export type LoadingWebUiScenario = WebUiScenarioBase<"loading">;
export type EmptyWebUiScenario = WebUiScenarioBase<"empty">;

export interface ErrorWebUiScenario extends WebUiScenarioBase<"error"> {
  readonly errorCode: "SERVICE_NOT_READY";
}

export interface PermissionDeniedWebUiScenario
  extends WebUiScenarioBase<"permission-denied"> {
  readonly errorCode: "FORBIDDEN";
}

export interface SuccessWebUiScenario<TData extends PreviewFixtureValue>
  extends WebUiScenarioBase<"success"> {
  readonly data: TData;
}

export type NonSuccessWebUiScenario =
  | LoadingWebUiScenario
  | EmptyWebUiScenario
  | ErrorWebUiScenario
  | PermissionDeniedWebUiScenario;

export type WebUiScenario<
  TData extends PreviewFixtureValue = PreviewFixtureValue,
> = NonSuccessWebUiScenario | SuccessWebUiScenario<TData>;

const SCENARIO_COPY = {
  loading: {
    title: "Đang tải dữ liệu",
    description: "Vui lòng chờ trong khi dữ liệu được chuẩn bị.",
  },
  empty: {
    title: "Chưa có dữ liệu",
    description: "Không có dữ liệu phù hợp với phạm vi hiện tại.",
  },
  error: {
    title: "Không thể tải dữ liệu",
    description: "Hệ thống tạm thời chưa sẵn sàng. Vui lòng thử lại.",
  },
  success: {
    title: "Dữ liệu đã sẵn sàng",
    description: "Nội dung mô phỏng đã được tải thành công.",
  },
  "permission-denied": {
    title: "Không có quyền truy cập",
    description: "Tài khoản hiện tại không được phép xem nội dung này.",
  },
} as const satisfies Record<WebUiScenarioName, WebUiScenarioCopy>;

function cloneFixtureValue<TValue extends PreviewFixtureValue>(
  value: TValue,
): TValue {
  if (Array.isArray(value)) {
    const clonedItems = value.map((item) => cloneFixtureValue(item));
    return Object.freeze(clonedItems) as TValue;
  }

  if (value !== null && typeof value === "object") {
    const clonedEntries = Object.entries(value).map(([key, item]) => [
      key,
      cloneFixtureValue(item),
    ]);
    return Object.freeze(Object.fromEntries(clonedEntries)) as TValue;
  }

  return value;
}

export function createImmutableFixture<TFixture extends PreviewFixtureValue>(
  source: TFixture,
): TFixture {
  return cloneFixtureValue(source);
}

export function createWebUiScenario<TData extends PreviewFixtureValue>(
  kind: "success",
  data: TData,
): SuccessWebUiScenario<TData>;
export function createWebUiScenario(
  kind: Exclude<WebUiScenarioName, "success">,
): NonSuccessWebUiScenario;
export function createWebUiScenario<TData extends PreviewFixtureValue>(
  kind: WebUiScenarioName,
  data?: TData,
): WebUiScenario<TData> {
  switch (kind) {
    case "success": {
      if (data === undefined) {
        throw new TypeError("A success preview scenario requires fixture data.");
      }

      return createImmutableFixture({
        kind,
        copy: SCENARIO_COPY.success,
        data,
      });
    }
    case "error":
      return createImmutableFixture({
        kind,
        copy: SCENARIO_COPY.error,
        errorCode: "SERVICE_NOT_READY" as const,
      });
    case "permission-denied":
      return createImmutableFixture({
        kind,
        copy: SCENARIO_COPY["permission-denied"],
        errorCode: "FORBIDDEN" as const,
      });
    case "loading":
    case "empty":
      return createImmutableFixture({
        kind,
        copy: SCENARIO_COPY[kind],
      });
  }
}
