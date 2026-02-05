/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { returnService } from "../services/returnService";
import { toast } from "react-hot-toast";

// --- TYPES (Định nghĩa kiểu dữ liệu) ---

export interface ReturnFilter {
  page: number;
  limit: number;
  search?: string;
  branchIds?: string[];
  status?: string[];
  partnerIds?: string[]; // Nhà cung cấp hoặc Khách hàng
  creatorIds?: string[];
  startDate?: string;
  endDate?: string;
  // Dùng cho Date Picker Preset (Tuần này, Tháng này...)
  timePreset?: "week" | "month" | "year" | "custom";
}

export interface ReturnItem {
  id: string;
  code: string;
  status: "pending" | "completed" | "cancelled";
  total_refund: number;
  created_at: string;
  reason?: string;
  partners?: {
    name: string;
    phone?: string;
  };
  orders?: {
    code: string;
    warehouses?: {
      name: string;
    };
    profiles?: {
      // Người tạo đơn gốc (nếu cần)
      full_name: string;
    };
  };
  return_items?: any[];
}

interface ReturnState {
  // State Data
  returns: ReturnItem[];
  total: number;
  totalRefund: number; // Tổng tiền hoàn trả (của tất cả các phiếu lọc được)
  isLoading: boolean;

  // State Filter
  filters: ReturnFilter;

  // Actions
  setFilters: (filters: Partial<ReturnFilter>) => void;
  resetFilters: () => void;
  fetchReturns: () => Promise<void>;
  deleteReturn: (id: string) => Promise<void>;
  deleteManyReturns: (ids: string[]) => Promise<void>;
}

// --- INITIAL VALUES ---
const initialFilters: ReturnFilter = {
  page: 1,
  limit: 10,
  search: "",
  branchIds: [],
  status: [],
  timePreset: "month", // Mặc định hiển thị tháng này
  startDate: undefined,
  endDate: undefined,
};

export const useReturnStore = create<ReturnState>((set, get) => ({
  // 1. Init State
  returns: [],
  total: 0,
  totalRefund: 0,
  isLoading: false,
  filters: initialFilters,

  // 2. Set Filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Tự động fetch lại khi filter thay đổi (tuỳ chọn, hoặc gọi ở Component)
    // get().fetchReturns();
  },

  // 3. Reset Filters
  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchReturns();
  },

  // 4. Fetch Data từ API
  fetchReturns: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();

      // Clean params: Loại bỏ các field undefined/rỗng trước khi gửi
      const params: any = { ...filters };
      if (!params.search) delete params.search;
      if (params.branchIds?.length === 0) delete params.branchIds;
      if (params.status?.length === 0) delete params.status;
      if (!params.startDate) delete params.startDate;
      if (!params.endDate) delete params.endDate;
      delete params.timePreset; // Không gửi field này lên server

      const res: any = await returnService.getAll(params);

      // Map data từ response (cấu trúc trả về từ NestJS service hôm qua)
      set({
        returns: res.data?.data || [],
        total: res.data?.total || 0,
        totalRefund: res.data?.totalRefund || 0,
      });
    } catch (error) {
      console.error("Lỗi tải danh sách trả hàng:", error);
      // set({ returns: [], total: 0 }); // Có thể reset nếu lỗi
    } finally {
      set({ isLoading: false });
    }
  },

  // 5. Xóa 1 phiếu
  deleteReturn: async (id: string) => {
    try {
      await returnService.delete(id);
      toast.success("Đã xóa phiếu trả hàng");
      get().fetchReturns(); // Reload lại bảng
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    }
  },

  // 6. Xóa nhiều phiếu
  deleteManyReturns: async (ids: string[]) => {
    try {
      await returnService.deleteMany(ids);
      toast.success(`Đã xóa ${ids.length} phiếu`);
      get().fetchReturns();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    }
  },
}));
