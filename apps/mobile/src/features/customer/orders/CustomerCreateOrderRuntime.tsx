import { useEffect, useMemo, useState } from 'react';

import { pickDeviceImage } from '../../../media/device-image-picker';
import { resolveLocationCoords } from '../../../ui/RealInteractiveMap';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createCustomerHttpAdapter } from './adapter';
import { CustomerCreateOrderScreen } from './CustomerCreateOrderScreen';
import type {
  AddressCandidate,
  CustomerCreateFormView,
  CustomerCreateView,
  CustomerPaymentView,
  LatLng,
} from './model';

export type CustomerCreateOrderRuntimeProps = Readonly<{
  initialPickup?: string;
  initialPickupCoords?: LatLng;
  initialDropoff?: string;
  initialDropoffCoords?: LatLng;
  initialVehicleType?: 'MOTORBIKE' | 'VAN' | 'TRUCK';
  loggedInCustomer?: { name?: string; phone?: string } | null;
  onCreated: (orderId: string) => void;
}>;

export function CustomerCreateOrderRuntime({
  initialDropoff,
  initialDropoffCoords,
  initialPickup,
  initialPickupCoords,
  initialVehicleType,
  loggedInCustomer,
  onCreated,
}: CustomerCreateOrderRuntimeProps) {
  const port = useMemo(() => createCustomerHttpAdapter(), []);
  const [view, setView] = useState<CustomerCreateView | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdPayment, setCreatedPayment] = useState<CustomerPaymentView | null>(null);

  useEffect(() => {
    let active = true;
    async function initForm() {
      const v = await port.getCreateView();
      if (!active) return;

      if (v.kind === 'form' && (initialPickup || initialDropoff || initialVehicleType)) {
        let pCoords = initialPickupCoords;
        let dCoords = initialDropoffCoords;

        if (initialPickup && !pCoords) {
          try {
            const candidates = await port.searchAddress(initialPickup);
            if (active && candidates[0]?.coords) {
              pCoords = candidates[0].coords;
            }
          } catch {
            // Fallback to dictionary coordinates
          }
          if (!pCoords) {
            pCoords = resolveLocationCoords(initialPickup);
          }
        }

        if (initialDropoff && !dCoords) {
          try {
            const candidates = await port.searchAddress(initialDropoff);
            if (active && candidates[0]?.coords) {
              dCoords = candidates[0].coords;
            }
          } catch {
            // Fallback to dictionary coordinates
          }
          if (!dCoords) {
            dCoords = resolveLocationCoords(initialDropoff);
          }
        }

        const nextForm: CustomerCreateFormView = {
          ...v.form,
          pickup: initialPickup ?? v.form.pickup,
          pickupCoords: pCoords ?? v.form.pickupCoords,
          dropoff: initialDropoff ?? v.form.dropoff,
          dropoffCoords: dCoords ?? v.form.dropoffCoords,
          vehicleType: initialVehicleType ?? v.form.vehicleType,
          paymentMethod: 'VIETQR',
        };
        setView({ ...v, form: nextForm });
      } else {
        setView(v);
      }
    }

    void initForm();
    return () => {
      active = false;
    };
  }, [
    initialDropoff,
    initialDropoffCoords,
    initialPickup,
    initialPickupCoords,
    initialVehicleType,
    port,
  ]);

  if (!view) {
    return (
      <ScreenScaffold title="Tạo đơn">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  const currentForm: CustomerCreateFormView | null = view.kind === 'form' ? view.form : null;

  function updateForm(updater: (prevForm: CustomerCreateFormView) => CustomerCreateFormView) {
    setView((prev) => {
      if (!prev || prev.kind !== 'form') return prev;
      return {
        ...prev,
        form: updater(prev.form),
      };
    });
  }

  function applyFormChange(next: CustomerCreateFormView) {
    updateForm(() => next);
  }

  function handleFieldChange(field: string, value: string) {
    updateForm((prevForm) => {
      if (field.startsWith('stop:')) {
        const stopId = field.slice('stop:'.length);
        return {
          ...prevForm,
          stops: prevForm.stops.map((s) =>
            s.id === stopId ? { ...s, value, coords: undefined } : s,
          ),
        };
      }
      if (field === 'pickup') {
        return { ...prevForm, pickup: value, pickupCoords: undefined };
      }
      if (field === 'dropoff') {
        return { ...prevForm, dropoff: value, dropoffCoords: undefined };
      }
      if (field === 'dimLength') {
        return {
          ...prevForm,
          cargoDimensions: { ...prevForm.cargoDimensions, length: value },
        };
      }
      if (field === 'dimWidth') {
        return {
          ...prevForm,
          cargoDimensions: { ...prevForm.cargoDimensions, width: value },
        };
      }
      if (field === 'dimHeight') {
        return {
          ...prevForm,
          cargoDimensions: { ...prevForm.cargoDimensions, height: value },
        };
      }
      return { ...prevForm, [field]: value } as CustomerCreateFormView;
    });
  }

  function handleAddressSelect(field: string, candidate: AddressCandidate) {
    updateForm((prevForm) => {
      if (field.startsWith('stop:')) {
        const stopId = field.slice('stop:'.length);
        return {
          ...prevForm,
          stops: prevForm.stops.map((s) =>
            s.id === stopId ? { ...s, value: candidate.label, coords: candidate.coords } : s,
          ),
        };
      }
      if (field === 'pickup') {
        return { ...prevForm, pickup: candidate.label, pickupCoords: candidate.coords };
      }
      if (field === 'dropoff') {
        return { ...prevForm, dropoff: candidate.label, dropoffCoords: candidate.coords };
      }
      return prevForm;
    });
  }

  function handleAddStop() {
    updateForm((prevForm) => {
      if (prevForm.stops.length >= 3) return prevForm;
      return {
        ...prevForm,
        stops: [...prevForm.stops, { id: `stop-${Date.now()}`, value: '' }],
      };
    });
  }

  function handleRemoveStop(stopId: string) {
    updateForm((prevForm) => ({
      ...prevForm,
      stops: prevForm.stops.filter((s) => s.id !== stopId),
    }));
  }

  function handleSelectVehicle(vehicle: 'MOTORBIKE' | 'VAN' | 'TRUCK') {
    updateForm((prevForm) => ({ ...prevForm, vehicleType: vehicle }));
  }

  function handleSelectRoute(routeId: string) {
    setView((prev) => {
      if (!prev || prev.kind !== 'form' || prev.estimate.kind !== 'ready') return prev;
      return {
        ...prev,
        estimate: { ...prev.estimate, selectedRouteId: routeId },
      };
    });
  }

  function handleConfirmContactDetails(
    target: 'pickup' | 'dropoff',
    details: { name: string; phone: string; note: string; address?: string; coords?: LatLng },
  ) {
    updateForm((prevForm) => {
      if (target === 'pickup') {
        return {
          ...prevForm,
          pickup: details.address ?? prevForm.pickup,
          pickupCoords: details.coords ?? prevForm.pickupCoords,
          senderInfo: { name: details.name, phone: details.phone, note: details.note },
        };
      }
      return {
        ...prevForm,
        dropoff: details.address ?? prevForm.dropoff,
        dropoffCoords: details.coords ?? prevForm.dropoffCoords,
        receiverInfo: { name: details.name, phone: details.phone, note: details.note },
      };
    });
  }

  async function handlePickCargoImage() {
    if (!currentForm) return;
    const file = await pickDeviceImage();
    if (file) {
      applyFormChange({
        ...currentForm,
        cargoImageUri: file.uri,
      });
    }
  }

  function handleRemoveCargoImage() {
    if (!currentForm) return;
    applyFormChange({
      ...currentForm,
      cargoImageUri: null,
    });
  }

  function handleToggleLoadingSupport(val: boolean) {
    if (!currentForm) return;
    applyFormChange({
      ...currentForm,
      requiresLoadingSupport: val,
    });
  }

  function handleSelectCategory(cat: string) {
    if (!currentForm) return;
    applyFormChange({
      ...currentForm,
      cargoCategory: cat,
    });
  }

  function handleSelectPaymentMethod(method: 'VIETQR' | 'CASH') {
    if (!currentForm) return;
    applyFormChange({
      ...currentForm,
      paymentMethod: method,
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
        applyFormChange({
          ...currentForm,
          createdOrderReference: detail.order.reference,
        });
        setCreatedOrderId(detail.order.id);
        if (detail.order.payment) {
          setCreatedPayment(detail.order.payment);
        }
      }
    }
  }

  const handleViewCreatedOrder = () => {
    if (createdOrderId) {
      onCreated(createdOrderId);
    }
  };

  return (
    <CustomerCreateOrderScreen
      createdPayment={createdPayment}
      loggedInCustomer={loggedInCustomer}
      onAddressSelect={handleAddressSelect}
      onAddStop={handleAddStop}
      onConfirmContactDetails={handleConfirmContactDetails}
      onFieldChange={handleFieldChange}
      onPickCargoImage={handlePickCargoImage}
      onPrimaryAction={(id) => void handlePrimaryAction(id)}
      onRemoveCargoImage={handleRemoveCargoImage}
      onRemoveStop={handleRemoveStop}
      onRetry={() => void port.getCreateView().then(setView)}
      onSelectCategory={handleSelectCategory}
      onSelectPaymentMethod={handleSelectPaymentMethod}
      onSelectRoute={handleSelectRoute}
      onSelectVehicle={handleSelectVehicle}
      onToggleLoadingSupport={handleToggleLoadingSupport}
      onViewCreatedOrder={handleViewCreatedOrder}
      searchAddress={port.searchAddress}
      view={view}
    />
  );
}
