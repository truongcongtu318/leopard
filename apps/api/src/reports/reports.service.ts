import { Injectable } from '@nestjs/common';
import type { SupportTicket } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';

export function formatTicketCode(id: string, createdAt: Date): string {
  const yyyy = createdAt.getUTCFullYear();
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(createdAt.getUTCDate()).padStart(2, '0');
  const suffix = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `TK-${yyyy}${mm}${dd}-${suffix}`;
}

export type SupportTicketResponse = SupportTicket & {
  ticketCode: string;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    userId: string,
    orderId: string,
    dto: CreateReportDto,
  ): Promise<SupportTicketResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    if (order.customerId !== userId) {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ người đặt đơn mới có thể báo cáo sự cố');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        orderId,
        customerId: userId,
        category: dto.category.trim(),
        description: dto.description.trim(),
        hasPhoto: Boolean(dto.hasPhoto),
      },
    });

    return {
      ...ticket,
      ticketCode: formatTicketCode(ticket.id, ticket.createdAt),
    };
  }

  async listUserReports(userId: string): Promise<SupportTicketResponse[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((ticket) => ({
      ...ticket,
      ticketCode: formatTicketCode(ticket.id, ticket.createdAt),
    }));
  }
}
