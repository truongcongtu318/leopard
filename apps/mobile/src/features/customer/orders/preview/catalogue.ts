import type { CustomerCreateView, CustomerDetailView, CustomerListView } from '../model';
import {
  CUSTOMER_CREATE_SCENARIOS,
  CUSTOMER_DETAIL_SCENARIOS,
  CUSTOMER_LIST_SCENARIOS,
  createCustomerCreateFixture,
  createCustomerDetailFixture,
  createCustomerListFixture,
  type CustomerCreateScenarioId,
  type CustomerDetailScenarioId,
  type CustomerListScenarioId,
} from '../fixtures';

export type CustomerPreviewScreen = 'list' | 'create' | 'detail';
export type CustomerPreviewView = CustomerListView | CustomerCreateView | CustomerDetailView;

const defaults = {
  list: 'C-LIST-SUCCESS',
  create: 'C-NEW-ESTIMATE-DEMO',
  detail: 'C-DETAIL-SUCCESS',
} as const;

export function createCustomerPreviewView(
  screen: CustomerPreviewScreen,
  requestedScenario: string | null,
): CustomerPreviewView {
  const scenario = requestedScenario ?? defaults[screen];
  if (screen === 'list' && CUSTOMER_LIST_SCENARIOS.includes(scenario as CustomerListScenarioId)) {
    return createCustomerListFixture(scenario as CustomerListScenarioId);
  }
  if (
    screen === 'create' &&
    CUSTOMER_CREATE_SCENARIOS.includes(scenario as CustomerCreateScenarioId)
  ) {
    return createCustomerCreateFixture(scenario as CustomerCreateScenarioId);
  }
  if (
    screen === 'detail' &&
    CUSTOMER_DETAIL_SCENARIOS.includes(scenario as CustomerDetailScenarioId)
  ) {
    return createCustomerDetailFixture(scenario as CustomerDetailScenarioId);
  }
  throw new TypeError(`Unsupported Customer preview scenario: ${scenario}`);
}
