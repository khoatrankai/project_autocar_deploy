import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { FilterPurchaseOrderDto } from './dto/filter-purchase-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generatePurchaseOrderCode(
    tx: any,
    prefix: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefixWithVer = `${prefix}00`; // Phiếu nhập mới luôn bắt đầu bằng version 00 (VD: PN00)

    // Tìm mã phiếu nhập lớn nhất của năm hiện tại
    const lastOrder = await tx.purchase_orders.findFirst({
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
      // Tách STT: PN00[22]2026 -> Bỏ 'PN00' và '2026'
      const lastCode = lastOrder.code;
      const sttPart = lastCode
        .replace(prefixWithVer, '')
        .replace(currentYear.toString(), '');
      nextStt = (parseInt(sttPart) || 0) + 1;
    }

    // Trả về format: PN00 + STT + 2026
    return `${prefixWithVer}${nextStt}${currentYear}`;
  }
  // ====================================================================
  // TẠO PHIẾU NHẬP HÀNG (PO)
  // ====================================================================
  async create(
    data: any /* thay bằng CreatePurchaseOrderDto */,
    staffId: string,
  ) {
    const {
      items,
      supplier_id,
      warehouse_id,
      status,
      staff_id,
      discount = 0,
      paid_amount = 0,
      note,
      code,
    } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('Phiếu nhập phải có ít nhất 1 sản phẩm');
    }

    // Tính toán tổng tiền
    let total_amount = 0;
    items.forEach((item) => {
      total_amount += item.quantity * item.import_price;
    });

    const final_amount = total_amount - discount;

    // Bọc toàn bộ trong Transaction để khóa row, tránh tình trạng 2 nhân viên
    // cùng tạo phiếu một lúc dẫn đến trùng mã Code
    return await this.prisma.$transaction(async (tx) => {
      // Lấy mã từ request HOẶC tự động sinh mã mới
      const orderCode =
        code || (await this.generatePurchaseOrderCode(tx, 'PN'));

      const result = await tx.purchase_orders.create({
        data: {
          code: orderCode,
          supplier_id: supplier_id ? BigInt(supplier_id) : undefined,
          warehouse_id: warehouse_id ? BigInt(warehouse_id) : undefined,
          staff_id: staff_id || staffId, // Nếu client không gửi thì lấy staffId từ Token
          total_amount: total_amount,
          discount: discount,
          final_amount: final_amount,
          paid_amount: paid_amount,
          note: note,
          status: status || 'completed', // Mặc định là hoàn thành

          purchase_order_items: {
            create: items.map((item) => ({
              product_id: BigInt(item.product_id),
              quantity: item.quantity,
              import_price: item.import_price,
            })),
          },
        },
        include: {
          purchase_order_items: true,
        },
      });

      // Format lại BigInt và Decimal trước khi trả về Frontend
      return {
        ...result,
        id: result.id.toString(),
        supplier_id: result.supplier_id?.toString(),
        warehouse_id: result.warehouse_id?.toString(),
        total_amount: Number(result.total_amount),
        final_amount: Number(result.final_amount),
        discount: Number(result.discount),
        paid_amount: Number(result.paid_amount),
        purchase_order_items: result.purchase_order_items.map((item) => ({
          ...item,
          id: item.id.toString(),
          product_id: item.product_id,
          purchase_order_id: item.purchase_order_id,
          import_price: Number(item.import_price),
        })),
      };
    });
  }

  // ====================================================================
  // LẤY DANH SÁCH PHIẾU NHẬP
  // ====================================================================
  async findAll(query: any) {
    const { page = 1, limit = 10, search, from, to } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }

    if (from || to) {
      where.import_date = {};
      if (from) where.import_date.gte = new Date(from);
      if (to) where.import_date.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { import_date: 'desc' },
        include: {
          // SỬA: Trong schema tên quan hệ là 'partners' chứ không phải 'supplier'
          partners: { select: { name: true } },
          // SỬA: Trong schema tên quan hệ là 'profiles' chứ không phải 'staff'
          profiles: { select: { full_name: true } },
        },
      }),
      this.prisma.purchase_orders.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        ...item,
        id: item.id.toString(),
        supplier_id: (item?.supplier_id || '').toString(),
        total_amount: Number(item.total_amount),
        final_amount: Number(item.final_amount),
        paid_amount: Number(item.paid_amount),
        // Map lại tên cho FE dễ dùng
        supplier_name: item.partners?.name,
        staff_name: item.profiles?.full_name,
      })),
      meta: { total, page, limit },
    };
  }

  async findAllAdvance(query: FilterPurchaseOrderDto) {
    const {
      page = 1,
      limit = 10,
      search,
      warehouseIds, // List ID chi nhánh
      statuses, // List trạng thái
      dateFrom, // Từ ngày
      dateTo, // Đến ngày
      staffIds, // List ID nhân viên (Người tạo/nhập)
    } = query;

    const skip = (page - 1) * limit;

    // 1. Xây dựng điều kiện Where động
    const where: Prisma.purchase_ordersWhereInput = {
      AND: [],
    };
    const andCond = where.AND as Prisma.purchase_ordersWhereInput[];

    // --- Tìm kiếm chung (Mã phiếu OR Tên nhà cung cấp) ---
    if (search) {
      andCond.push({
        OR: [{ code: { contains: search, mode: 'insensitive' } }],
      });
    }

    // --- Lọc theo Chi nhánh (Kho) ---
    if (warehouseIds && warehouseIds.length > 0) {
      andCond.push({
        warehouse_id: { in: warehouseIds.map((id) => BigInt(id)) },
      });
    }

    // --- Lọc theo Trạng thái ---
    // Frontend gửi lên: ['draft', 'completed', 'cancelled']
    if (statuses && statuses.length > 0) {
      andCond.push({
        status: { in: statuses },
      });
    }

    // --- Lọc theo Thời gian (import_date) ---
    if (dateFrom || dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      // Nếu lọc đến ngày, thường cộng thêm 1 ngày hoặc set cuối ngày để lấy đủ
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter.lte = to;
      }
      andCond.push({ import_date: dateFilter });
    }

    // --- Lọc theo Người tạo/Người nhập (Staff) ---
    if (staffIds && staffIds.length > 0) {
      andCond.push({
        staff_id: { in: staffIds },
      });
    }

    // 2. Thực thi Query
    const [data, total] = await Promise.all([
      this.prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { import_date: 'desc' }, // Mới nhất lên đầu
        include: {
          partners: { select: { id: true, name: true, code: true } }, // Nhà cung cấp
          warehouses: { select: { id: true, name: true } }, // Kho
          profiles: { select: { id: true, full_name: true } }, // Nhân viên
        },
      }),
      this.prisma.purchase_orders.count({ where }),
    ]);

    // 3. Format dữ liệu trả về
    return {
      data: data.map((item) => ({
        id: item.id.toString(),
        code: item.code,
        import_date: item.import_date,
        status: item.status, // 'draft' | 'completed' | 'cancelled'
        note: item.note,

        // Tiền
        total_amount: Number(item.total_amount),
        discount: Number(item.discount),
        final_amount: Number(item.final_amount), // Cần trả NCC
        paid_amount: Number(item.paid_amount),
        debt_amount: Number(item.final_amount) - Number(item.paid_amount), // Tự tính nợ còn lại của phiếu này

        // Relations
        supplier_name: item.partners?.name,
        supplier_code: item.partners?.code,
        warehouse_name: item.warehouses?.name,
        staff_name: item.profiles?.full_name, // Người tạo/nhập
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const orderId = BigInt(id);

    const order = await this.prisma.purchase_orders.findUnique({
      where: { id: orderId },
      include: {
        // Lấy chi tiết các mặt hàng trong phiếu
        purchase_order_items: {
          include: {
            products: {
              select: {
                sku: true,
                name: true,
                unit: true,
                image_url: true,
                cost_price: true,
              },
            },
          },
        },
        // Lấy thông tin nhà cung cấp (tên quan hệ trong schema là partners)
        partners: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
          },
        },
        // Lấy thông tin kho
        warehouses: {
          select: {
            id: true,
            name: true,
          },
        },
        // Lấy thông tin nhân viên tạo
        profiles: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy phiếu nhập hàng có ID ${id}`);
    }

    // Chuyển đổi BigInt và Decimal sang kiểu dữ liệu an toàn cho JSON
    return JSON.parse(
      JSON.stringify(order, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  // ====================================================================
  // CẬP NHẬT PHIẾU NHẬP (PO)
  // ====================================================================
  async update(id: number, data: any, staffId: string) {
    const {
      items,
      supplier_id,
      warehouse_id,
      status,
      discount,
      paid_amount,
      note,
    } = data;

    const orderId = BigInt(id);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra phiếu có tồn tại không
      const currentOrder = await tx.purchase_orders.findUnique({
        where: { id: orderId },
        include: { purchase_order_items: true },
      });

      if (!currentOrder) {
        throw new BadRequestException('Không tìm thấy phiếu nhập hàng');
      }

      // CHẶN SỬA PHIẾU ĐÃ HOÀN THÀNH HOẶC ĐÃ HỦY
      if (currentOrder.status === 'completed') {
        throw new BadRequestException(
          'Phiếu đã nhập kho thành công, không thể chỉnh sửa thông tin.',
        );
      }
      if (currentOrder.status === 'cancelled') {
        throw new BadRequestException('Phiếu đã bị hủy, không thể chỉnh sửa.');
      }

      // 2. Tính toán lại tổng tiền nếu có danh sách items mới (Dành cho phiếu 'draft')
      let total_amount = Number(currentOrder.total_amount);

      if (items && items.length > 0) {
        total_amount = items.reduce(
          (sum, item) => sum + item.quantity * item.import_price,
          0,
        );

        // Xóa sạch items cũ và tạo lại (Chiến thuật thay thế 1-1)
        await tx.purchase_order_items.deleteMany({
          where: { purchase_order_id: orderId },
        });

        await tx.purchase_order_items.createMany({
          data: items.map((item) => ({
            purchase_order_id: orderId,
            product_id: BigInt(item.product_id),
            quantity: item.quantity,
            import_price: item.import_price,
          })),
        });
      }

      const final_discount =
        discount !== undefined ? discount : Number(currentOrder.discount);
      const final_amount = total_amount - final_discount;

      // 3. Cập nhật Header của phiếu
      const updatedOrder = await tx.purchase_orders.update({
        where: { id: orderId },
        data: {
          supplier_id: supplier_id ? BigInt(supplier_id) : undefined,
          warehouse_id: warehouse_id ? BigInt(warehouse_id) : undefined,
          status: status, // Cho phép chuyển từ 'draft' sang 'completed' tại đây
          note: note,
          total_amount: total_amount,
          discount: final_discount,
          final_amount: final_amount,
          paid_amount: paid_amount !== undefined ? paid_amount : undefined,
        },
        include: { purchase_order_items: true },
      });

      // Format lại BigInt và Decimal trước khi trả về Frontend
      return {
        ...updatedOrder,
        id: updatedOrder.id.toString(),
        supplier_id: updatedOrder.supplier_id?.toString(),
        warehouse_id: updatedOrder.warehouse_id?.toString(),
        total_amount: Number(updatedOrder.total_amount),
        final_amount: Number(updatedOrder.final_amount),
        discount: Number(updatedOrder.discount),
        paid_amount: Number(updatedOrder.paid_amount),
        purchase_order_items: updatedOrder.purchase_order_items.map((item) => ({
          ...item,
          id: item.id.toString(),
          product_id: item.product_id,
          purchase_order_id: item.purchase_order_id,
          import_price: Number(item.import_price),
        })),
      };
    });
  }

  // ====================================================================
  // XÓA NHIỀU PHIẾU NHẬP
  // ====================================================================
  async deleteMany(ids: number[]) {
    // 1. Convert IDs sang BigInt
    const bigIntIds = ids.map((id) => BigInt(id));

    // 2. (Tùy chọn) Kiểm tra xem có phiếu nào đã "Hoàn thành" không?
    // Nếu phiếu đã nhập kho rồi mà xóa đi sẽ gây lệch tồn kho.
    const completedOrders = await this.prisma.purchase_orders.count({
      where: {
        id: { in: bigIntIds },
        status: 'completed', // Giả sử status hoàn thành là 'completed'
      },
    });

    if (completedOrders > 0) {
      throw new BadRequestException(
        'Không thể xóa phiếu nhập đã hoàn thành. Hãy hủy phiếu hoặc tạo phiếu trả hàng.',
      );
    }

    // 3. Thực hiện xóa
    const result = await this.prisma.purchase_orders.deleteMany({
      where: {
        id: { in: bigIntIds },
      },
    });

    return {
      message: 'Xóa thành công',
      count: result.count,
    };
  }
}
