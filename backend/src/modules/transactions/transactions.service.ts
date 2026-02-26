import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto) {
    // Trigger SQL sẽ tự động trừ nợ cho partner nếu có partner_id
    return this.prisma.transactions.create({
      data: {
        code: dto.code,
        type: dto.type,
        amount: dto.amount,
        payment_method: dto.payment_method,
        category_id: BigInt(dto.category_id),
        partner_id: dto.partner_id ? BigInt(dto.partner_id) : null,
        order_id: dto.order_id ? BigInt(dto.order_id) : null,
        staff_id: dto.staff_id,
        note: dto.note,
      },
    });
  }

  findAll() {
    return this.prisma.transactions.findMany({
      include: {
        transaction_categories: true,
        partners: { select: { name: true } },
        profiles: { select: { full_name: true } },
      },
      orderBy: { transaction_date: 'desc' },
    });
  }

  async collectDebt(
    partnerId: bigint,
    staffId: string,
    amount: number,
    paymentMethod: string,
    note: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updatedPartner = await tx.partners.update({
        where: { id: partnerId },
        data: { current_debt: { decrement: amount } },
      });
      console.log('vao day', updatedPartner);
      const transaction = await tx.transactions.create({
        data: {
          code: `COLLECT${Date.now()}`,
          // ĐÃ ĐIỀU CHỈNH: Bắt buộc dùng 'receipt' (Phiếu thu) theo check constraint
          type: 'receipt',
          amount: amount,
          payment_method: paymentMethod,
          partner_id: partnerId,
          staff_id: staffId,
          note: note,
        },
      });
      console.log('vao day2', transaction);
      return { updatedPartner, transaction };
    });
  }
}
