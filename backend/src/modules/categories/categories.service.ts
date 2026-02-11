import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.categories.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parent_id: dto.parent_id ? BigInt(dto.parent_id) : null,
      },
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
