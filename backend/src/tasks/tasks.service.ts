import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from 'src/modules/products/products.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class TasksService {
  // Tạo logger để theo dõi log trong console
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  // ========================================================
  // Cấu hình chạy lúc 2:00 sáng hàng ngày
  // Ký hiệu: '0 2 * * *' (Giây - Phút - Giờ - Ngày - Tháng - Thứ)
  // ========================================================
  @Cron('0 2 * * *', {
    name: 'calculate_daily_sales',
    timeZone: 'Asia/Ho_Chi_Minh', // Quan trọng: Set múi giờ Việt Nam
  })
  async handleCalculateSalesMetrics() {
    this.logger.log('Bắt đầu Cronjob: Tính toán tốc độ bán hàng...');

    try {
      // Gọi hàm executeRaw mà bạn đã viết trong ProductsService
      await this.productsService.updateSalesMetrics();

      this.logger.log('Hoàn thành Cronjob: Đã cập nhật xong dữ liệu.');
    } catch (error) {
      this.logger.error('Lỗi Cronjob:', error);
    }
  }

  /**
   * Tự động chạy vào lúc 00:00 ngày Mùng 1 hàng tháng
   * Cú pháp Cron: Giây Phút Giờ Ngày Tháng Ngày_trong_tuần
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyKpi() {
    this.logger.log('🔄 Bắt đầu tiến trình tự động tạo KPI tháng mới...');

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() trả về 0-11
    const currentYear = today.getFullYear();

    // Xác định tháng/năm trước đó để lấy KPI làm mốc
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    try {
      // 1. Lấy danh sách tất cả nhân viên Sale đang hoạt động
      const salesStaffs = await this.prisma.profiles.findMany({
        where: { role: 'sale' }, // Giả định role của bạn lưu là 'sale'
        select: { id: true },
      });

      if (salesStaffs.length === 0) {
        this.logger.log('⚠️ Không có nhân viên Sale nào trong hệ thống.');
        return;
      }

      // 2. Lấy tất cả KPI của tháng trước để copy sang
      const prevTargets = await this.prisma.sales_targets.findMany({
        where: { month: prevMonth, year: prevYear },
        select: { staff_id: true, target_revenue: true },
      });

      // Tạo một Map để dò tìm cho nhanh (Key: staff_id, Value: target_revenue)
      const prevTargetMap = new Map(
        prevTargets.map((t) => [t.staff_id, Number(t.target_revenue)]),
      );

      // 3. Lắp ráp dữ liệu KPI cho tháng mới
      const newTargetsData = salesStaffs.map((staff) => ({
        staff_id: staff.id,
        month: currentMonth,
        year: currentYear,
        // Lấy target tháng trước, nếu nhân viên mới tinh thì set bằng 0
        target_revenue: prevTargetMap.get(staff.id) || 0,
      }));

      // 4. Lưu vào Database cực kỳ an toàn bằng createMany + skipDuplicates
      // skipDuplicates sẽ bỏ qua nếu KPI của (nhân viên, tháng, năm) đó ĐÃ TỒN TẠI
      // (Nhờ thuộc tính @@unique([staff_id, month, year]) trong schema của bạn)
      const result = await this.prisma.sales_targets.createMany({
        data: newTargetsData,
        skipDuplicates: true,
      });

      this.logger.log(
        `✅ Thành công! Đã tạo/cập nhật KPI cho ${result.count} nhân sự.`,
      );
    } catch (error) {
      this.logger.error('❌ Lỗi khi chạy Cron Job tạo KPI:', error);
    }
  }
}
