import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class StockTransfersService {
  constructor(private prisma: PrismaService) {}

  private async generateTransferCode(tx: any, prefix: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefixWithVer = `${prefix}00`; // Ví dụ: 'TRF00'

    const lastTransfer = await tx.stock_transfers.findFirst({
      where: {
        code: {
          startsWith: prefixWithVer,
          endsWith: currentYear.toString(),
        },
      },
      orderBy: { code: 'desc' },
    });

    let nextStt = 1;
    if (lastTransfer) {
      const lastCode = lastTransfer.code;
      // Cắt bỏ tiền tố và hậu tố năm để lấy số thứ tự
      const sttString = lastCode.slice(prefixWithVer.length, -4);
      nextStt = (parseInt(sttString) || 0) + 1;
    }

    const paddedStt = nextStt.toString().padStart(3, '0');
    return `${prefixWithVer}${paddedStt}${currentYear}`; // TRF000012026
  }
  // =================================================================
  // 1. TẠO PHIẾU CHUYỂN
  // =================================================================
  async create(dto: any, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. XỬ LÝ MÃ PHIẾU
      // Nếu user gửi mã thì dùng, không thì tự sinh mã chuẩn
      const finalCode =
        dto.code || (await this.generateTransferCode(tx, 'TRF'));

      // 2. Validate kho
      if (dto.from_warehouse_id === dto.to_warehouse_id) {
        throw new BadRequestException('Kho nhận và kho gửi phải khác nhau');
      }

      // 3. Xử lý trừ kho và ghi log
      // Khai báo kiểu chuẩn thay vì any[]
      const itemsData: { product_id: bigint; quantity: number }[] = [];

      for (const item of dto.items) {
        const product = await tx.products.findUnique({
          where: { id: BigInt(item.product_id) },
          include: {
            inventory: {
              where: { warehouse_id: BigInt(dto.from_warehouse_id) },
            },
          },
        });

        if (!product) {
          throw new NotFoundException(
            `Sản phẩm ID ${item.product_id} không tồn tại`,
          );
        }

        const currentStock = product.inventory[0]?.quantity ?? 0;

        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${product.sku} không đủ tồn kho (Tồn: ${currentStock}, Chuyển: ${item.quantity})`,
          );
        }

        itemsData.push({
          product_id: BigInt(item.product_id),
          quantity: Number(item.quantity),
        });

        // TRỪ KHO NGAY LẬP TỨC
        await tx.inventory.update({
          where: {
            product_id_warehouse_id: {
              product_id: BigInt(item.product_id),
              warehouse_id: BigInt(dto.from_warehouse_id),
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });

        // Ghi Log: Xuất chuyển kho
        await tx.inventory_logs.create({
          data: {
            warehouse_id: BigInt(dto.from_warehouse_id),
            product_id: BigInt(item.product_id),
            change_amount: -item.quantity,
            balance_after: currentStock - item.quantity,
            type: 'transfer_out',
            reference_code: finalCode,
            note: `Chuyển đến kho ID ${dto.to_warehouse_id}`,
          },
        });
      }

      // 4. Tạo phiếu Header
      const transfer = await tx.stock_transfers.create({
        data: {
          code: finalCode,
          from_warehouse_id: BigInt(dto.from_warehouse_id),
          to_warehouse_id: BigInt(dto.to_warehouse_id),
          staff_id: dto.staff_id || userId,
          status: dto.status || 'pending',
          note: dto.note,
          transfer_date: new Date(),
          stock_transfer_items: {
            createMany: { data: itemsData },
          },
        },
        include: { stock_transfer_items: true },
      });

      // 5. Ép kiểu BigInt sang String để trả về Frontend an toàn
      return {
        ...transfer,
        id: transfer.id.toString(),
        from_warehouse_id: transfer.from_warehouse_id?.toString(),
        to_warehouse_id: transfer.to_warehouse_id?.toString(),
        stock_transfer_items: transfer.stock_transfer_items.map((item) => ({
          ...item,
          id: item.id.toString(),
          transfer_id: item.transfer_id?.toString(),
          product_id: item.product_id?.toString(),
        })),
      };
    });
  }

  // =================================================================
  // 2. LẤY DANH SÁCH
  // =================================================================
  async findAll(query: any) {
    const {
      from_warehouse,
      to_warehouse,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = query;

    // 1. Xử lý Phân trang
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // 2. Xử lý điều kiện lọc (Giữ nguyên logic cũ)
    const where: any = {};
    if (from_warehouse) where.from_warehouse_id = BigInt(from_warehouse);
    if (to_warehouse) where.to_warehouse_id = BigInt(to_warehouse);
    if (status) where.status = status;
    if (startDate && endDate) {
      where.transfer_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // 3. Gọi DB song song (Lấy dữ liệu + Đếm tổng)
    const [list, total] = await Promise.all([
      this.prisma.stock_transfers.findMany({
        where,
        include: {
          warehouses_stock_transfers_from_warehouse_idTowarehouses: {
            select: { name: true },
          },
          warehouses_stock_transfers_to_warehouse_idTowarehouses: {
            select: { name: true },
          },
          profiles: { select: { full_name: true } },
        },
        orderBy: { transfer_date: 'desc' },
        skip: skip, // <--- Bỏ qua số lượng bản ghi cũ
        take: limitNum, // <--- Lấy số lượng bản ghi giới hạn
      }),
      this.prisma.stock_transfers.count({ where }), // <--- Đếm tổng số bản ghi thỏa mãn điều kiện
    ]);

    // 4. Xử lý BigInt và trả về kết quả phân trang
    const serializedList = JSON.parse(
      JSON.stringify(list, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );

    return {
      data: serializedList,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findAllAdvanced(query: any) {
    const {
      from_warehouse,
      to_warehouse,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = query;

    // 1. Xử lý Phân trang
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // 2. Xây dựng điều kiện lọc (Where Clause)
    const where: any = {};

    if (from_warehouse) {
      const fromIds = Array.isArray(from_warehouse)
        ? from_warehouse
        : [from_warehouse];
      where.from_warehouse_id = { in: fromIds.map((id) => BigInt(id)) };
    }

    if (to_warehouse) {
      const toIds = Array.isArray(to_warehouse) ? to_warehouse : [to_warehouse];
      where.to_warehouse_id = { in: toIds.map((id) => BigInt(id)) };
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      where.status = { in: statuses };
    }

    if (startDate || endDate) {
      where.transfer_date = {};
      if (startDate) where.transfer_date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.transfer_date.lte = end;
      }
    }

    // 3. Thực hiện các truy vấn song song
    const [list, total, allMatchingTransfers] = await Promise.all([
      // A. Lấy danh sách theo trang (Paginated)
      this.prisma.stock_transfers.findMany({
        where,
        include: {
          warehouses_stock_transfers_from_warehouse_idTowarehouses: {
            select: { name: true },
          },
          warehouses_stock_transfers_to_warehouse_idTowarehouses: {
            select: { name: true },
          },
          profiles: { select: { full_name: true } },
          // Cần include items & products để tính giá trị từng dòng
          stock_transfer_items: {
            include: {
              products: { select: { cost_price: true } },
            },
          },
        },
        orderBy: { transfer_date: 'desc' },
        skip: skip,
        take: limitNum,
      }),

      // B. Đếm tổng số bản ghi
      this.prisma.stock_transfers.count({ where }),

      // C. Lấy TẤT CẢ items thoả mãn điều kiện để tính "Tổng giá trị" (Grand Total)
      // Lưu ý: Chỉ select các trường cần thiết để tối ưu hiệu năng
      this.prisma.stock_transfers.findMany({
        where,
        select: {
          stock_transfer_items: {
            select: {
              quantity: true,
              products: {
                select: { cost_price: true },
              },
            },
          },
        },
      }),
    ]);

    // 4. Tính toán Grand Total Value (Số to đùng trên header bảng)
    let grandTotalValue = 0;
    allMatchingTransfers.forEach((transfer) => {
      transfer.stock_transfer_items.forEach((item) => {
        const qty = item.quantity || 0;
        const price = Number(item.products?.cost_price || 0);
        grandTotalValue += qty * price;
      });
    });

    // 5. Map dữ liệu trả về (Tính total_value cho từng dòng + convert BigInt)
    const serializedList = list.map((item) => {
      // Tính giá trị của phiếu này
      const rowTotalValue = item.stock_transfer_items.reduce((sum, i) => {
        const qty = i.quantity || 0;
        const price = Number(i.products?.cost_price || 0);
        return sum + qty * price;
      }, 0);

      // Convert BigInt sang string thủ công để tránh lỗi JSON
      const serializedItem = JSON.parse(
        JSON.stringify(item, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );

      return {
        ...serializedItem,
        total_value: rowTotalValue, // Thêm trường này cho Frontend hiển thị cột "Giá trị chuyển"
      };
    });

    return {
      data: serializedList,
      total,
      totalValue: grandTotalValue, // Trả về tổng tiền toàn bộ danh sách lọc
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // =================================================================
  // 3. CHI TIẾT PHIẾU
  // =================================================================
  async findOne(id: number) {
    const transfer = await this.prisma.stock_transfers.findUnique({
      where: { id: BigInt(id) },
      include: {
        stock_transfer_items: {
          include: {
            products: {
              select: {
                sku: true,
                name: true,
                unit: true,
                cost_price: true, // Đây là giá vốn (dùng làm giá chuyển)
              },
            },
          },
        },
        warehouses_stock_transfers_from_warehouse_idTowarehouses: true,
        warehouses_stock_transfers_to_warehouse_idTowarehouses: true,
        profiles: true,
      },
    });

    if (!transfer) throw new NotFoundException('Phiếu chuyển không tồn tại');

    // --- TÍNH TOÁN GIÁ TRỊ MỞ RỘNG ---
    const enrichedTransfer = {
      ...transfer,
      stock_transfer_items: transfer.stock_transfer_items.map((item) => {
        // 1. Lấy giá chuyển (từ giá vốn sản phẩm)
        // Convert Decimal/BigInt sang Number để tính toán
        const price = Number(item.products?.cost_price || 0);

        // 2. Lấy số lượng
        const quantity = item.quantity || 0;

        // 3. Tính Thành tiền
        const total = price * quantity;

        return {
          ...item,
          price: price, // Field mới: Giá chuyển
          total: total, // Field mới: Thành tiền
        };
      }),
    };

    // Serialize BigInt và trả về
    return JSON.parse(
      JSON.stringify(enrichedTransfer, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  // =================================================================
  // 4. NHẬN HÀNG
  // =================================================================
  async receive(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stock_transfers.findUnique({
        where: { id: BigInt(id) },
        include: { stock_transfer_items: true },
      });

      if (!transfer || transfer.status !== 'pending') {
        throw new BadRequestException('Phiếu không hợp lệ hoặc đã được xử lý');
      }

      // Xử lý từng item
      for (const item of transfer.stock_transfer_items) {
        const itemId = item.product_id;
        const transferQty = item.quantity ?? 0;
        const targetWarehouseId = transfer.to_warehouse_id;

        if (!itemId || !targetWarehouseId) continue;

        // A. Lấy tồn kho hiện tại ở KHO NHẬN
        const destInventory = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: itemId,
              warehouse_id: targetWarehouseId,
            },
          },
        });
        const oldStock = destInventory?.quantity ?? 0;

        // B. Cộng tồn kho (Upsert)
        await tx.inventory.upsert({
          where: {
            product_id_warehouse_id: {
              product_id: itemId,
              warehouse_id: targetWarehouseId,
            },
          },
          update: { quantity: { increment: transferQty } },
          create: {
            product_id: itemId,
            warehouse_id: targetWarehouseId,
            quantity: transferQty,
          },
        });

        // C. Ghi Log Nhập
        await tx.inventory_logs.create({
          data: {
            warehouse_id: targetWarehouseId,
            product_id: itemId,
            change_amount: transferQty,
            balance_after: oldStock + transferQty,
            type: 'transfer_in',
            reference_code: transfer.code,
            note: `Nhận từ kho ID ${transfer.from_warehouse_id}`,
          },
        });

        // D. TÍNH LẠI GIÁ VỐN (Weighted Average)
        // (Logic giữ nguyên, bỏ qua update nếu chưa cần thiết)
      }

      // Cập nhật trạng thái phiếu
      const updated = await tx.stock_transfers.update({
        where: { id: BigInt(id) },
        data: { status: 'completed' },
      });

      return JSON.parse(
        JSON.stringify(updated, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    });
  }

  // =================================================================
  // 5. TỪ CHỐI / HỦY PHIẾU
  // =================================================================
  async reject(id: number, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stock_transfers.findUnique({
        where: { id: BigInt(id) },
        include: { stock_transfer_items: true },
      });

      if (!transfer) throw new NotFoundException('Phiếu không tồn tại');
      if (transfer.status !== 'pending') {
        throw new BadRequestException('Chỉ có thể từ chối phiếu đang chuyển');
      }

      for (const item of transfer.stock_transfer_items) {
        const itemId = item.product_id;
        const rejectQty = item.quantity ?? 0;
        const sourceWarehouseId = transfer.from_warehouse_id;

        if (!itemId || !sourceWarehouseId) continue;

        // Lấy tồn kho hiện tại để ghi log đúng
        const sourceInv = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: itemId,
              warehouse_id: sourceWarehouseId,
            },
          },
        });
        const currentSourceStock = sourceInv?.quantity ?? 0;

        // Hoàn lại kho gửi
        await tx.inventory.update({
          where: {
            product_id_warehouse_id: {
              product_id: itemId,
              warehouse_id: sourceWarehouseId,
            },
          },
          data: { quantity: { increment: rejectQty } },
        });

        // Ghi Log hoàn trả
        await tx.inventory_logs.create({
          data: {
            warehouse_id: sourceWarehouseId,
            product_id: itemId,
            change_amount: rejectQty, // Số dương
            balance_after: currentSourceStock + rejectQty,
            type: 'transfer_return',
            reference_code: transfer.code,
            note: `Kho nhận từ chối: ${reason}`,
          },
        });
      }

      // Đổi trạng thái -> cancelled
      const updated = await tx.stock_transfers.update({
        where: { id: BigInt(id) },
        data: {
          status: 'cancelled',
          note: `${transfer.note ? transfer.note + ' | ' : ''}Lý do từ chối: ${reason}`,
        },
      });

      return JSON.parse(
        JSON.stringify(updated, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    });
  }

  // =================================================================
  // 6. CẬP NHẬT PHIẾU (Chỉ khi status = pending)
  // =================================================================
  async update(id: number, dto: any, userId: string) {
    const transferId = BigInt(id);

    return this.prisma.$transaction(async (tx) => {
      const currentTransfer = await tx.stock_transfers.findUnique({
        where: { id: transferId },
        include: { stock_transfer_items: true },
      });

      if (!currentTransfer) throw new NotFoundException('Phiếu không tồn tại');
      if (currentTransfer.status !== 'pending') {
        throw new BadRequestException(
          'Chỉ có thể sửa phiếu ở trạng thái pending',
        );
      }

      const fromWarehouseId = dto.from_warehouse_id
        ? BigInt(dto.from_warehouse_id)
        : currentTransfer.from_warehouse_id;

      if (!fromWarehouseId) {
        throw new BadRequestException('Thiếu thông tin kho gửi');
      }

      if (dto.items && dto.items.length > 0) {
        // 1. Hoàn lại số lượng vào kho cũ
        for (const oldItem of currentTransfer.stock_transfer_items) {
          if (oldItem.product_id && currentTransfer.from_warehouse_id) {
            await tx.inventory.updateMany({
              where: {
                product_id: oldItem.product_id,
                warehouse_id: currentTransfer.from_warehouse_id,
              },
              data: { quantity: { increment: oldItem.quantity ?? 0 } },
            });
          }
        }

        // 2. Xóa items cũ
        await tx.stock_transfer_items.deleteMany({
          where: { transfer_id: transferId },
        });

        // 3. Trừ kho theo items mới
        const newItemsData: { product_id: bigint; quantity: number }[] = [];

        for (const newItem of dto.items) {
          const inv = await tx.inventory.findUnique({
            where: {
              product_id_warehouse_id: {
                product_id: BigInt(newItem.product_id),
                warehouse_id: fromWarehouseId,
              },
            },
          });

          const currentStock = inv?.quantity ?? 0;

          if (currentStock < newItem.quantity) {
            throw new BadRequestException(
              `Sản phẩm ID ${newItem.product_id} không đủ tồn kho`,
            );
          }

          // Trừ kho mới
          await tx.inventory.update({
            where: { id: inv!.id },
            data: { quantity: { decrement: newItem.quantity } },
          });

          newItemsData.push({
            product_id: BigInt(newItem.product_id),
            quantity: Number(newItem.quantity),
          });
        }

        // 4. Tạo items mới
        await tx.stock_transfer_items.createMany({
          data: newItemsData.map((item) => ({
            transfer_id: transferId,
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        });
      }

      // Cập nhật Header
      const updated = await tx.stock_transfers.update({
        where: { id: transferId },
        data: {
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: dto.to_warehouse_id
            ? BigInt(dto.to_warehouse_id)
            : undefined,
          note: dto.note,
          staff_id: userId,
        },
        include: { stock_transfer_items: true },
      });

      // Format trả về Frontend (Thay cho JSON.parse)
      return {
        ...updated,
        id: updated.id.toString(),
        from_warehouse_id: updated.from_warehouse_id?.toString(),
        to_warehouse_id: updated.to_warehouse_id?.toString(),
        stock_transfer_items: updated.stock_transfer_items.map((i) => ({
          ...i,
          id: i.id.toString(),
          transfer_id: i.transfer_id?.toString(),
          product_id: i.product_id?.toString(),
        })),
      };
    });
  }

  // =================================================================
  // 7. XÓA MỘT PHIẾU (Chỉ khi status = pending)
  // =================================================================
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stock_transfers.findUnique({
        where: { id: BigInt(id) },
        include: { stock_transfer_items: true },
      });

      if (!transfer) throw new NotFoundException('Phiếu không tồn tại');
      if (transfer.status !== 'pending' && transfer.status !== 'cancelled') {
        throw new BadRequestException('Không thể xóa phiếu đã hoàn thành');
      }

      if (transfer.status === 'pending') {
        for (const item of transfer.stock_transfer_items) {
          // Kiểm tra chắc chắn không null trước khi update
          if (item.product_id && transfer.from_warehouse_id) {
            await tx.inventory.update({
              where: {
                product_id_warehouse_id: {
                  product_id: item.product_id,
                  warehouse_id: transfer.from_warehouse_id,
                },
              },
              data: { quantity: { increment: item.quantity || 0 } },
            });
          }
        }
      }

      await tx.stock_transfer_items.deleteMany({
        where: { transfer_id: BigInt(id) },
      });
      await tx.stock_transfers.delete({ where: { id: BigInt(id) } });

      return { message: 'Xóa phiếu thành công' };
    });
  }

  async removeMany(ids: number[]) {
    // Fix lỗi 'never' bằng cách định nghĩa kiểu cho mảng details
    const results: {
      success: number;
      failed: number;
      details: { id: number; error: string }[];
    } = {
      success: 0,
      failed: 0,
      details: [],
    };

    for (const id of ids) {
      try {
        await this.remove(id);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.details.push({ id, error: error.message });
      }
    }

    return results;
  }
}
