// src/modules/system-backups/system-backups.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class SystemBackupsService {
  constructor(private prisma: PrismaService) {}

  // 1. Lấy danh sách các phiên sao lưu để hiển thị lên UI
  // async getBackupHistory() {
  //   const groups = await this.prisma.system_backups.groupBy({
  //     by: ['batch_code', 'entity_type', 'created_at', 'note', 'action_type'],
  //     _count: { id: true },
  //     orderBy: { created_at: 'desc' },
  //   });
  //   return JSON.parse(
  //     JSON.stringify(groups, (k, v) =>
  //       typeof v === 'bigint' ? v.toString() : v,
  //     ),
  //   );
  // }

  async getBackupHistory() {
    // Lấy lịch sử backup của các bảng khác (LOẠI TRỪ 'products' vì đã dùng Soft Delete)
    const groups = await this.prisma.system_backups.groupBy({
      by: ['batch_code', 'entity_type', 'created_at', 'note', 'action_type'],
      where: {
        entity_type: { not: 'products' }, // Bỏ qua products
      },
      _count: { id: true },
      orderBy: { created_at: 'desc' },
    });

    // Map dữ liệu chuẩn TypeScript, xử lý BigInt (nếu có) mà không cần JSON stringify
    return groups.map((group) => ({
      batch_code: group.batch_code,
      entity_type: group.entity_type,
      created_at: group.created_at,
      note: group.note,
      action_type: group.action_type,
      count: group._count.id,
    }));
  }

  // async getProductBackupHistory() {
  //   // 1. Lấy tất cả sản phẩm đang nằm trong thùng rác
  //   const deletedProducts = await this.prisma.products.findMany({
  //     where: {
  //       is_deleted: true,
  //       deleted_at: { not: null },
  //     },
  //     select: { id: true, deleted_at: true },
  //     orderBy: { deleted_at: 'desc' },
  //   });

  //   // 2. Nhóm các sản phẩm bị xóa cùng 1 phút
  //   const grouped = deletedProducts.reduce((acc, item) => {
  //     // Lấy chuỗi thời gian chuẩn ISO đến phút (VD: "2026-03-31T08:30")
  //     const timeKey = item.deleted_at!.toISOString().substring(0, 16);
  //     const code = `TRASH_${timeKey}`; // Mã lô thùng rác

  //     if (!acc[code]) {
  //       acc[code] = {
  //         batch_code: code,
  //         timestamp: item.deleted_at,
  //         note: 'Xóa sản phẩm vào thùng rác',
  //         action_type: 'SOFT_DELETE',
  //         count: 0,
  //         is_expired: false,
  //       };
  //     }
  //     acc[code].count++;

  //     const thirtyDaysAgo = new Date();
  //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  //     acc[code].is_expired = new Date(item.deleted_at!) < thirtyDaysAgo;

  //     return acc;
  //   }, {});

  //   return Object.values(grouped);
  // }

  // 2. Hàm khôi phục vạn năng
  // async restoreBatch(batchCode: string) {
  //   // 1. LẤY DỮ LIỆU (KHÔNG DÙNG TRANSACTION Ở NGOÀI CÙNG NỮA)
  //   const backups = await this.prisma.system_backups.findMany({
  //     where: { batch_code: batchCode },
  //   });

  //   if (backups.length === 0)
  //     throw new NotFoundException('Không tìm thấy phiên sao lưu này');

  //   let restoredCount = 0;

  //   // 2. VÒNG LẶP XỬ LÝ TỪNG BẢN GHI
  //   for (const item of backups) {
  //     const table = item.entity_type;
  //     const rawData = item.data as any;

  //     // Xử lý nạp dữ liệu dựa trên loại bảng
  //     switch (table) {
  //       case 'products':
  //         const productData = item.data as any;
  //         const { product_compatibility, inventory, ...productCore } =
  //           productData;
  //         const productId = BigInt(item.entity_id);

  //         // ÉP KIỂU BIGINT ĐỂ PRISMA KHÔNG LỖI
  //         if (productCore.category_id)
  //           productCore.category_id = BigInt(productCore.category_id);
  //         if (productCore.supplier_id)
  //           productCore.supplier_id = BigInt(productCore.supplier_id);

  //         const mappedCompatibility =
  //           product_compatibility?.map((c: any) => ({
  //             ...c,
  //             id: c.id ? BigInt(c.id) : undefined,
  //             product_id: productId,
  //           })) || [];

  //         const mappedInventory =
  //           inventory?.map((inv: any) => ({
  //             ...inv,
  //             product_id: productId,
  //             warehouse_id: BigInt(inv.warehouse_id),
  //           })) || [];

  //         // 👉 MINI-TRANSACTION DÀNH RIÊNG CHO SẢN PHẨM NÀY
  //         await this.prisma.$transaction(async (tx) => {
  //           // Khôi phục Sản phẩm chính
  //           await tx.products.upsert({
  //             where: { id: productId },
  //             create: { ...productCore, id: productId },
  //             update: productCore,
  //           });

  //           // Khôi phục Xe tương thích (Xóa cũ - Thêm lại từ Backup)
  //           await tx.product_compatibility.deleteMany({
  //             where: { product_id: productId },
  //           });
  //           if (mappedCompatibility.length > 0) {
  //             await tx.product_compatibility.createMany({
  //               data: mappedCompatibility,
  //             });
  //           }

  //           // Khôi phục Tồn kho (Xóa cũ - Thêm lại từ Backup)
  //           await tx.inventory.deleteMany({
  //             where: { product_id: productId },
  //           });
  //           if (mappedInventory.length > 0) {
  //             await tx.inventory.createMany({ data: mappedInventory });
  //           }
  //         }); // Kết thúc Mini-Transaction cho Products
  //         break;

  //       case 'inventory':
  //         // KHÔNG CẦN TRANSACTION VÌ CHỈ CHẠY 1 LỆNH
  //         await this.prisma.inventory.upsert({
  //           where: { id: BigInt(item.entity_id) },
  //           create: rawData,
  //           update: rawData,
  //         });
  //         break;

  //       case 'partners':
  //         // KHÔNG CẦN TRANSACTION VÌ CHỈ CHẠY 1 LỆNH
  //         await this.prisma.partners.upsert({
  //           where: { id: BigInt(item.entity_id) },
  //           create: rawData,
  //           update: rawData,
  //         });
  //         break;
  //       // Thêm các case khác nếu cần
  //     }

  //     restoredCount++;
  //   }

  //   // 3. XÓA BACKUP SAU KHI RESTORE THÀNH CÔNG
  //   // Xóa theo lô nhỏ để tránh quá tải RAM nếu có quá nhiều bản ghi
  //   const backupIdsToDelete = backups.map((b) => b.id);
  //   const chunkSize = 1000;
  //   for (let i = 0; i < backupIdsToDelete.length; i += chunkSize) {
  //     const chunk = backupIdsToDelete.slice(i, i + chunkSize);
  //     await this.prisma.system_backups.deleteMany({
  //       where: { id: { in: chunk } },
  //     });
  //   }

  //   return {
  //     message: `Đã khôi phục thành công ${restoredCount} bản ghi.`,
  //   };
  // }

  async restoreBatch(batchCode: string) {
    // ====================================================================
    // TRƯỜNG HỢP 1: KHÔI PHỤC TỪ THÙNG RÁC (DỰA VÀO CỜ IS_DELETED)
    // ====================================================================
    if (batchCode.startsWith('TRASH_')) {
      // Cắt lấy đoạn thời gian (VD: "2026-03-31T08:30")
      const timeString = batchCode.replace('TRASH_', '');

      // Quét toàn bộ giây trong phút đó (từ 00.000 đến 59.999)
      const startDate = new Date(`${timeString}:00.000Z`);
      const endDate = new Date(`${timeString}:59.999Z`);

      // Tìm các sản phẩm bị xóa trong lô thời gian này
      const productsToRestore = await this.prisma.products.findMany({
        where: {
          is_deleted: true,
          deleted_at: { gte: startDate, lte: endDate },
        },
      });

      if (productsToRestore.length === 0) {
        throw new NotFoundException('Không tìm thấy sản phẩm nào trong lô này');
      }

      let restoredCount = 0;
      for (const p of productsToRestore) {
        // Cắt đuôi _DEL_ để lấy SKU gốc
        const originalSku = p.sku.split('_DEL_')[0];

        // Kiểm tra xem SKU đó đã bị chiếm bởi sản phẩm mới nào chưa
        const isSkuTaken = await this.prisma.products.findFirst({
          where: { sku: originalSku, is_deleted: false },
        });

        const newSku = isSkuTaken
          ? `${originalSku}_RESTORED_${Date.now()}`
          : originalSku;

        // Khôi phục
        await this.prisma.products.update({
          where: { id: p.id },
          data: {
            is_deleted: false,
            deleted_at: null,
            sku: newSku,
          },
        });
        restoredCount++;
      }

      return {
        message: `Đã khôi phục thành công ${restoredCount} sản phẩm từ thùng rác.`,
      };
    }

    // ====================================================================
    // TRƯỜNG HỢP 2: KHÔI PHỤC TỪ JSON (CHO BẢNG INVENTORY/PARTNER HOẶC DỮ LIỆU CŨ)
    // ====================================================================
    const backups = await this.prisma.system_backups.findMany({
      where: { batch_code: batchCode },
    });

    if (backups.length === 0) {
      throw new NotFoundException('Không tìm thấy phiên sao lưu này');
    }

    let restoredCount = 0;

    for (const item of backups) {
      const table = item.entity_type;
      const rawData = item.data as any;

      switch (table) {
        case 'products': {
          const { product_compatibility, inventory, ...productCore } = rawData;
          const productId = BigInt(item.entity_id);

          if (productCore.category_id)
            productCore.category_id = BigInt(productCore.category_id);
          if (productCore.supplier_id)
            productCore.supplier_id = BigInt(productCore.supplier_id);

          const mappedCompatibility =
            product_compatibility?.map((c: any) => ({
              ...c,
              id: c.id ? BigInt(c.id) : undefined,
              product_id: productId,
            })) || [];

          const mappedInventory =
            inventory?.map((inv: any) => ({
              ...inv,
              product_id: productId,
              warehouse_id: BigInt(inv.warehouse_id),
            })) || [];

          await this.prisma.$transaction(async (tx) => {
            await tx.products.upsert({
              where: { id: productId },
              create: {
                ...productCore,
                id: productId,
                is_deleted: false,
                deleted_at: null,
              },
              update: { ...productCore, is_deleted: false, deleted_at: null },
            });

            await tx.product_compatibility.deleteMany({
              where: { product_id: productId },
            });
            if (mappedCompatibility.length > 0) {
              await tx.product_compatibility.createMany({
                data: mappedCompatibility,
              });
            }

            await tx.inventory.deleteMany({ where: { product_id: productId } });
            if (mappedInventory.length > 0) {
              await tx.inventory.createMany({ data: mappedInventory });
            }
          });
          break;
        }

        case 'inventory': {
          const invData = {
            ...rawData,
            id: BigInt(item.entity_id),
            product_id: rawData.product_id
              ? BigInt(rawData.product_id)
              : undefined,
            warehouse_id: rawData.warehouse_id
              ? BigInt(rawData.warehouse_id)
              : undefined,
          };
          await this.prisma.inventory.upsert({
            where: { id: BigInt(item.entity_id) },
            create: invData,
            update: invData,
          });
          break;
        }

        case 'partners': {
          const partnerData = { ...rawData, id: BigInt(item.entity_id) };
          await this.prisma.partners.upsert({
            where: { id: BigInt(item.entity_id) },
            create: partnerData,
            update: partnerData,
          });
          break;
        }
      }
      restoredCount++;
    }

    // Xóa backup JSON sau khi restore
    const backupIdsToDelete = backups.map((b) => b.id);
    const chunkSize = 1000;
    for (let i = 0; i < backupIdsToDelete.length; i += chunkSize) {
      await this.prisma.system_backups.deleteMany({
        where: { id: { in: backupIdsToDelete.slice(i, i + chunkSize) } },
      });
    }

    return {
      message: `Đã khôi phục thành công ${restoredCount} bản ghi từ JSON.`,
    };
  }

  // 3. Hàm thực hiện Xóa sạch kho có sao lưu
  async clearInventoryWithBackup(userId: string, reason: string) {
    const batchCode = `CLEAN_INV_${Date.now()}`;

    return await this.prisma.$transaction(async (tx) => {
      const allData = await tx.inventory.findMany();

      if (allData.length > 0) {
        await tx.system_backups.createMany({
          data: allData.map((item) => ({
            entity_type: 'inventory',
            entity_id: item.id.toString(),
            data: item as any,
            action_type: 'CLEAR_ALL',
            batch_code: batchCode,
            note: reason,
            created_by: userId,
          })),
        });
      }

      // Thực hiện xóa vật lý sau khi đã backup vào JSON
      await tx.inventory.deleteMany({});

      return { batchCode, count: allData.length };
    });
  }

  async getProductBackupHistory() {
    // 1. Lấy tất cả sản phẩm đang nằm trong thùng rác
    const deletedProducts = await this.prisma.products.findMany({
      where: {
        is_deleted: true,
        deleted_at: { not: null },
      },
      select: { id: true, deleted_at: true },
      orderBy: { deleted_at: 'desc' },
    });

    // 2. Nhóm các sản phẩm bị xóa cùng 1 phút
    const grouped = deletedProducts.reduce((acc, item) => {
      // Lấy chuỗi thời gian chuẩn ISO đến phút (VD: "2026-03-31T08:30")
      const timeKey = item.deleted_at!.toISOString().substring(0, 16);
      const code = `TRASH_${timeKey}`; // Mã lô thùng rác

      if (!acc[code]) {
        acc[code] = {
          batch_code: code,
          timestamp: item.deleted_at,
          note: 'Xóa sản phẩm vào thùng rác',
          action_type: 'SOFT_DELETE',
          count: 0,
          is_expired: false,
        };
      }
      acc[code].count++;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      acc[code].is_expired = new Date(item.deleted_at!) < thirtyDaysAgo;

      return acc;
    }, {});

    return Object.values(grouped);
  }

  // async getProductBackupHistory() {
  //   // Lấy các bản ghi backup của sản phẩm, nhóm theo Batch Code
  //   const backups = await this.prisma.system_backups.findMany({
  //     where: { entity_type: 'products' },
  //     orderBy: { created_at: 'desc' },
  //   });

  //   // Nhóm lại theo batch_code để hiển thị thành từng dòng trên UI
  //   const grouped = backups.reduce((acc, item) => {
  //     const code = item.batch_code;
  //     if (!acc[code]) {
  //       acc[code] = {
  //         batch_code: code,
  //         timestamp: item.created_at,
  //         note: item.note,
  //         action_type: item.action_type,
  //         count: 0,
  //         is_expired: false,
  //       };
  //     }
  //     acc[code].count++;

  //     // Kiểm tra xem đã quá 30 ngày chưa
  //     const thirtyDaysAgo = new Date();
  //     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  //     acc[code].is_expired = new Date(item.created_at) < thirtyDaysAgo;

  //     return acc;
  //   }, {});

  //   return JSON.parse(
  //     JSON.stringify(Object.values(grouped), (k, v) =>
  //       typeof v === 'bigint' ? v.toString() : v,
  //     ),
  //   );
  // }

  // async restoreAllProductDeletedInLastMonth() {
  //   // 1. Tính toán mốc thời gian (30 ngày trước)
  //   const thirtyDaysAgo = new Date();
  //   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  //   // 2. Lấy TẤT CẢ backup (KHÔNG BỌC TRANSACTION Ở ĐÂY NỮA)
  //   const backups = await this.prisma.system_backups.findMany({
  //     where: {
  //       entity_type: 'products',
  //       created_at: { gte: thirtyDaysAgo },
  //     },
  //     orderBy: { created_at: 'asc' }, // Lấy từ cũ đến mới
  //   });

  //   if (backups.length === 0) {
  //     return {
  //       message: 'Không có sản phẩm nào bị xóa trong 1 tháng qua để khôi phục.',
  //       count: 0,
  //     };
  //   }

  //   // 3. Lọc trùng lặp (Giữ lại bản mới nhất của mỗi sản phẩm)
  //   const uniqueBackups = new Map();
  //   for (const backup of backups) {
  //     uniqueBackups.set(backup.entity_id, backup);
  //   }

  //   let restoredCount = 0;

  //   // 4. Tiến hành khôi phục hàng loạt bằng MINI-TRANSACTIONS
  //   for (const backup of uniqueBackups.values()) {
  //     const data = backup.data as any;
  //     const productId = BigInt(backup.entity_id);

  //     const { product_compatibility, inventory, ...productCore } = data;

  //     // 🛠️ XỬ LÝ ÉP KIỂU BIGINT TỪ JSON ĐỂ PRISMA KHÔNG BÁO LỖI

  //     // Xử lý ID trong bảng chính (productCore)
  //     if (productCore.category_id)
  //       productCore.category_id = BigInt(productCore.category_id);
  //     if (productCore.supplier_id)
  //       productCore.supplier_id = BigInt(productCore.supplier_id);

  //     // Định dạng lại mảng xe tương thích
  //     const mappedCompatibility =
  //       product_compatibility?.map((item: any) => ({
  //         ...item,
  //         id: item.id ? BigInt(item.id) : undefined, // Bỏ id nếu là auto-increment
  //         product_id: productId, // Dùng luôn productId đã lấy chuẩn ở trên
  //       })) || [];

  //     // Định dạng lại mảng tồn kho
  //     const mappedInventory =
  //       inventory?.map((item: any) => ({
  //         ...item,
  //         product_id: productId,
  //         warehouse_id: BigInt(item.warehouse_id), // Quan trọng: Kho phải là BigInt
  //       })) || [];

  //     // 👉 BỌC TRANSACTION NHỎ CHO TỪNG SẢN PHẨM Ở ĐÂY
  //     await this.prisma.$transaction(async (tx) => {
  //       // A. Khôi phục Sản phẩm
  //       await tx.products.upsert({
  //         where: { id: productId },
  //         // Chèn thêm ID gốc vào lúc tạo mới đề phòng mất ID
  //         create: { ...productCore, id: productId },
  //         update: productCore,
  //       });

  //       // B. Khôi phục Xe tương thích
  //       await tx.product_compatibility.deleteMany({
  //         where: { product_id: productId },
  //       });
  //       if (mappedCompatibility.length > 0) {
  //         await tx.product_compatibility.createMany({
  //           data: mappedCompatibility,
  //         });
  //       }

  //       // C. Khôi phục Tồn kho
  //       await tx.inventory.deleteMany({
  //         where: { product_id: productId },
  //       });
  //       if (mappedInventory.length > 0) {
  //         await tx.inventory.createMany({
  //           data: mappedInventory,
  //         });
  //       }
  //     }); // Kết thúc mini-transaction

  //     restoredCount++;
  //   }

  //   // 5. Xóa các bản backup sau khi đã khôi phục xong
  //   const backupIdsToDelete = Array.from(uniqueBackups.values()).map(
  //     (b) => b.id,
  //   );

  //   // Băm nhỏ mảng ID ra xóa để tránh quá tải bộ nhớ
  //   const chunkSize = 1000;
  //   for (let i = 0; i < backupIdsToDelete.length; i += chunkSize) {
  //     const chunk = backupIdsToDelete.slice(i, i + chunkSize);
  //     await this.prisma.system_backups.deleteMany({
  //       where: { id: { in: chunk } },
  //     });
  //   }

  //   return {
  //     message: `Đã khôi phục thành công ${restoredCount} sản phẩm bị xóa trong 1 tháng qua.`,
  //     count: restoredCount,
  //   };
  // }

  // async clearAllProductsWithBackup(userId: string, reason: string) {
  //   const batchCode = `CLEAR_PROD_${Date.now()}`;

  //   return await this.prisma.$transaction(
  //     async (tx) => {
  //       // 1. Lấy toàn bộ sản phẩm kèm theo các quan hệ (Compatibility, Inventory)
  //       // Việc lấy cả quan hệ giúp khi Restore ta khôi phục được nguyên trạng
  //       const allProducts = await tx.products.findMany({
  //         include: {
  //           product_compatibility: true,
  //           inventory: true,
  //         },
  //       });

  //       if (allProducts.length === 0) {
  //         return { message: 'Không có sản phẩm nào để xóa', count: 0 };
  //       }

  //       // 2. Lưu toàn bộ dữ liệu vào bảng system_backups
  //       // Ta lưu nguyên object 'item' (đã bao gồm mảng compatibility và inventory bên trong)
  //       await tx.system_backups.createMany({
  //         data: allProducts.map((item) => ({
  //           entity_type: 'products',
  //           entity_id: item.id.toString(),
  //           data: item as any, // JSON bao gồm cả các bảng con
  //           action_type: 'CLEAR_ALL_PRODUCTS',
  //           batch_code: batchCode,
  //           note: reason,
  //           created_by: userId,
  //         })),
  //       });

  //       // 3. Thực hiện xóa sạch
  //       // Nhờ quan hệ Cascade trong Prisma, khi xóa Products thì Inventory và Compatibility tự mất theo
  //       const result = await tx.products.deleteMany({});

  //       return {
  //         message: `Đã xóa sạch ${result.count} sản phẩm và tạo bản sao lưu.`,
  //         batchCode: batchCode,
  //       };
  //     },
  //     {
  //       maxWait: 10000, // Thời gian chờ tối đa để DB cấp phát transaction (10 giây)
  //       timeout: 300000, // Tăng giới hạn chạy lên 300.000 ms (5 phút)
  //     },
  //   ); // Tăng timeout vì dữ liệu sản phẩm thường rất lớn
  // }

  // ====================================================================
  // 3. KHÔI PHỤC SẢN PHẨM BỊ XÓA TRONG 1 THÁNG
  // ====================================================================
  async restoreAllProductDeletedInLastMonth() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Tìm các sản phẩm nằm trong thùng rác (< 30 ngày)
    const deletedProducts = await this.prisma.products.findMany({
      where: {
        is_deleted: true,
        deleted_at: { gte: thirtyDaysAgo },
      },
    });

    if (deletedProducts.length === 0) {
      return {
        message: 'Không có sản phẩm nào bị xóa trong 1 tháng qua để khôi phục.',
        count: 0,
      };
    }

    let restoredCount = 0;

    // 2. Khôi phục từng sản phẩm
    for (const p of deletedProducts) {
      const originalSku = p.sku.split('_DEL_')[0];

      // Kiểm tra xem trong lúc sản phẩm bị xóa, có ai tạo mã SKU đó lại chưa
      const isSkuTaken = await this.prisma.products.findFirst({
        where: { sku: originalSku, is_deleted: false },
      });

      // Nếu SKU bị chiếm thì thêm đuôi RESTORED để tránh lỗi trùng lặp Database
      const newSku = isSkuTaken
        ? `${originalSku}_RESTORED_${Date.now()}`
        : originalSku;

      await this.prisma.products.update({
        where: { id: p.id },
        data: {
          is_deleted: false, // Lôi ra khỏi thùng rác
          deleted_at: null,
          sku: newSku,
        },
      });

      restoredCount++;
    }

    return {
      message: `Đã khôi phục thành công ${restoredCount} sản phẩm.`,
      count: restoredCount,
    };
  }

  async clearAllProductsWithBackup(userId: string, reason: string) {
    // 1. Lấy những sản phẩm chưa bị xóa
    const products = await this.prisma.products.findMany({
      where: { is_deleted: false },
      select: { id: true, sku: true },
    });

    if (products.length === 0) {
      return { message: 'Không có sản phẩm nào để xóa.', count: 0 };
    }

    let count = 0;
    const now = Date.now();

    // 2. Chạy vòng lặp đổi trạng thái (Mini-transactions ẩn)
    for (const p of products) {
      await this.prisma.products.update({
        where: { id: p.id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          sku: `${p.sku}_DEL_${now}`, // Giải phóng mã SKU cũ
        },
      });
      count++;
    }

    return {
      message: `Đã đưa ${count} sản phẩm vào thùng rác. Lý do: ${reason}`,
      count: count,
    };
  }
}
