import { beforeEach, describe, expect, it } from '@jest/globals';
import { bookingDraftStore } from './bookingDraftStore';

describe('bookingDraftStore', () => {
  beforeEach(() => {
    bookingDraftStore.reset();
  });

  it('initializes with default values and is not dirty', () => {
    expect(bookingDraftStore.isDirty()).toBe(false);
    expect(bookingDraftStore.getDraft().vehicleId).toBe('TRUCK_125T');
  });

  it('marks store as dirty when receiver name or phone is entered', () => {
    bookingDraftStore.updateDraft({ receiverName: 'Anh Tuấn' });
    expect(bookingDraftStore.isDirty()).toBe(true);
  });

  it('marks store as dirty when toggling services or cargo category', () => {
    bookingDraftStore.updateDraft({ hasLoadingSupport: true });
    expect(bookingDraftStore.isDirty()).toBe(true);
  });
});
