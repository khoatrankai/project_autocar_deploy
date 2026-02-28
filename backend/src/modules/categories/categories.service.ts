import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // --- HÀM PHỤ TRỢ: KIỂM TRA TRÙNG TÊN ---
  private async checkNameExist(name: string, excludeId?: bigint) {
    const existingCategory = await this.prisma.categories.findFirst({
      where: {
        name: name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existingCategory) {
      throw new BadRequestException(
        `Danh mục với tên "${name}" đã tồn tại trong hệ thống.`,
      );
    }
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  // --- 1. TẠO MỚI (Có check trùng tên) ---
  async create(dto: CreateCategoryDto) {
    // Kiểm tra trùng tên trước khi tạo
    await this.checkNameExist(dto.name);

    return this.prisma.categories.create({
      data: {
        name: dto.name,
        slug: dto.slug ? dto.slug : this.toSlug(dto.name),
        parent_id: dto.parent_id ? BigInt(dto.parent_id) : null,
      },
    });
  }

  // --- 2. CẬP NHẬT (Có check trùng tên & chống vòng lặp) ---
  async update(id: string | number, dto: any) {
    // Thay 'any' bằng UpdateCategoryDto
    const categoryId = BigInt(id);

    // Kiểm tra danh mục có tồn tại không
    const existing = await this.prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy danh mục này.');
    }

    // Nếu đổi tên, kiểm tra xem tên mới có bị trùng với danh mục khác không
    if (dto.name && dto.name !== existing.name) {
      await this.checkNameExist(dto.name, categoryId);
    }

    // Ngăn chặn việc đặt parent_id là chính nó (Gây lỗi vòng lặp cây)
    if (dto.parent_id && BigInt(dto.parent_id) === categoryId) {
      throw new BadRequestException('Không thể chọn danh mục cha là chính nó.');
    }

    return this.prisma.categories.update({
      where: { id: categoryId },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        slug:
          dto.slug !== undefined
            ? dto.slug
            : this.toSlug(dto.name !== undefined ? dto.name : existing.name),
        parent_id:
          dto.parent_id !== undefined
            ? dto.parent_id
              ? BigInt(dto.parent_id)
              : null
            : existing.parent_id,
      },
    });
  }

  // --- 3. XÓA (Check ràng buộc dữ liệu) ---
  async remove(id: string | number) {
    const categoryId = BigInt(id);

    // Lấy danh mục kèm theo danh mục con và sản phẩm để kiểm tra
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        other_categories: true, // Các danh mục con
        products: true, // Các sản phẩm thuộc danh mục này
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục để xóa.');
    }

    // Chặn xóa nếu đang có danh mục con
    if (category.other_categories.length > 0) {
      throw new BadRequestException(
        'Không thể xóa vì danh mục này đang chứa các danh mục con. Vui lòng xóa danh mục con trước.',
      );
    }

    // Chặn xóa nếu đang có sản phẩm
    if (category.products.length > 0) {
      throw new BadRequestException(
        'Không thể xóa vì đang có sản phẩm thuộc danh mục này. Vui lòng chuyển sản phẩm sang danh mục khác.',
      );
    }

    // Đủ điều kiện an toàn -> Xóa
    return this.prisma.categories.delete({
      where: { id: categoryId },
    });
  }

  findAll() {
    // Lấy kèm danh mục con (children)
    return this.prisma.categories.findMany({
      include: { other_categories: true },
    });
  }

  async findAllAdvance() {
    // 1. Lấy TOÀN BỘ danh mục (chỉ 1 query, rất nhanh)
    const allCategories = await this.prisma.categories.findMany({
      orderBy: { name: 'asc' },
    });

    // 2. Gọi hàm dựng cây
    return this.buildTree(allCategories);
  }

  // --- Thuật toán dựng cây O(n) ---
  private buildTree(categories: any[]) {
    const map = new Map();
    const roots: any[] = [];

    // Bước 1: Tạo Map để tra cứu nhanh & chuẩn bị mảng children
    categories.forEach((cat) => {
      // Chuyển BigInt sang String/Number để làm key cho Map
      const id = String(cat.id);
      // Tạo object mới có thêm thuộc tính children
      map.set(id, { ...cat, children: [] });
    });

    // Bước 2: Duyệt lại và gán con vào cha
    categories.forEach((cat) => {
      const id = String(cat.id);
      const node = map.get(id);

      if (cat.parent_id) {
        const parentId = String(cat.parent_id);
        const parent = map.get(parentId);

        if (parent) {
          parent.children.push(node);
        } else {
          // Trường hợp data lỗi (có parent_id nhưng không tìm thấy cha), coi như là root
          roots.push(node);
        }
      } else {
        // Không có parent_id => Là gốc (Root)
        roots.push(node);
      }
    });

    return roots; // Trả về cây phân cấp
  }
}
