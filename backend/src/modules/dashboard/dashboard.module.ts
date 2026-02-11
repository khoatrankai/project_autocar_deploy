import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module'; // Import cái này!
import { AuthModule } from 'src/auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SharedModule, AuthModule], // <-- QUAN TRỌNG: Phải có dòng này mới dùng được DB
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
