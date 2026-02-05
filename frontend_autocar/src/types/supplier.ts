export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  group_name?: string;
  status: "active" | "inactive";
  current_debt: number; // Nợ hiện tại
  total_revenue: number; // Tổng mua
  created_at: string;
}

// 2. Cấu trúc Filter gửi lên (Khớp với FilterSupplierDto/FilterPartnerDto)
export interface SupplierFilterParams {
  page: number;
  limit: number;
  search?: string;

  // Các bộ lọc nâng cao
  groupNames?: string[]; // Mảng tên nhóm

  minDebt?: number;
  maxDebt?: number;

  minRevenue?: number;
  maxRevenue?: number;

  dateFrom?: string; // Lọc theo ngày tạo hoặc ngày nhập hàng cuối
  dateTo?: string;

  status?: string; // 'active' | 'inactive' | 'all'
}

// 3. Cấu trúc Response phân trang
export interface SupplierResponse {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
