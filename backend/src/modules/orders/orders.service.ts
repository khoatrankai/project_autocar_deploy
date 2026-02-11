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
}
