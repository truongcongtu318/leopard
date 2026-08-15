import { resolveMobilePreviewMode, type MobilePreviewModeInput } from './preview-mode';

export const UI_SCENARIO_NAMES = Object.freeze([
  'loading',
  'empty',
  'error',
  'success',
  'permission-denied',
  'offline',
] as const);

export type UiScenarioName = (typeof UI_SCENARIO_NAMES)[number];

export type UiScenarioCopy = Readonly<{
  title: string;
  message: string;
}>;

export type UiScenario = Readonly<{
  name: UiScenarioName;
  copy: UiScenarioCopy;
}>;

export type MobilePreviewFixture = Readonly<{
  source: 'fixture';
  scenario: UiScenario;
}>;

export type MobilePreviewSelectionInput = MobilePreviewModeInput &
  Readonly<{
    scenarioName: UiScenarioName;
  }>;

export type MobilePreviewSelection =
  | Readonly<{
      mode: 'runtime';
      fixture: null;
      bannerRequired: false;
    }>
  | Readonly<{
      mode: 'fixtures';
      fixture: MobilePreviewFixture;
      bannerRequired: true;
    }>;

const SCENARIO_COPY: Readonly<Record<UiScenarioName, UiScenarioCopy>> = Object.freeze({
  loading: Object.freeze({
    title: 'Đang tải dữ liệu',
    message: 'Bố cục được giữ ổn định trong khi chờ dữ liệu.',
  }),
  empty: Object.freeze({
    title: 'Chưa có dữ liệu',
    message: 'Chưa có nội dung phù hợp để hiển thị.',
  }),
  error: Object.freeze({
    title: 'Không thể tải dữ liệu',
    message: 'Hãy thử lại khi kết nối ổn định.',
  }),
  success: Object.freeze({
    title: 'Dữ liệu đã sẵn sàng',
    message: 'Nội dung mô phỏng đang được hiển thị.',
  }),
  'permission-denied': Object.freeze({
    title: 'Bạn không có quyền truy cập',
    message: 'Không hiển thị dữ liệu thuộc khu vực ngoài quyền của bạn.',
  }),
  offline: Object.freeze({
    title: 'Đang ngoại tuyến',
    message: 'Nội dung hiện có có thể chưa phải dữ liệu mới nhất.',
  }),
});

function createUiScenario(name: UiScenarioName): UiScenario {
  const template = SCENARIO_COPY[name];
  const copy = Object.freeze({
    title: template.title,
    message: template.message,
  });

  return Object.freeze({ name, copy });
}

function createMobilePreviewFixture(scenarioName: UiScenarioName): MobilePreviewFixture {
  return Object.freeze({
    source: 'fixture',
    scenario: createUiScenario(scenarioName),
  });
}

export function createMobilePreviewSelection({
  environment,
  localPreviewEnabled,
  scenarioName,
}: MobilePreviewSelectionInput): MobilePreviewSelection {
  const mode = resolveMobilePreviewMode({ environment, localPreviewEnabled });

  if (mode === 'runtime') {
    return Object.freeze({
      mode,
      fixture: null,
      bannerRequired: false,
    });
  }

  return Object.freeze({
    mode,
    fixture: createMobilePreviewFixture(scenarioName),
    bannerRequired: true,
  });
}
