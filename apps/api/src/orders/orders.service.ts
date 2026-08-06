import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { EstimateTokenError, EstimateMismatchError, EstimateTokenService } from '../maps/domain/estimate-token.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { mapOrderResponse, type MappedOrderResponse } from './order-response.mapper.js';
import { OrdersRepository } from './orders.repository.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly estimateTokenService: EstimateTokenService,
  ) {}

  async createOrder(
    actor: AuthenticatedActor,
    dto: CreateOrderDto,
  ): Promise<MappedOrderResponse> {
    if (!dto.pickup || !dto.dropoff || !dto.vehicleType || !dto.estimateToken) {
      throw new DomainError('BAD_REQUEST', 400, 'Thiếu thông tin bắt buộc để tạo đơn hàng');
    }

    if (dto.stops && dto.stops.length > 3) {
      throw new DomainError('BAD_REQUEST', 400, 'Tối đa 3 điểm dừng trung gian');
    }

    let verifiedEstimate;
    try {
      const requestedInput = {
        pickup: {
          latitude: dto.pickup.latitude ?? dto.pickup.lat!,
          longitude: dto.pickup.longitude ?? dto.pickup.lng!,
        },
        dropoff: {
          latitude: dto.dropoff.latitude ?? dto.dropoff.lat!,
          longitude: dto.dropoff.longitude ?? dto.dropoff.lng!,
        },
        stops: dto.stops?.map((stop) => ({
          latitude: stop.latitude ?? stop.lat!,
          longitude: stop.longitude ?? stop.lng!,
        })) ?? [],
        vehicleType: dto.vehicleType,
      };

      verifiedEstimate = this.estimateTokenService.verify(dto.estimateToken, requestedInput);
    } catch (error) {
      if (error instanceof EstimateMismatchError) {
        throw new DomainError('ESTIMATE_MISMATCH', 400, 'Thông tin đặt xe không khớp với ước tính');
      }
      if (error instanceof EstimateTokenError) {
        throw new DomainError('BAD_REQUEST', 400, 'Mã ước tính không hợp lệ hoặc đã hết hạn');
      }
      throw error;
    }

    const stopsToCreate = [];

    // Pickup: sequence 0
    const pickupLat = dto.pickup.latitude ?? dto.pickup.lat;
    const pickupLng = dto.pickup.longitude ?? dto.pickup.lng;

    if (pickupLat === undefined || pickupLng === undefined) {
      throw new DomainError('BAD_REQUEST', 400, 'Tọa độ điểm lấy hàng không hợp lệ');
    }

    stopsToCreate.push({
      type: 'PICKUP' as const,
      sequence: 0,
      address: dto.pickup.address,
      latitude: pickupLat,
      longitude: pickupLng,
    });

    // Intermediate stops: sequence 1..N
    if (dto.stops && dto.stops.length > 0) {
      dto.stops.forEach((stop, index) => {
        const lat = stop.latitude ?? stop.lat;
        const lng = stop.longitude ?? stop.lng;
        if (lat === undefined || lng === undefined) {
          throw new DomainError('BAD_REQUEST', 400, `Tọa độ điểm dừng ${index + 1} không hợp lệ`);
        }
        stopsToCreate.push({
          type: 'STOP' as const,
          sequence: index + 1,
          address: stop.address,
          latitude: lat,
          longitude: lng,
        });
      });
    }

    // Dropoff: sequence N+1
    const dropoffLat = dto.dropoff.latitude ?? dto.dropoff.lat;
    const dropoffLng = dto.dropoff.longitude ?? dto.dropoff.lng;

    if (dropoffLat === undefined || dropoffLng === undefined) {
      throw new DomainError('BAD_REQUEST', 400, 'Tọa độ điểm giao hàng không hợp lệ');
    }

    stopsToCreate.push({
      type: 'DROPOFF' as const,
      sequence: stopsToCreate.length,
      address: dto.dropoff.address,
      latitude: dropoffLat,
      longitude: dropoffLng,
    });

    if (dto.clientRequestId) {
      const existingOrder = await this.ordersRepository.findByClientRequestId(actor.userId, dto.clientRequestId);
      if (existingOrder) {
        return mapOrderResponse(existingOrder);
      }
    }

    try {
      const order = await this.ordersRepository.createOrder({
        customerId: actor.userId,
        ...(dto.clientRequestId ? { clientRequestId: dto.clientRequestId } : {}),
        providerSource: verifiedEstimate.source,
        distanceMeters: verifiedEstimate.distanceM,
        durationSeconds: verifiedEstimate.durationS,
        priceVnd: verifiedEstimate.estimatedPriceVnd,
      routeSnapshot: {
        polyline: verifiedEstimate.polyline,
        source: verifiedEstimate.source,
        calculatedAt: verifiedEstimate.calculatedAt,
        cargoNote: dto.cargoNote ?? null,
        cargoWeightKg: dto.cargoWeightKg ?? null,
      },
      stops: stopsToCreate,
    });

    return mapOrderResponse(order);
  } catch (error: any) {
      if (error?.code === 'P2002' && dto.clientRequestId) {
        const existingOrder = await this.ordersRepository.findByClientRequestId(actor.userId, dto.clientRequestId);
        if (existingOrder) {
          return mapOrderResponse(existingOrder);
        }
      }
      throw error;
    }
  }

  async getCustomerOrders(
    actor: AuthenticatedActor,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: MappedOrderResponse[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const result = await this.ordersRepository.findCustomerOrders(actor.userId, page, pageSize);

    return {
      items: result.items.map(mapOrderResponse),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  async getOrderById(
    actor: AuthenticatedActor,
    id: string,
  ): Promise<MappedOrderResponse> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    // 404 non-disclosure for Customer viewing another customer's order
    if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    // Driver authorization: can view if assigned or if order is REQUESTED
    if (actor.role === 'DRIVER' && order.driverId !== actor.userId && order.status !== 'REQUESTED') {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập đơn hàng');
    }

    // Fleet Owner authorization: can view if order.driverId is in active fleet managed by Fleet Owner
    if (actor.role === 'FLEET_OWNER') {
      if (!order.driverId) {
        throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập đơn hàng');
      }

      const isDriverInFleet = await this.ordersRepository.isDriverInFleetOwnerFleets(
        actor.userId,
        order.driverId,
      );

      if (!isDriverInFleet) {
        throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập đơn hàng');
      }
    }

    return mapOrderResponse(order);
  }
}
