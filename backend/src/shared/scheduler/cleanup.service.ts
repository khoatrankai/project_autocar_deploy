// src/shared/scheduler/cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await this.prisma.system_backups.deleteMany({
      where: {
        created_at: { lt: thirtyDaysAgo },
      },
    });

    this.logger.log(
      `Đã dọn dẹp ${deleted.count} bản ghi sao lưu quá hạn 30 ngày.`,
    );
  }
}
