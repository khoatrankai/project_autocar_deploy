import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderCode(tx: any, prefix: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefixWithVer = `${prefix}00`; // Đơn mới luôn bắt đầu bằng version 00

    // Tìm mã gốc lớn nhất của năm hiện tại
    const lastOrder = await tx.orders.findFirst({
      where: {
        code: {
          startsWith: prefixWithVer,
          endsWith: currentYear.toString(),
        },
      },
      orderBy: { code: 'desc' }, // Lấy mã cao nhất
    });

    let nextStt = 1;
    if (lastOrder) {
      // Tách STT: DH00[22]2026 -> Bỏ 'DH00' và '2026'
      const lastCode = lastOrder.code;
      const sttPart = lastCode
        .replace(prefixWithVer, '')
        .replace(currentYear.toString(), '');
      nextStt = (parseInt(sttPart) || 0) + 1;
    }

    return `${prefixWithVer}${nextStt}${currentYear}`;
  }

  // =================================================================
  // 1. TẠO ĐƠN HÀNG
  // =================================================================
  async create(dto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // A. Check Partner
      const partner = await tx.partners.findUnique({
        where: { id: BigInt(dto.partner_id) },
      });
      if (!partner) throw new NotFoundException('Khách hàng không tồn tại');
      if (partner.status === 'locked')
        throw new ForbiddenException('Khách hàng bị khóa');

      // B. Xử lý Items & Tồn kho
      let totalAmount = 0;
      const orderItemsData: Prisma.order_itemsCreateManyInput[] = [];

      for (const item of dto.items) {
        const lineTotal = item.quantity * item.price;
        totalAmount += lineTotal;

        const stock = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: BigInt(item.product_id),
              warehouse_id: BigInt(dto.warehouse_id),
            },
          },
        });

        if (!stock || (stock.quantity ?? 0) < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ID ${item.product_id} không đủ tồn kho`,
          );
        }

        // Trừ kho & Ghi Log
        const newQty = (stock.quantity ?? 0) - item.quantity;
        await tx.inventory.update({
          where: { id: stock.id },
          data: { quantity: newQty },
        });
        await tx.inventory_logs.create({
          data: {
            warehouse_id: BigInt(dto.warehouse_id),
            product_id: BigInt(item.product_id),
            change_amount: -item.quantity,
            balance_after: newQty,
            type: 'sale',
            note: `Bán hàng đơn mới`,
          },
        });

        const prod = await tx.products.findUnique({
          where: { id: BigInt(item.product_id) },
        });
        orderItemsData.push({
          product_id: BigInt(item.product_id),
          product_sku: prod?.sku,
          product_name: prod?.name,
          quantity: item.quantity,
          price: item.price,
          discount: 0,
        });
      }

      // C. Sinh mã và Tạo đơn
      const finalAmount = Math.max(0, totalAmount - (dto.discount || 0));
      const newOrderCode = await this.generateOrderCode(tx, 'DH');

      const newOrder = await tx.orders.create({
        data: {
          code: newOrderCode,
          partner_id: BigInt(dto.partner_id),
          warehouse_id: BigInt(dto.warehouse_id),
          staff_id: dto.staff_id || userId,
          total_amount: totalAmount,
          discount: dto.discount || 0,
          final_amount: finalAmount,
          paid_amount: dto.paid_amount || 0,
          status: 'pending',
          note: dto.note,
          order_items: { createMany: { data: orderItemsData } },
        },
      });

      // D. Cập nhật công nợ Partner
      const debtChange = finalAmount - (dto.paid_amount || 0);
      await tx.partners.update({
        where: { id: BigInt(dto.partner_id) },
        data: {
          current_debt: { increment: debtChange },
          total_revenue: { increment: finalAmount },
        },
      });

      return newOrder;
    });
  }

  // =================================================================
  // 2. CẬP NHẬT ĐƠN HÀNG (VERSIONING)
  // =================================================================
  async update(id: string, dto: Partial<CreateOrderDto>, userId: string) {
    const orderId = BigInt(id);
    return this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.orders.findUnique({
        where: { id: orderId },
      });
      if (!currentOrder) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (currentOrder.status === 'completed')
        throw new BadRequestException('Đơn đã hoàn thành, không thể sửa');

      // LOGIC ĐỔI MÃ: DH00222026 -> DH01222026
      const prefix = 'DH';
      const currentCode = currentOrder.code;
      const verStr = currentCode.substring(prefix.length, prefix.length + 2);
      const nextVer = (parseInt(verStr) + 1).toString().padStart(2, '0');
      const sttAndYear = currentCode.substring(prefix.length + 2);
      const updatedCode = `${prefix}${nextVer}${sttAndYear}`;

      let totalAmount = Number(currentOrder.total_amount);

      // Nếu có gửi lại danh sách hàng, xóa cũ tạo mới
      if (dto.items && dto.items.length > 0) {
        await tx.order_items.deleteMany({ where: { order_id: orderId } });
        const newItems: Prisma.order_itemsCreateManyInput[] = [];
        let newTotal = 0;

        for (const item of dto.items) {
          newTotal += item.quantity * item.price;
          const p = await tx.products.findUnique({
            where: { id: BigInt(item.product_id) },
          });
          newItems.push({
            order_id: orderId,
            product_id: BigInt(item.product_id),
            product_sku: p?.sku,
            product_name: p?.name,
            quantity: item.quantity,
            price: item.price,
            discount: 0,
          });
        }
        await tx.order_items.createMany({ data: newItems });
        totalAmount = newTotal;
      }

      const finalAmount = Math.max(
        0,
        totalAmount - (dto.discount || Number(currentOrder.discount)),
      );

      return await tx.orders.update({
        where: { id: orderId },
        data: {
          code: updatedCode,
          note: dto.note,
          discount: dto.discount,
          paid_amount: dto.paid_amount,
          total_amount: totalAmount,
          final_amount: finalAmount,
          status: (dto as any).status || currentOrder.status,
          staff_id: dto.staff_id || userId,
        },
      });
    });
  }

  async remove(id: string) {
    const orderId = BigInt(id);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
      });

      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

      // KHÔNG cho xóa đơn đã hoàn thành
      if (order.status === 'completed') {
        throw new BadRequestException(
          'Không thể xóa đơn hàng đã hoàn thành. Vui lòng hủy đơn trước.',
        );
      }

      // Xóa items trước sau đó xóa đơn
      await tx.order_items.deleteMany({ where: { order_id: orderId } });
      await tx.orders.delete({ where: { id: orderId } });

      return { message: 'Xóa đơn hàng thành công' };
    });
  }

  async removeMany(ids: string[]) {
    const results = {
      success: 0,
      failed: 0,
      details: [] as { id: string; error: string }[],
    };

    // Duyệt qua từng ID để xóa (đảm bảo tính độc lập, cái nào lỗi thì bỏ qua cái đó)
    for (const id of ids) {
      try {
        await this.remove(id); // Gọi lại hàm remove đơn lẻ đã có logic check status
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.details.push({
          id,
          error: error.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      message: `Xóa hoàn tất: Thành công ${results.success}, Thất bại ${results.failed}`,
      ...results,
    };
  }

  async findAll(query: { startDate?: string; endDate?: string } = {}) {
    const { startDate, endDate } = query;

    // Khởi tạo điều kiện where rỗng
    const where: Prisma.ordersWhereInput = {};

    // Nếu có truyền ngày thì thêm điều kiện lọc
    if (startDate || endDate) {
      where.created_at = {};

      if (startDate) {
        // Lấy từ đầu ngày của startDate (nếu frontend truyền chuẩn ISO thì không cần setHours)
        where.created_at.gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        // Đảm bảo lấy đến cuối ngày (23:59:59.999) của ngày kết thúc
        // (Rất quan trọng nếu frontend chỉ truyền dạng 'YYYY-MM-DD')
        end.setHours(23, 59, 59, 999);
        where.created_at.lte = end;
      }
    }

    return this.prisma.orders.findMany({
      where, // Truyền điều kiện lọc vào đây
      include: {
        order_items: true,
        partners: { select: { name: true, phone: true } },
        warehouses: { select: { name: true } },
        profiles: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getProductStockCard(productId: string) {
    // 1. Lấy tồn kho hiện tại (Tổng tất cả các kho của sản phẩm này)
    const productInventory = await this.prisma.inventory.aggregate({
      where: { product_id: BigInt(productId) },
      _sum: { quantity: true },
    });

    // Tồn kho thực tế hiện tại (Ví dụ: 47)
    let currentTotalStock = productInventory._sum.quantity || 0;

    // 2. Lấy lịch sử bán hàng (Chỉ lấy đơn completed), sắp xếp MỚI NHẤT lên đầu
    const salesHistory = await this.prisma.order_items.findMany({
      where: {
        product_id: BigInt(productId),
        orders: {
          status: 'completed', // Chỉ tính đơn đã hoàn thành/trừ kho
        },
      },
      include: {
        orders: {
          include: {
            partners: { select: { name: true } }, // Lấy tên đối tác
          },
        },
        products: {
          select: { cost_price: true }, // Lấy giá vốn hiện tại (từ bảng products)
        },
      },
      orderBy: {
        created_at: 'desc', // Quan trọng: Mới nhất trước
      },
    });

    // 3. Thuật toán tính ngược Tồn cuối (Back-calculation)
    // Biến chạy để lưu tồn kho tại thời điểm đang xét
    let runningStock = currentTotalStock;

    const result = salesHistory.map((item) => {
      const quantitySold = Number(item.quantity); // VD: 4

      // Tại dòng này (thời điểm này), tồn kho chính là runningStock hiện tại
      const stockAfterThisSale = runningStock;

      // Chuẩn bị cho dòng tiếp theo (dòng cũ hơn trong quá khứ)
      // Trước khi bán đơn này, kho phải có nhiều hơn: Tồn + SL bán
      runningStock = runningStock + quantitySold;

      return {
        id: item.id.toString(),
        chung_tu: item.orders?.code, // Mã chứng từ (HD...)
        thoi_gian: item.orders?.created_at, // Thời gian
        doi_tac: item.orders?.partners?.name, // Tên khách hàng
        gia_gd: Number(item.price), // Giá bán

        // Lưu ý: Đây là giá vốn hiện tại của SP.
        // Để chính xác lịch sử, bảng order_items nên có cột cost_price riêng.
        gia_von: Number(item.products?.cost_price || 0),

        so_luong: -quantitySold, // Hiển thị số âm vì là xuất kho
        ton_cuoi: stockAfterThisSale, // [QUAN TRỌNG] Tồn cuối tính toán được
      };
    });

    return result;
  }

  async findOne(id: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: BigInt(id) },
      include: {
        // 1. Thông tin Khách hàng (Đối tác)
        partners: {
          select: {
            name: true,
            phone: true,
            address: true,
            code: true,
          },
        },
        // 2. Thông tin Kho/Cửa hàng (Để in Header hóa đơn)
        warehouses: {
          select: {
            name: true,
            address: true,
            // phone: true, // Nếu schema kho có sđt
          },
        },
        // 3. Thông tin Nhân viên bán
        profiles: {
          select: {
            full_name: true,
          },
        },
        // 4. Danh sách hàng hóa
        order_items: {
          include: {
            products: {
              select: {
                unit: true, // Lấy ĐVT từ bảng product gốc (vì order_items không lưu)
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    // 5. Serialize BigInt và Format dữ liệu trả về cho Frontend dễ dùng
    return JSON.parse(
      JSON.stringify(order, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  async getDailySales(targetDate: Date) {
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return this.prisma.orders.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        partners: { select: { name: true, phone: true } }, // Ai mua
        order_items: {
          include: { products: { select: { name: true, sku: true } } }, // Mua món gì
        },
      },
    });
  }

  async calculateRevenueAndProfit(
    startDate: Date,
    endDate: Date,
    staffId?: string,
  ) {
    // 1. Tính TỔNG BÁN RA trong khoảng thời gian
    const orders = await this.prisma.orders.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: 'completed',
        ...(staffId && { staff_id: staffId }), // Lọc theo nhân viên nếu có
      },
      include: {
        order_items: {
          include: { products: { select: { cost_price: true } } },
        },
      },
    });

    let grossRevenue = 0;
    let totalCost = 0;

    for (const order of orders) {
      grossRevenue += Number(order.final_amount);

      // Tính giá vốn (cost) của đơn hàng
      const orderCost = order.order_items.reduce((sum, item) => {
        return (
          sum + Number(item.quantity) * Number(item.products?.cost_price || 0)
        );
      }, 0);
      totalCost += orderCost;
    }

    // 2. Tính TỔNG TRẢ LẠI (Giải quyết bài toán tháng N+1 trả hàng của tháng N)
    // Hệ thống sẽ quét các phiếu trả hàng ĐƯỢC TẠO TRONG KỲ NÀY, bất kể đơn gốc từ bao giờ.
    const returns = await this.prisma.returns.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        status: 'completed',
        // Nếu tính cho nhân viên, ta phải join ngược về order để biết đơn này của ai bán
        ...(staffId && { orders: { staff_id: staffId } }),
      },
      include: {
        return_items: {
          include: { products: { select: { cost_price: true } } },
        },
      },
    });

    let returnRevenueDeduction = 0; // Số tiền doanh thu bị trừ đi do trả hàng
    let returnCostRecovery = 0; // Số tiền vốn được hoàn lại (do lấy lại hàng)

    for (const ret of returns) {
      returnRevenueDeduction += Number(ret.total_refund);

      const retCost = ret.return_items.reduce((sum, item) => {
        return (
          sum + Number(item.quantity) * Number(item.products?.cost_price || 0)
        );
      }, 0);
      returnCostRecovery += retCost;
    }

    // 3. CHỐT SỐ LIỆU CUỐI CÙNG (NET)
    const netRevenue = grossRevenue - returnRevenueDeduction;
    const netCost = totalCost - returnCostRecovery;
    const netProfit = netRevenue - netCost;

    return {
      period: { start: startDate, end: endDate },
      staffId: staffId || 'ALL_COMPANY',
      grossRevenue, // Doanh thu thô (chưa trừ trả hàng)
      returnDeduction: returnRevenueDeduction, // Tiền bị hoàn trả
      netRevenue, // DOANH THU THỰC TẾ (Để tính lương)
      netCost, // Vốn thực tế
      netProfit, // LỢI NHUẬN THỰC TẾ
    };
  }

  async getOverdueDebts(allowedDebtDays: number = 30) {
    // Tính ngày giới hạn: Ví dụ đơn hàng trước ngày này mà chưa trả hết là quá hạn
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() - allowedDebtDays);

    return this.prisma.orders.findMany({
      where: {
        status: 'completed',
        created_at: { lt: deadlineDate }, // Đơn hàng tạo trước thời hạn
        paid_amount: { lt: this.prisma.orders.fields.final_amount }, // Trả chưa đủ
      },
      include: {
        partners: { select: { name: true, phone: true } },
        profiles: { select: { full_name: true } }, // Sale phụ trách
      },
    });
  }

  async calculateDetailedPayroll(staffId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Ngày cuối tháng

    // 1. Lấy thông tin đơn hàng của nhân viên trong tháng
    const orders = await this.prisma.orders.findMany({
      where: {
        staff_id: staffId,
        created_at: { gte: startDate, lte: endDate },
        status: 'completed', // Ràng buộc đúng chuẩnƠP
      },
      include: { order_items: { include: { products: true } } },
    });

    let totalRevenue = 0; // Tổng thu (bao gồm VAT)
    let netRevenue = 0; // Doanh thu thực (không tính VAT)
    let totalCost = 0; // Tổng giá vốn
    let totalVat = 0; // Tổng tiền VAT phải nộp
    let staffGrabFee = 0; // Tổng phí Grab Sale phải chịu
    let companyGrabFee = 0; // Tổng phí Grab Công ty chịu

    for (const order of orders) {
      const orderFinalAmount = Number(order.final_amount);
      totalRevenue += orderFinalAmount;

      // Xử lý VAT (Tác vụ 6)
      if (order.has_vat) {
        totalVat += Number(order.vat_amount);
        netRevenue += orderFinalAmount - Number(order.vat_amount);
      } else {
        netRevenue += orderFinalAmount;
      }

      // Xử lý Phí Grab (Tác vụ 5)
      if (order.shipping_payer === 'staff') {
        staffGrabFee += Number(order.shipping_fee);
      } else {
        companyGrabFee += Number(order.shipping_fee);
      }

      // Tính giá vốn
      const orderCost = order.order_items.reduce(
        (sum, item) =>
          sum + Number(item.quantity) * Number(item.products?.cost_price || 0),
        0,
      );
      totalCost += orderCost;
    }

    // Lợi nhuận cho Sale = Doanh thu thực - Vốn - Phí Grab Sale chịu
    const profitForSale = netRevenue - totalCost - staffGrabFee;

    // 2. Lấy chỉ tiêu KPI (Tác vụ 7)
    const target = await this.prisma.sales_targets.findUnique({
      where: { staff_id_month_year: { staff_id: staffId, month, year } },
    });
    const targetRevenue = target ? Number(target.target_revenue) : 0;
    const isTargetAchieved = netRevenue >= targetRevenue;

    return {
      staffId,
      month,
      year,
      totalRevenue,
      totalVat, // Để kế toán xuất VAT
      netRevenue, // Doanh thu tính hoa hồng
      totalCost,
      staffGrabFee, // Trừ vào lương Sale
      companyGrabFee, // Chi phí công ty
      profitForSale, // Lợi nhuận để nhân chia % hoa hồng
      kpi: {
        target: targetRevenue,
        achieved: netRevenue,
        passed: isTargetAchieved,
      },
    };
  }
}
