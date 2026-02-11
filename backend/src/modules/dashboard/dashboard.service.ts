import { Injectable } from '@nestjs/common';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { Prisma } from '@prisma/client';
import * as moment from 'moment'; // Cần cài: npm i moment
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------
  // 1. TOP CARDS: Doanh thu, Trả hàng, So sánh
  // ----------------------------------------------------
  async getSummaryCards() {
    const todayStart = moment.default().startOf('day').toDate();
    const todayEnd = moment.default().endOf('day').toDate();
    const yesterdayStart = moment
      .default()
      .subtract(1, 'days')
      .startOf('day')
      .toDate();
    const yesterdayEnd = moment
      .default()
      .subtract(1, 'days')
      .endOf('day')
      .toDate();

    // 1.1 Doanh thu hôm nay
    const revenueToday = await this.prisma.orders.aggregate({
      _sum: { final_amount: true },
      _count: { id: true },
      where: {
        created_at: { gte: todayStart, lte: todayEnd },
        status: 'completed',
      },
    });

    // 1.2 Trả hàng hôm nay
    const returnToday = await this.prisma.returns.aggregate({
      _sum: { total_refund: true },
      _count: { id: true },
      where: {
        created_at: { gte: todayStart, lte: todayEnd },
        status: 'completed',
      },
    });

    // 1.3 Doanh thu hôm qua (Để tính % tăng trưởng)
    const revenueYesterday = await this.prisma.orders.aggregate({
      _sum: { final_amount: true },
      where: {
        created_at: { gte: yesterdayStart, lte: yesterdayEnd },
        status: 'completed',
      },
    });

    // Tính toán số liệu
    const totalRevToday = Number(revenueToday._sum.final_amount || 0);
    const totalRevYesterday = Number(revenueYesterday._sum.final_amount || 0);
    const totalReturnVal = Number(returnToday._sum.total_refund || 0);
    const netRevenueToday = totalRevToday - totalReturnVal;

    // Tính % tăng trưởng so với hôm qua
    let growthPercent = 0;
    if (totalRevYesterday > 0) {
      growthPercent =
        ((netRevenueToday - totalRevYesterday) / totalRevYesterday) * 100;
    } else if (netRevenueToday > 0) {
      growthPercent = 100;
    }

    return {
      revenue: totalRevToday,
      orders_count: revenueToday._count.id,
      return_value: totalReturnVal,
      return_count: returnToday._count.id,
      net_revenue: netRevenueToday,
      growth_vs_yesterday: parseFloat(growthPercent.toFixed(2)),
    };
  }

  // ----------------------------------------------------
  // 2. MAIN CHART: Doanh thu thuần theo thời gian & Kho
  // ----------------------------------------------------
  async getRevenueChart(filter: DashboardFilterDto) {
    const from = filter.from_date
      ? new Date(filter.from_date)
      : moment.default().startOf('month').toDate();
    const to = filter.to_date
      ? new Date(filter.to_date)
      : moment.default().endOf('day').toDate();

    // Lấy dữ liệu thô từ DB
    const orders = await this.prisma.orders.findMany({
      where: {
        created_at: { gte: from, lte: to },
        status: 'completed',
      },
      select: {
        created_at: true,
        final_amount: true,
        warehouse_id: true,
        warehouses: { select: { name: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    // Nhóm theo Ngày và Kho (Xử lý bằng JS cho linh hoạt)
    const chartData = {}; // Format: { "2026-02-08": { date: "...", "Kho A": 100, "Kho B": 200 } }

    orders.forEach((order) => {
      const dateKey = moment.default(order.created_at).format('DD/MM');
      const warehouseName = order.warehouses?.name || 'Kho khác';
      const amount = Number(order.final_amount);

      if (!chartData[dateKey]) {
        chartData[dateKey] = { date: dateKey };
      }
      if (!chartData[dateKey][warehouseName]) {
        chartData[dateKey][warehouseName] = 0;
      }
      chartData[dateKey][warehouseName] += amount;
    });

    return Object.values(chartData);
  }

  // ----------------------------------------------------
  // 3. BOTTOM LEFT: Top 10 Hàng bán chạy (Theo doanh thu)
  // ----------------------------------------------------
  async getTopProducts(filter: DashboardFilterDto) {
    // Cần dùng groupBy trên bảng order_items
    // Lưu ý: Logic này tính doanh thu gộp của sản phẩm
    const topProducts = await this.prisma.order_items.groupBy({
      by: ['product_id', 'product_name'],
      _sum: {
        quantity: true,
      },
      // Vì prisma groupBy hạn chế tính sum(price*qty), ta tạm tính theo số lượng hoặc
      // cần dùng raw query để tính chính xác doanh thu từng món.
      // Dưới đây là demo theo số lượng bán
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 10,
      where: {
        created_at: {
          gte: filter.from_date
            ? new Date(filter.from_date)
            : moment.default().startOf('month').toDate(),
        },
      },
    });

    // Để lấy doanh thu chính xác cho từng SP, nên dùng Raw Query:
    /*
    const result = await this.prisma.$queryRaw`
      SELECT product_name, SUM(quantity * price) as revenue
      FROM order_items
      WHERE created_at >= ${from}
      GROUP BY product_id, product_name
      ORDER BY revenue DESC
      LIMIT 10
    `;
    */

    // Map data cho frontend dễ dùng
    return topProducts.map((p) => ({
      name: p.product_name,
      value: Number(p._sum.quantity || 0),
      // Hoặc map doanh thu nếu dùng Raw Query
    }));
  }

  // ----------------------------------------------------
  // 4. BOTTOM RIGHT: Top 10 Khách mua nhiều nhất
  // ----------------------------------------------------
  async getTopCustomers(filter: DashboardFilterDto) {
    const from = filter.from_date
      ? new Date(filter.from_date)
      : moment.default().startOf('month').toDate();

    // 1. Lấy dữ liệu gom nhóm
    const topPartners = await this.prisma.orders.groupBy({
      by: ['partner_id'],
      _sum: { final_amount: true },
      orderBy: { _sum: { final_amount: 'desc' } },
      take: 10,
      where: {
        created_at: { gte: from },
        status: 'completed',
        // Đã lọc partner_id khác null ở DB, nhưng TypeScript chưa biết chắc chắn
        partner_id: { not: null },
      },
    });

    // --- SỬA LỖI Ở ĐÂY ---
    // 2. Lọc bỏ null và lấy danh sách ID an toàn
    const partnerIds = topPartners
      .filter((p) => p.partner_id !== null) // Bước 1: Loại bỏ null
      .map((p) => p.partner_id as bigint); // Bước 2: Ép kiểu về bigint (vì đã lọc null rồi)

    // Nếu không có khách nào (mảng rỗng) -> Trả về rỗng luôn để đỡ query DB lỗi
    if (partnerIds.length === 0) return [];

    // 3. Query tên khách hàng
    const partnersInfo = await this.prisma.partners.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true },
    });

    // 4. Map dữ liệu trả về
    return topPartners.map((p) => {
      // Xử lý an toàn cho số tiền (tránh null)
      const revenue = Number(p._sum.final_amount ?? 0);

      // Nếu không có ID (trường hợp hiếm)
      if (!p.partner_id) {
        return { name: 'Khách lẻ', value: revenue };
      }

      // So sánh 2 BigInt trực tiếp
      const info = partnersInfo.find((i) => i.id === p.partner_id);

      return {
        name: info?.name || 'Khách vãng lai', // Fallback name
        value: revenue,
      };
    });
  }

  // ----------------------------------------------------
  // 5. RIGHT SIDEBAR: Hoạt động gần đây
  // ----------------------------------------------------
  async getRecentActivities() {
    // Lấy từ bảng activity_logs mà ta đã tích hợp vào OrdersService
    const logs = await this.prisma.activity_logs.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        users: { select: { id: true, role: true } }, // Nếu bảng users có tên thì select tên
      },
    });

    // Nếu muốn hiển thị đẹp như hình (Có tên người, hành động, số tiền)
    // Ta cần format lại log. Ví dụ details lưu { amount: 150000, code: 'DH...' }
    return logs.map((log) => {
      const details = log.details as any;
      return {
        id: log.id.toString(),
        user: log.user_name || 'Hệ thống', // Cần lưu user_name khi tạo log
        action:
          log.action === 'CREATE_ORDER' ? 'vừa bán đơn hàng' : 'vừa thao tác',
        amount: details?.final_amount || details?.amount || 0,
        time: log.created_at,
        code: details?.code,
      };
    });
  }
}
