import { Injectable, BadRequestException } from '@nestjs/common';
import { SetSalesTargetDto } from './dto/set-kpi.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class SalesTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async setManualKpi(dto: SetSalesTargetDto) {
    const { staffId, month, year, targetRevenue } = dto;

    // 1. Kiểm tra xem nhân viên có tồn tại và có phải là Sale không (Tùy chọn nhưng nên có)
    const staff = await this.prisma.profiles.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.role !== 'sale') {
      throw new BadRequestException(
        'Nhân viên không tồn tại hoặc không có quyền Sale.',
      );
    }

    // 2. Thực hiện lệnh UPSERT (Cập nhật nếu có, Tạo mới nếu chưa)
    const result = await this.prisma.sales_targets.upsert({
      where: {
        // Prisma tự động tạo ra key này dựa trên cấu trúc @@unique([staff_id, month, year])
        staff_id_month_year: {
          staff_id: staffId,
          month: month,
          year: year,
        },
      },
      update: {
        target_revenue: targetRevenue,
      },
      create: {
        staff_id: staffId,
        month: month,
        year: year,
        target_revenue: targetRevenue,
      },
    });

    return result;
  }
}
