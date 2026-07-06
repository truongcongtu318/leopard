import { describe, expect, it } from "vitest";

import {
  driverAvailabilities,
  orderStatuses,
  paymentStatuses,
  roles,
  vehicleTypes,
  type OrderDto,
  type PaymentIntentDto,
  type TrackingPointDto,
  type UserDto
} from "./index";

describe("shared MVP contracts", () => {
  it("exports the required enum values", () => {
    expect(roles).toEqual(["CUSTOMER", "DRIVER", "ADMIN"]);
    expect(vehicleTypes).toContain("SMALL_TRUCK");
    expect(orderStatuses).toContain("IN_TRANSIT");
    expect(paymentStatuses).toContain("QR_CREATED");
    expect(driverAvailabilities).toContain("AVAILABLE");
  });

  it("supports the required DTO shapes", () => {
    const user: UserDto = {
      id: "user_1",
      email: "customer@leopard.demo",
      name: "Demo Customer",
      role: "CUSTOMER"
    };

    const order: OrderDto = {
      id: "order_1",
      customerId: user.id,
      driverId: null,
      pickup: { address: "Pickup", lat: 10.762622, lng: 106.660172 },
      dropoff: { address: "Dropoff", lat: 10.776889, lng: 106.700806 },
      stops: [],
      vehicleType: "SMALL_TRUCK",
      cargoNotes: null,
      status: "REQUESTED",
      distanceKm: 12,
      etaMinutes: 35,
      estimatedPriceVnd: 250000,
      paymentStatus: "UNPAID",
      createdAt: "2026-07-06T00:00:00.000Z",
      updatedAt: "2026-07-06T00:00:00.000Z"
    };

    const trackingPoint: TrackingPointDto = {
      id: "tracking_1",
      orderId: order.id,
      driverId: "driver_1",
      lat: 10.77,
      lng: 106.69,
      recordedAt: "2026-07-06T00:05:00.000Z"
    };

    const paymentIntent: PaymentIntentDto = {
      id: "payment_1",
      orderId: order.id,
      status: "QR_CREATED",
      provider: "DEMO",
      amountVnd: order.estimatedPriceVnd,
      qrContent: "demo-qr",
      providerReference: null,
      createdAt: "2026-07-06T00:01:00.000Z"
    };

    expect(order.customerId).toBe(user.id);
    expect(trackingPoint.orderId).toBe(order.id);
    expect(paymentIntent.orderId).toBe(order.id);
  });
});
