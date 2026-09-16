import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainError } from '../common/domain-error.js';
import { ChatService } from './chat.service.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockPrisma: any;

  const mockOrder = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    customerId: 'cust-1',
    driverId: 'driver-1',
  };

  const mockMessage = {
    id: 'msg-1',
    orderId: mockOrder.id,
    senderId: 'cust-1',
    body: 'Bác tài sắp tới chưa?',
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
      orderMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new ChatService(mockPrisma);
  });

  describe('verifyOrderParticipant', () => {
    it('throws 404 when order is not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.verifyOrderParticipant('cust-1', 'nonexistent')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
    });

    it('throws 403 when user is neither customer nor driver of the order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.verifyOrderParticipant('stranger-user', mockOrder.id)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('allows customer of the order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const res = await service.verifyOrderParticipant('cust-1', mockOrder.id);
      expect(res).toEqual(mockOrder);
    });

    it('allows driver of the order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const res = await service.verifyOrderParticipant('driver-1', mockOrder.id);
      expect(res).toEqual(mockOrder);
    });
  });

  describe('listOrderMessages', () => {
    it('returns messages ordered by createdAt asc for valid participant', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderMessage.findMany.mockResolvedValue([mockMessage]);

      const res = await service.listOrderMessages('cust-1', mockOrder.id);

      expect(mockPrisma.orderMessage.findMany).toHaveBeenCalledWith({
        where: { orderId: mockOrder.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(res).toEqual([
        { ...mockMessage, createdAt: mockMessage.createdAt.toISOString(), senderRole: 'CUSTOMER' },
      ]);
    });

    it('tags a message from the order driver with senderRole DRIVER', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      const driverMessage = { ...mockMessage, id: 'msg-2', senderId: 'driver-1' };
      mockPrisma.orderMessage.findMany.mockResolvedValue([driverMessage]);

      const res = await service.listOrderMessages('cust-1', mockOrder.id);

      expect(res).toEqual([
        { ...driverMessage, createdAt: driverMessage.createdAt.toISOString(), senderRole: 'DRIVER' },
      ]);
    });
  });

  describe('sendMessage', () => {
    it('throws 400 when message body is empty', async () => {
      await expect(
        service.sendMessage('cust-1', mockOrder.id, { body: '   ' }),
      ).rejects.toMatchObject({
        code: 'INVALID_MESSAGE',
        status: 400,
      });
    });

    it('saves and returns new message when valid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderMessage.create.mockResolvedValue(mockMessage);

      const res = await service.sendMessage('cust-1', mockOrder.id, { body: '  Bác tài sắp tới chưa?  ' });

      expect(mockPrisma.orderMessage.create).toHaveBeenCalledWith({
        data: {
          orderId: mockOrder.id,
          senderId: 'cust-1',
          body: 'Bác tài sắp tới chưa?',
        },
      });
      expect(res).toEqual(mockMessage);
    });
  });
});
