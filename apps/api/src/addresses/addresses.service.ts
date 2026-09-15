import { Injectable } from '@nestjs/common';
import type { CustomerAddress } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAddresses(userId: string): Promise<CustomerAddress[]> {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<CustomerAddress> {
    const isDefault = Boolean(dto.isDefault);

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.customerAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
        return tx.customerAddress.create({
          data: {
            userId,
            label: dto.label.trim(),
            address: dto.address.trim(),
            latitude: dto.latitude,
            longitude: dto.longitude,
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        userId,
        label: dto.label.trim(),
        address: dto.address.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: false,
      },
    });
  }

  async deleteAddress(userId: string, id: string): Promise<{ success: true }> {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new DomainError('ADDRESS_NOT_FOUND', 404, 'Địa chỉ không tồn tại');
    }

    if (existing.userId !== userId) {
      throw new DomainError('FORBIDDEN', 403, 'Bạn không có quyền thao tác trên địa chỉ này');
    }

    if (existing.isDefault) {
      await this.prisma.$transaction(async (tx) => {
        await tx.customerAddress.delete({ where: { id } });
        const next = await tx.customerAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next) {
          await tx.customerAddress.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      });
    } else {
      await this.prisma.customerAddress.delete({ where: { id } });
    }

    return { success: true };
  }

  async setDefault(userId: string, id: string): Promise<CustomerAddress> {
    const existing = await this.prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new DomainError('ADDRESS_NOT_FOUND', 404, 'Địa chỉ không tồn tại');
    }

    if (existing.userId !== userId) {
      throw new DomainError('FORBIDDEN', 403, 'Bạn không có quyền thao tác trên địa chỉ này');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.customerAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }
}
