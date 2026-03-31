// src/modules/system-backups/system-backups.module.ts
import { Module } from '@nestjs/common';
import { SystemBackupsService } from './system-backups.service';
import { SystemBackupsController } from './system-backups.controller';
import { SharedModule } from 'src/shared/shared.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [SharedModule, AuthModule], // Import PrismaModule để sử dụng PrismaService
  controllers: [SystemBackupsController],
  providers: [SystemBackupsService],
  exports: [SystemBackupsService], // Export nếu bạn muốn dùng Service này ở các module khác (như Inventory)
})
export class SystemBackupsModule {}
