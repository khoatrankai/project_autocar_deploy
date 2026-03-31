// src/modules/system-backups/system-backups.controller.ts
import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { SystemBackupsService } from './system-backups.service';
import { SupabaseGuard } from 'src/auth/supabase.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { UserRole } from 'src/auth/dto/auth.dto';

@Controller('system-backups')
@UseGuards(SupabaseGuard)
export class SystemBackupsController {
  constructor(private readonly service: SystemBackupsService) {}

  @Get('history')
  async getHistory() {
    return await this.service.getBackupHistory();
  }

  @Post('restore')
  async restore(@Body('batchCode') batchCode: string) {
    return await this.service.restoreBatch(batchCode);
  }

  @Post('clear-inventory')
  async clearInv(@Body('reason') reason: string, @Req() req: any) {
    return await this.service.clearInventoryWithBackup(req.user.id, reason);
  }

  @Get('products/history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy lịch sử sao lưu của sản phẩm' })
  async getProductHistory() {
    return await this.service.getProductBackupHistory();
  }

  @Post('products/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Khôi phục sản phẩm theo mã Batch' })
  async restoreProducts(@Body('batchCode') batchCode: string) {
    // Hàm restoreBatch này chúng ta đã viết ở bước trước,
    // nó sẽ tự động nạp lại Products, Inventory và Compatibility.
    return await this.service.restoreBatch(batchCode);
  }

  @Post('products/restore-last-month')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Khôi phục TẤT CẢ sản phẩm bị xóa trong 1 tháng qua',
  })
  async restoreAllLastMonth() {
    return await this.service.restoreAllProductDeletedInLastMonth();
  }
}
