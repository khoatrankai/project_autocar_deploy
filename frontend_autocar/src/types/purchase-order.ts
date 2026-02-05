export type PurchaseOrderStatus = "draft" | "completed" | "cancelled";

export interface PurchaseOrder {
  id: string;
  code: string;
  import_date: string; // ISO String
  status: PurchaseOrderStatus;
  note?: string;

  // Tiền
  total_amount: number;
  discount: number;
  final_amount: number;
  paid_amount: number;
  debt_amount: number; // Backend đã tính sẵn: final - paid

  // Relations (Flattened)
  supplier_name?: string;
  supplier_code?: string;
  warehouse_name?: string;
  staff_name?: string;
}

// Params gửi lên API (Khớp với FilterPurchaseOrderDto Backend)
export interface PurchaseOrderFilterParams {
  page: number;
  limit: number;
  search?: string;

  warehouseIds?: number[]; // Lọc theo chi nhánh
  statuses?: string[]; // Lọc theo trạng thái

  dateFrom?: string;
  dateTo?: string;

  staffIds?: string[]; // Người tạo/nhập
}

export interface PurchaseOrderResponse {
  data: PurchaseOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
