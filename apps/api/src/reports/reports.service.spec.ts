import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReportsService, formatTicketCode } from './reports.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrisma: any;

  const mockOrder = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    customerId: 'cust-1',
    status: 'IN_TRANSIT',
  };

  const mockTicket = {
    id: 'f1e2d3c4-b5a6-7890-1234-567890abcdef',
    orderId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    customerId: 'cust-1',
    category: 'damaged',
    description: 'Hàng bị vỡ góc',
    hasPhoto: true,
    status: 'OPEN',
    createdAt: new Date('2026-09-15T10:30:00.000Z'),
    updatedAt: new Date('2026-09-15T10:30:00.000Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: jest.fn(),
      },
      supportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new ReportsService(mockPrisma);
  });

  describe('formatTicketCode', () => {
    it('formats date and id suffix correctly', () => {
      const code = formatTicketCode('f1e2d3c4-b5a6-7890-1234-567890abcdef', new Date('2026-09-15T00:00:00.000Z'));
      expect(code).toBe('TK-20260915-F1E2');
    });
  });

  describe('createReport', () => {
    it('throws 404 when order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createReport('cust-1', 'order-nonexistent', {
          category: 'delayed',
          description: 'Xe đến trễ',
        }),
      ).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
      });
    });

    it('throws 403 when customerId does not match order.customerId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        customerId: 'cust-other',
      });

      await expect(
        service.createReport('cust-1', mockOrder.id, {
          category: 'delayed',
          description: 'Xe đến trễ',
        }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('creates support ticket and returns ticketCode format TK-YYYYMMDD-XXXX', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.supportTicket.create.mockResolvedValue(mockTicket);

      const result = await service.createReport('cust-1', mockOrder.id, {
        category: 'damaged',
        description: 'Hàng bị vỡ góc',
        hasPhoto: true,
      });

      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith({
        data: {
          orderId: mockOrder.id,
          customerId: 'cust-1',
          category: 'damaged',
          description: 'Hàng bị vỡ góc',
          hasPhoto: true,
        },
      });
      expect(result.ticketCode).toBe('TK-20260915-F1E2');
      expect(result.id).toBe(mockTicket.id);
    });
  });

  describe('listUserReports', () => {
    it('returns formatted ticket list for user ordered by createdAt desc', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([mockTicket]);

      const result = await service.listUserReports('cust-1');

      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.ticketCode).toBe('TK-20260915-F1E2');
    });
  });
});
