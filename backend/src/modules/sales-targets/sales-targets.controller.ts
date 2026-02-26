import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesTargetsService } from './sales-targets.service';
import { SetSalesTargetDto } from './dto/set-kpi.dto';
import { SupabaseGuard } from 'src/auth/supabase.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/dto/auth.dto';
// import SupabaseGuard hoặc AuthGuard của bạn...

@ApiTags('Sales Target')
@Controller('sales-targets')
export class SalesTargetsController {
  constructor(private readonly service: SalesTargetsService) {}

  @ApiBearerAuth()
  @ApiBearerAuth() // <--- Hiện ổ khóa trên Swagger
  @UseGuards(SupabaseGuard) // <--- Kích hoạt bảo vệ
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @Post('manual')
  async setManualKpi(@Body() body: SetSalesTargetDto) {
    const result = await this.service.setManualKpi(body);

    // Convert lại dữ liệu trả về để tránh lỗi Decimal/BigInt sang JSON (Nếu có)
    return {
      success: true,
      message: 'Cập nhật chỉ tiêu KPI thành công',
      data: {
        ...result,
        id: result.id.toString(), // Chuyển BigInt id thành string
        target_revenue: Number(result.target_revenue), // Chuyển Decimal thành Number
      },
    };
  }
}
