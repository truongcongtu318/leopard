import type { DriverDetailView, DriverListView } from '../model';
import {
  DRIVER_DETAIL_SCENARIOS,
  DRIVER_LIST_SCENARIOS,
  createDriverDetailFixture,
  createDriverListFixture,
  type DriverDetailScenarioId,
  type DriverListScenarioId,
} from '../fixtures';

export type DriverPreviewScreen = 'list' | 'detail';
export type DriverPreviewView = DriverListView | DriverDetailView;

const defaults = {
  list: 'D-LIST-ACTIVE-REQUESTED',
  detail: 'D-DETAIL-PROOF-REQUIRED',
} as const;

export function createDriverPreviewView(
  screen: DriverPreviewScreen,
  requestedScenario: string | null,
): DriverPreviewView {
  const scenario = requestedScenario ?? defaults[screen];
  if (screen === 'list' && DRIVER_LIST_SCENARIOS.includes(scenario as DriverListScenarioId)) {
    return createDriverListFixture(scenario as DriverListScenarioId);
  }
  if (screen === 'detail' && DRIVER_DETAIL_SCENARIOS.includes(scenario as DriverDetailScenarioId)) {
    return createDriverDetailFixture(scenario as DriverDetailScenarioId);
  }
  throw new TypeError(`Unsupported Driver preview scenario: ${scenario}`);
}
