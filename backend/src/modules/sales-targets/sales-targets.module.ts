import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { SharedModule } from 'src/shared/shared.module';
import { SalesTargetsController } from './sales-targets.controller';
import { SalesTargetsService } from './sales-targets.service';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [SalesTargetsController],
  providers: [SalesTargetsService],
  exports: [SalesTargetsService], // Export nếu các module khác (như Auth) cần dùng
})
export class SalesTargetsModule {}
