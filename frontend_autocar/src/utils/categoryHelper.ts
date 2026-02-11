/* eslint-disable @typescript-eslint/no-explicit-any */

// Hàm này biến đổi cây đa cấp thành danh sách phẳng để hiển thị trong Dropdown
export const flattenCategories = (
  categories: any[],
  level = 0,
  result: any[] = [],
) => {
  // Sắp xếp theo tên (nếu cần)
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach((cat) => {
    result.push({
      id: cat.id,
      name: cat.name,
      level: level, // Độ sâu hiện tại
      raw: cat, // Giữ data gốc
    });

    // Backend mình vừa sửa trả về 'children', nên dùng key này
    if (cat.children && cat.children.length > 0) {
      flattenCategories(cat.children, level + 1, result); // Đệ quy tăng level
    }
    // Fallback nếu dùng code cũ của Prisma
    else if (cat.other_categories && cat.other_categories.length > 0) {
      flattenCategories(cat.other_categories, level + 1, result);
    }
  });

  return result;
};
