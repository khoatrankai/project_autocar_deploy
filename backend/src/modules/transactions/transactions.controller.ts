import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SupabaseGuard } from 'src/auth/supabase.guard';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiBearerAuth() // <--- Hiện ổ khóa trên Swagger
  @UseGuards(SupabaseGuard) // <--- Kích hoạt bảo vệ
  @Post('collect-debt')
  async collectDebt(
    @Body()
    body: {
      partnerId: string; // Nhận string từ client để tránh lỗi JSON số lớn
      staffId?: string; // Người thực hiện thu tiền (Tùy chọn)
      amount: number; // Số tiền thu
      paymentMethod: string; // 'cash', 'transfer', v.v.
      note?: string; // Ghi chú thêm
    },
    @Req() req: any,
  ) {
    const { partnerId, staffId, amount, paymentMethod, note } = body;
    console.log(req.user);
    try {
      // 1. Lấy ID nhân viên chuẩn xác từ Supabase (thường là req.user.sub hoặc req.user.id)
      const currentUserId = staffId || req.user?.id || req.user?.sub;

      // 2. Gọi Service
      const result = await this.service.collectDebt(
        BigInt(partnerId),
        currentUserId, // Truyền ID đã chuẩn hóa
        Number(amount), // Đảm bảo amount là số
        paymentMethod,
        note || `Thu nợ khách hàng - ${new Date().toLocaleDateString()}`,
      );

      // 3. ÉP KIỂU BIGINT SANG STRING TRƯỚC KHI TRẢ VỀ
      // (Nếu không làm bước này, NestJS sẽ văng lỗi 500 khi dùng JSON.stringify)
      return {
        success: true,
        data: {
          updatedPartner: {
            ...result.updatedPartner,
            id: result.updatedPartner.id.toString(),
            current_debt: Number(result.updatedPartner.current_debt),
          },
          transaction: {
            ...result.transaction,
            id: result.transaction.id.toString(),
            partner_id: result.transaction.partner_id?.toString(),
          },
        },
      };
    } catch (err: any) {
      // 4. BẮT BỘC PHẢI THROW LỖI RA CHO FRONTEND BIẾT
      console.error('==== LỖI THU NỢ ====', err);

      // Quăng lỗi 400 Bad Request kèm message rõ ràng để frontend hiện Toast đỏ
      throw new BadRequestException(
        err.message || 'Có lỗi xảy ra khi thực hiện thu nợ vào hệ thống.',
      );
    }
  }
}
