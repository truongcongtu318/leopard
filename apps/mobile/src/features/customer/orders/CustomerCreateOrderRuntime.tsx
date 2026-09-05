import { useEffect, useMemo, useState } from 'react';

import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerCreateOrderScreen } from './CustomerCreateOrderScreen';
import type { CustomerCreateFormView, CustomerCreateView } from './model';

export type CustomerCreateOrderRuntimeProps = Readonly<{
  initialPickup?: string;
  initialDropoff?: string;
  onCreated: (orderId: string) => void;
}>;

export function CustomerCreateOrderRuntime({
  initialDropoff,
  initialPickup,
  onCreated,
}: CustomerCreateOrderRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const [view, setView] = useState<CustomerCreateView | null>(null);

  useEffect(() => {
    let active = true;
    void port.getCreateView().then((v) => {
      if (active) {
        if (v.kind === 'form' && (initialPickup || initialDropoff)) {
          const nextForm = {
            ...v.form,
            pickup: initialPickup ?? v.form.pickup,
            dropoff: initialDropoff ?? v.form.dropoff,
          };
          setView({ ...v, form: nextForm });
        } else {
          setView(v);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [initialDropoff, initialPickup, port]);

  if (!view) {
    return (
      <ScreenScaffold eyebrow="CUSTOMER · NEW JOURNEY" title="Tạo đơn">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  const currentForm: CustomerCreateFormView | null = view.kind === 'form' ? view.form : null;

  function applyFormChange(next: CustomerCreateFormView) {
    if (view && view.kind === 'form') {
      setView({ ...view, form: next });
    }
  }

  function handleFieldChange(field: string, value: string) {
    if (!currentForm) return;
    if (field.startsWith('stop:')) {
      const stopId = field.slice('stop:'.length);
      applyFormChange({
        ...currentForm,
        stops: currentForm.stops.map((s) => (s.id === stopId ? { ...s, value } : s)),
      });
      return;
    }
    applyFormChange({ ...currentForm, [field]: value } as CustomerCreateFormView);
  }

  function handleAddStop() {
    if (!currentForm || currentForm.stops.length >= 3) return;
    applyFormChange({
      ...currentForm,
      stops: [...currentForm.stops, { id: `stop-${Date.now()}`, value: '' }],
    });
  }

  function handleRemoveStop(stopId: string) {
    if (!currentForm) return;
    applyFormChange({
      ...currentForm,
      stops: currentForm.stops.filter((s) => s.id !== stopId),
    });
  }

  function handleSelectVehicle(vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') {
    if (!currentForm) return;
    applyFormChange({ ...currentForm, vehicleType: vehicle });
  }

  function handleSelectRoute(routeId: string) {
    if (!view || view.kind !== 'form' || view.estimate.kind !== 'ready') return;
    setView({
      ...view,
      estimate: { ...view.estimate, selectedRouteId: routeId },
    });
  }

  async function handlePrimaryAction(actionId: string) {
    if (!currentForm) return;
    if (actionId === 'estimate-order') {
      const next = await port.estimateOrder(currentForm);
      setView(next);
      return;
    }
    if (actionId === 'create-order') {
      if (!view || view.kind !== 'form' || view.estimate.kind !== 'ready') return;
      const estimate = view.estimate;
      const selected = estimate.routes.find((route) => route.routeId === estimate.selectedRouteId);
      if (!selected) return;
      const detail = await port.createOrder(currentForm, selected.estimateToken);
      if (detail.kind === 'content') {
        onCreated(detail.order.id);
      }
    }
  }

  return (
    <CustomerCreateOrderScreen
      onAddStop={handleAddStop}
      onFieldChange={handleFieldChange}
      onPrimaryAction={(id) => void handlePrimaryAction(id)}
      onRemoveStop={handleRemoveStop}
      onRetry={() => void port.getCreateView().then(setView)}
      onSelectRoute={handleSelectRoute}
      onSelectVehicle={handleSelectVehicle}
      view={view}
    />
  );
}
