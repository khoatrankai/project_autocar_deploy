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

  async create(dto: CreateOrderDto, userId: string) {
    const {
      partner_id,
      warehouse_id,
      staff_id,
      items,
      paid_amount,
      discount = 0,
      payment_method = 'cash',
      note,
      code,
    } = dto;

    // Lấy nhân viên tạo đơn (ưu tiên từ DTO nếu admin tạo hộ, không thì lấy từ token)
    const finalStaffId = staff_id || userId;

    // Sử dụng Prisma Transaction (All or Nothing)
    return this.prisma.$transaction(async (tx) => {
      // ---------------------------------------------------------
      // 1. KIỂM TRA KHÁCH HÀNG (Partner Checks)
      // ---------------------------------------------------------
      const partner = await tx.partners.findUnique({
        where: { id: BigInt(partner_id) },
      });

      if (!partner) throw new NotFoundException('Khách hàng không tồn tại');
      if (partner.status === 'locked')
        throw new ForbiddenException('Khách hàng đang bị khóa giao dịch');

      // ---------------------------------------------------------
      // 2. XỬ LÝ HÀNG HÓA & TỒN KHO (Inventory Loop)
      // ---------------------------------------------------------
      let totalAmount = 0;

      // Khai báo kiểu dữ liệu rõ ràng để tránh lỗi 'never'
      const orderItemsData: Prisma.order_itemsCreateManyOrdersInput[] = [];

      for (const item of items) {
        const lineTotal = item.quantity * item.price;
        totalAmount += lineTotal;

        // A. Tìm bản ghi tồn kho
        const stock = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: BigInt(item.product_id),
              warehouse_id: BigInt(warehouse_id),
            },
          },
        });

        // B. Check số lượng (Fix lỗi object is possibly null)
        const currentStock = stock?.quantity ?? 0; // Nếu null thì coi là 0

        if (!stock || currentStock < item.quantity) {
          const product = await tx.products.findUnique({
            where: { id: BigInt(item.product_id) },
          });
          throw new BadRequestException(
            `Sản phẩm "${product?.name}" không đủ hàng tại kho này. (Tồn: ${currentStock}, Yêu cầu: ${item.quantity})`,
          );
        }

        // C. Trừ tồn kho
        const newQuantity = currentStock - item.quantity;
        await tx.inventory.update({
          where: { id: stock.id },
          data: { quantity: newQuantity },
        });

        // D. Ghi Log Kho (Inventory Log) - Bắt buộc để truy vết
        await tx.inventory_logs.create({
          data: {
            warehouse_id: BigInt(warehouse_id),
            product_id: BigInt(item.product_id),
            change_amount: -item.quantity, // Số âm vì xuất bán
            balance_after: newQuantity,
            type: 'sale',
            note: `Bán hàng đơn: ${code || 'Mới'}`,
          },
        });

        // E. Chuẩn bị data cho Order Items (Snapshot giá & tên)
        const productInfo = await tx.products.findUnique({
          where: { id: BigInt(item.product_id) },
        });

        orderItemsData.push({
          product_id: BigInt(item.product_id),
          product_sku: productInfo?.sku,
          product_name: productInfo?.name,
          quantity: item.quantity,
          price: item.price,
          discount: 0, // Logic giảm giá từng dòng (nếu cần mở rộng sau này)
        });
      }

      // ---------------------------------------------------------
      // 3. TÍNH TOÁN TÀI CHÍNH (Financial Calculation)
      // ---------------------------------------------------------
      // Tổng tiền cuối cùng = Tổng hàng - Giảm giá
      const finalAmount = Math.max(0, totalAmount - discount);

      // Thay đổi công nợ = Tiền phải trả - Tiền khách đưa
      // (+): Khách nợ thêm, (-): Khách trả dư/tiền thừa
      const debtChange = finalAmount - paid_amount;

      // ---------------------------------------------------------
      // 4. CHECK HẠN MỨC CÔNG NỢ (Debt Limit Check)
      // ---------------------------------------------------------
      const currentDebt = Number(partner.current_debt || 0);
      const debtLimit = Number(partner.debt_limit || 0);

      // Dự kiến nợ mới sau khi giao dịch xong
      const newDebtForecast = currentDebt + debtChange;

      if (newDebtForecast > debtLimit) {
        throw new BadRequestException(
          `Vượt hạn mức nợ. Nợ hiện tại: ${currentDebt.toLocaleString()}, Đơn này nợ thêm: ${debtChange.toLocaleString()}, Hạn mức: ${debtLimit.toLocaleString()}`,
        );
      }

      // ---------------------------------------------------------
      // 5. TẠO ĐƠN HÀNG (Orders)
      // ---------------------------------------------------------
      const newOrderCode = code || `DH${Date.now()}`;

      const newOrder = await tx.orders.create({
        data: {
          code: newOrderCode,
          partner_id: BigInt(partner_id),
          warehouse_id: BigInt(warehouse_id),
          staff_id: finalStaffId,
          total_amount: totalAmount,
          discount: discount,
          final_amount: finalAmount,
          paid_amount: paid_amount,
          status: 'completed',
          note: note,
          // Tạo luôn items trong cú pháp create của order (Clean hơn)
          order_items: {
            createMany: {
              data: orderItemsData,
            },
          },
        },
      });

      // ---------------------------------------------------------
      // 6. CẬP NHẬT PARTNER (Partners)
      // ---------------------------------------------------------
      // Chỉ update nếu có phát sinh doanh số hoặc công nợ
      if (finalAmount > 0 || debtChange !== 0) {
        await tx.partners.update({
          where: { id: BigInt(partner_id) },
          data: {
            current_debt: { increment: debtChange }, // Cộng thêm phần nợ mới (hoặc trừ đi nếu trả dư)
            total_revenue: { increment: finalAmount }, // Cộng dồn doanh số mua hàng
          },
        });
      }

      // ---------------------------------------------------------
      // 7. TẠO PHIẾU THU (Transactions)
      // ---------------------------------------------------------
      if (paid_amount > 0) {
        await tx.transactions.create({
          data: {
            code: `PT${Date.now()}`,
            amount: paid_amount,
            type: 'receipt', // Thu tiền
            payment_method: payment_method,
            partner_id: BigInt(partner_id),
            order_id: newOrder.id,
            staff_id: finalStaffId,
            note: `Thu tiền đơn hàng ${newOrderCode}`,
            // category_id: ... (nếu có loại thu chi)
          },
        });
      }

      // ---------------------------------------------------------
      // 8. LOG ADMIN (Activity Logs) - Optional
      // ---------------------------------------------------------
      const staffProfile = await tx.profiles.findUnique({
        where: { id: finalStaffId },
      });
      console.log(staffProfile);
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_name: staffProfile?.full_name || 'Nhân viên', // <--- THÊM DÒNG NÀY
          action: 'CREATE_ORDER',
          entity: 'orders',
          entity_id: newOrder.id.toString(),
          details: {
            code: newOrderCode,
            final_amount: finalAmount,
            debt_change: debtChange,
          },
        },
      });

      return newOrder;
    });
  }

  async findAll() {
    return this.prisma.orders.findMany({
      include: {
        order_items: true,
        partners: { select: { name: true, phone: true } },
        warehouses: { select: { name: true } }, // Join thêm tên kho
        profiles: { select: { full_name: true } }, // Tên nhân viên
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
