/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { customerService } from "../services/customerService";

// Định nghĩa Filter Type (Hoặc import từ file types nếu có)
export interface CustomerFilterParams {
  page: number;
  limit: number;
  search?: string;
  groupName?: string;
  status?: string;
  creatorId?: string;
  startDate?: string;
  endDate?: string;
}

interface CustomerState {
  // --- STATE DỮ LIỆU ---
  customers: any[]; // List khách hàng
  total: number; // Tổng số bản ghi (cho phân trang)

  // State tổng quan (Hiển thị màu đỏ/đen trên header bảng)
  summary: {
    totalDebt: number;
    totalRevenue: number;
    netRevenue: number;
  };

  isLoading: boolean;
  error: string | null;

  // --- STATE BỘ LỌC HIỆN TẠI ---
  filters: CustomerFilterParams;

  // --- DATA CHO DROPDOWN BỘ LỌC ---
  filterOptions: {
    groups: string[]; // Danh sách nhóm khách hàng (VIP, Khách lẻ...)
  };

  // --- ACTIONS ---
  fetchCustomers: () => Promise<void>;
  setFilters: (newFilters: Partial<CustomerFilterParams>) => void;
  resetFilters: () => void;

  // Gọi cái này 1 lần khi vào trang để lấy danh sách nhóm
  fetchFilterOptions: () => Promise<void>;
}

// Bộ lọc mặc định
const initialFilters: CustomerFilterParams = {
  page: 1,
  limit: 20, // Khách hàng thường hiển thị nhiều hơn
  search: "",
  status: "active",
};

export const useCustomerStore = create<CustomerState>((set, get) => ({
  // 1. Init State
  customers: [],
  total: 0,
  summary: {
    totalDebt: 0,
    totalRevenue: 0,
    netRevenue: 0,
  },
  isLoading: false,
  error: null,

  filters: initialFilters,

  filterOptions: {
    groups: [],
  },

  // 2. Gọi API lấy danh sách
  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const params = get().filters;
      const response = await customerService.getCustomers(params);

      // Map dữ liệu trả về từ Service (khớp với cấu trúc { data, meta, summary })
      set({
        customers: response.data,
        total: response.meta?.total || 0,
        summary: response.summary || {
          totalDebt: 0,
          totalRevenue: 0,
          netRevenue: 0,
        },
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || "Lỗi tải danh sách khách hàng",
      });
    }
  },

  // 3. Cập nhật bộ lọc -> Tự động gọi lại API
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchCustomers();
  },

  // 4. Reset bộ lọc về mặc định
  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchCustomers();
  },

  // 5. Lấy dữ liệu cho dropdown Filter (Nhóm KH)
  fetchFilterOptions: async () => {
    try {
      const groups = await customerService.getGroups();
      set((state) => ({
        filterOptions: { ...state.filterOptions, groups },
      }));
    } catch (error) {
      console.error("Lỗi tải nhóm khách hàng:", error);
    }
  },
}));
