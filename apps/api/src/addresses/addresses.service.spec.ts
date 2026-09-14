import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DomainError } from '../common/domain-error.js';
import { AddressesService } from './addresses.service.js';

describe('AddressesService', () => {
  let service: AddressesService;
  let mockPrisma: any;

  const mockAddress1 = {
    id: 'addr-1',
    userId: 'user-1',
    label: 'Kho Q7',
    address: '123 Huỳnh Tấn Phát, Q7',
    latitude: 10.73,
    longitude: 106.72,
    isDefault: true,
    createdAt: new Date('2026-09-15T00:00:00Z'),
    updatedAt: new Date('2026-09-15T00:00:00Z'),
  };

  const mockAddress2 = {
    id: 'addr-2',
    userId: 'user-1',
    label: 'Văn phòng Q1',
    address: '45 Lê Duẩn, Q1',
    latitude: 10.78,
    longitude: 106.70,
    isDefault: false,
    createdAt: new Date('2026-09-14T00:00:00Z'),
    updatedAt: new Date('2026-09-14T00:00:00Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      customerAddress: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };
    service = new AddressesService(mockPrisma);
  });

  describe('listAddresses', () => {
    it('returns addresses for the given user', async () => {
      mockPrisma.customerAddress.findMany.mockResolvedValue([mockAddress1, mockAddress2]);

      const result = await service.listAddresses('user-1');

      expect(mockPrisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('addr-1');
    });
  });

  describe('createAddress', () => {
    it('creates non-default address without unsetting others', async () => {
      mockPrisma.customerAddress.create.mockResolvedValue(mockAddress2);

      const result = await service.createAddress('user-1', {
        label: 'Văn phòng Q1',
        address: '45 Lê Duẩn, Q1',
        latitude: 10.78,
        longitude: 106.70,
        isDefault: false,
      });

      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          label: 'Văn phòng Q1',
          address: '45 Lê Duẩn, Q1',
          latitude: 10.78,
          longitude: 106.70,
          isDefault: false,
        },
      });
      expect(result).toEqual(mockAddress2);
    });

    it('creates default address and unsets existing default within transaction', async () => {
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.create.mockResolvedValue(mockAddress1);

      const result = await service.createAddress('user-1', {
        label: 'Kho Q7',
        address: '123 Huỳnh Tấn Phát, Q7',
        latitude: 10.73,
        longitude: 106.72,
        isDefault: true,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          label: 'Kho Q7',
          address: '123 Huỳnh Tấn Phát, Q7',
          latitude: 10.73,
          longitude: 106.72,
          isDefault: true,
        },
      });
      expect(result).toEqual(mockAddress1);
    });
  });

  describe('deleteAddress', () => {
    it('throws 404 when address does not exist', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.deleteAddress('user-1', 'addr-nonexistent')).rejects.toThrow(
        DomainError,
      );
      await expect(service.deleteAddress('user-1', 'addr-nonexistent')).rejects.toMatchObject({
        code: 'ADDRESS_NOT_FOUND',
        status: 404,
      });
    });

    it('throws 403 when address belongs to another user', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue({
        ...mockAddress1,
        userId: 'other-user',
      });

      await expect(service.deleteAddress('user-1', 'addr-1')).rejects.toThrow(DomainError);
      await expect(service.deleteAddress('user-1', 'addr-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('deletes non-default address directly', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue(mockAddress2);
      mockPrisma.customerAddress.delete.mockResolvedValue(mockAddress2);

      const result = await service.deleteAddress('user-1', 'addr-2');

      expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
      });
      expect(result).toEqual({ success: true });
    });

    it('deletes default address and promotes next address to default', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue(mockAddress1);
      mockPrisma.customerAddress.delete.mockResolvedValue(mockAddress1);
      mockPrisma.customerAddress.findFirst.mockResolvedValue(mockAddress2);
      mockPrisma.customerAddress.update.mockResolvedValue({ ...mockAddress2, isDefault: true });

      const result = await service.deleteAddress('user-1', 'addr-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
      expect(mockPrisma.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('setDefault', () => {
    it('throws 404 when address does not exist', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.setDefault('user-1', 'addr-nonexistent')).rejects.toThrow(DomainError);
      await expect(service.setDefault('user-1', 'addr-nonexistent')).rejects.toMatchObject({
        code: 'ADDRESS_NOT_FOUND',
        status: 404,
      });
    });

    it('throws 403 when address belongs to another user', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue({
        ...mockAddress2,
        userId: 'other-user',
      });

      await expect(service.setDefault('user-1', 'addr-2')).rejects.toThrow(DomainError);
      await expect(service.setDefault('user-1', 'addr-2')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('unsets current default and sets new default in transaction', async () => {
      mockPrisma.customerAddress.findUnique.mockResolvedValue(mockAddress2);
      mockPrisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.customerAddress.update.mockResolvedValue({ ...mockAddress2, isDefault: true });

      const result = await service.setDefault('user-1', 'addr-2');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-2' },
        data: { isDefault: true },
      });
      expect(result.isDefault).toBe(true);
    });
  });
});
