import { OrderStatus, Role } from '@prisma/client';
import { DomainError } from '../../common/domain-error.js';
import { assertOrderTransition } from './order-state-machine.js';

describe('Order State Machine', () => {
  describe('Valid Transitions', () => {
    it('allows DRIVER to transition REQUESTED -> ACCEPTED', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.REQUESTED,
          to: OrderStatus.ACCEPTED,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).not.toThrow();
    });

    it('allows DRIVER to transition ACCEPTED -> PICKING_UP', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.ACCEPTED,
          to: OrderStatus.PICKING_UP,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).not.toThrow();
    });

    it('allows DRIVER to transition PICKING_UP -> IN_TRANSIT', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.PICKING_UP,
          to: OrderStatus.IN_TRANSIT,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).not.toThrow();
    });

    it('allows DRIVER to transition IN_TRANSIT -> DELIVERED when delivery proof is present', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.IN_TRANSIT,
          to: OrderStatus.DELIVERED,
          actorRole: Role.DRIVER,
          hasDeliveryProof: true,
        }),
      ).not.toThrow();
    });

    it('allows CUSTOMER to cancel order in REQUESTED state', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.REQUESTED,
          to: OrderStatus.CANCELLED,
          actorRole: Role.CUSTOMER,
          hasDeliveryProof: false,
        }),
      ).not.toThrow();
    });

    it('allows ADMIN to cancel order in REQUESTED, ACCEPTED, PICKING_UP, and IN_TRANSIT states with reason', () => {
      for (const from of [
        OrderStatus.REQUESTED,
        OrderStatus.ACCEPTED,
        OrderStatus.PICKING_UP,
        OrderStatus.IN_TRANSIT,
      ]) {
        expect(() =>
          assertOrderTransition({
            from,
            to: OrderStatus.CANCELLED,
            actorRole: Role.ADMIN,
            hasDeliveryProof: false,
            cancelReason: 'Driver requested cancellation',
          }),
        ).not.toThrow();
      }
    });
  });

  describe('Invalid Transitions & Proof Checks', () => {
    it('rejects DRIVER transition IN_TRANSIT -> DELIVERED if hasDeliveryProof is false', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.IN_TRANSIT,
          to: OrderStatus.DELIVERED,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);
    });

    it('rejects CUSTOMER cancellation from states other than REQUESTED', () => {
      const nonCancelableStates = [
        OrderStatus.ACCEPTED,
        OrderStatus.PICKING_UP,
        OrderStatus.IN_TRANSIT,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ];

      for (const from of nonCancelableStates) {
        expect(() =>
          assertOrderTransition({
            from,
            to: OrderStatus.CANCELLED,
            actorRole: Role.CUSTOMER,
            hasDeliveryProof: false,
          }),
        ).toThrow(DomainError);
      }
    });

    it('rejects ADMIN cancellation without reason', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.ACCEPTED,
          to: OrderStatus.CANCELLED,
          actorRole: Role.ADMIN,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);

      expect(() =>
        assertOrderTransition({
          from: OrderStatus.ACCEPTED,
          to: OrderStatus.CANCELLED,
          actorRole: Role.ADMIN,
          hasDeliveryProof: false,
          cancelReason: '   ',
        }),
      ).toThrow(DomainError);
    });

    it('rejects DRIVER trying to cancel orders', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.REQUESTED,
          to: OrderStatus.CANCELLED,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);
    });

    it('rejects FLEET_OWNER performing transitions', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.REQUESTED,
          to: OrderStatus.ACCEPTED,
          actorRole: Role.FLEET_OWNER,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);
    });

    it('rejects skipping states (e.g. REQUESTED -> IN_TRANSIT)', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.REQUESTED,
          to: OrderStatus.IN_TRANSIT,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);
    });

    it('rejects backward transitions (e.g. IN_TRANSIT -> PICKING_UP)', () => {
      expect(() =>
        assertOrderTransition({
          from: OrderStatus.IN_TRANSIT,
          to: OrderStatus.PICKING_UP,
          actorRole: Role.DRIVER,
          hasDeliveryProof: false,
        }),
      ).toThrow(DomainError);
    });

    it('rejects transitions out of terminal states DELIVERED and CANCELLED', () => {
      for (const terminal of [OrderStatus.DELIVERED, OrderStatus.CANCELLED]) {
        for (const to of [
          OrderStatus.REQUESTED,
          OrderStatus.ACCEPTED,
          OrderStatus.PICKING_UP,
          OrderStatus.IN_TRANSIT,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ]) {
          expect(() =>
            assertOrderTransition({
              from: terminal,
              to,
              actorRole: Role.ADMIN,
              hasDeliveryProof: true,
              cancelReason: 'Reason',
            }),
          ).toThrow(DomainError);
        }
      }
    });
  });
});
