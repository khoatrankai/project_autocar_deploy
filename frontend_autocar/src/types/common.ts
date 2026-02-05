// src/types/common.ts (Tạo file mới hoặc để chung với product.ts)

// 1. Cấu trúc Response chuẩn của API (Lớp vỏ)
export interface ApiResponse<T> {
  statusCode: number;
  message: string | string[];
  data: T;
}

// 2. Cấu trúc dữ liệu phân trang (Nằm bên trong data của ApiResponse)
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
