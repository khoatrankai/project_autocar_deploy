import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
// import { SupabaseGuard } from '../../auth/supabase.guard';

@ApiTags('Dashboard (Báo cáo)')
@Controller('dashboard')
// @UseGuards(SupabaseGuard) // Bật auth nếu cần
// @ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Lấy thẻ tổng quan (Doanh thu, Trả hàng...)' })
  getSummary() {
    return this.dashboardService.getSummaryCards();
  }

  @Get('chart')
  @ApiOperation({ summary: 'Lấy dữ liệu biểu đồ doanh thu' })
  getChart(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getRevenueChart(filter);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top 10 hàng bán chạy' })
  getTopProducts(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getTopProducts(filter);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top 10 khách mua nhiều' })
  getTopCustomers(@Query() filter: DashboardFilterDto) {
    return this.dashboardService.getTopCustomers(filter);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Hoạt động gần đây (Sidebar phải)' })
  getActivities() {
    return this.dashboardService.getRecentActivities();
  }
}
