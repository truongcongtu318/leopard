import type { BookingDraftState } from './booking-schema';

const DEFAULT_DRAFT: BookingDraftState = {
  pickupAddress: '',
  dropoffAddress: '',
  stops: [],
  vehicleId: 'TRUCK_125T',
  receiverName: '',
  receiverPhone: '',
  cargoCategory: 'Vật liệu XD',
  cargoNote: '',
  cargoImages: [],
  hasLoadingSupport: false,
  hasVatInvoice: false,
  vatCompany: '',
  vatTaxId: '',
  vatEmail: '',
  paymentMethod: 'VIETQR',
};

let currentDraft: BookingDraftState = { ...DEFAULT_DRAFT };
const listeners = new Set<() => void>();

export const bookingDraftStore = {
  getDraft: (): BookingDraftState => currentDraft,
  initDraft: (initial: Partial<BookingDraftState>) => {
    currentDraft = { ...DEFAULT_DRAFT, ...initial };
  },
  updateDraft: (updates: Partial<BookingDraftState>) => {
    currentDraft = { ...currentDraft, ...updates };
    listeners.forEach((l) => l());
  },
  reset: () => {
    currentDraft = { ...DEFAULT_DRAFT };
    listeners.forEach((l) => l());
  },
  isDirty: (): boolean => {
    return (
      currentDraft.receiverName.trim().length > 0 ||
      currentDraft.receiverPhone.trim().length > 0 ||
      (currentDraft.cargoNote?.trim().length ?? 0) > 0 ||
      currentDraft.cargoImages.length > 0 ||
      currentDraft.hasLoadingSupport ||
      currentDraft.hasVatInvoice ||
      currentDraft.stops.length > 0
    );
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
