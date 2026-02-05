/* eslint-disable @typescript-eslint/no-explicit-any */
// src/store/useSupplierStore.ts
import { create } from "zustand";
import { supplierService } from "../services/supplierService";
import type { Supplier, SupplierFilterParams } from "../types/supplier";

interface SupplierState {
  // --- STATE DỮ LIỆU ---
  suppliers: Supplier[];
  total: number;
  isLoading: boolean;
  error: string | null;

  // --- STATE BỘ LỌC HIỆN TẠI ---
  filters: SupplierFilterParams;

  // --- DATA CHO DROPDOWN BỘ LỌC ---
  filterOptions: {
    groups: string[]; // Danh sách nhóm NCC (Lốp xe, Phụ tùng...)
  };

  // --- ACTIONS ---
  fetchSuppliers: () => Promise<void>;
  setFilters: (newFilters: Partial<SupplierFilterParams>) => void;
  resetFilters: () => void;

  // Gọi cái này 1 lần khi vào trang để lấy danh sách nhóm
  fetchFilterOptions: () => Promise<void>;
}

// Bộ lọc mặc định
const initialFilters: SupplierFilterParams = {
  page: 1,
  limit: 10,
  search: "",
  status: "active", // Mặc định chỉ hiện đang hoạt động
};

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  total: 0,
  isLoading: false,
  error: null,

  filters: initialFilters,

  filterOptions: {
    groups: [],
  },

  // 1. Gọi API lấy danh sách
  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const params = get().filters;
      const response = await supplierService.getSuppliers(params);

      set({
        suppliers: response.data,
        total: response.meta.total,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error:
          error.response?.data?.message || "Lỗi tải danh sách nhà cung cấp",
      });
    }
  },

  // 2. Cập nhật bộ lọc -> Tự động gọi lại API
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchSuppliers();
  },

  // 3. Reset bộ lọc về mặc định
  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchSuppliers();
  },

  // 4. Lấy dữ liệu cho dropdown Filter (Nhóm NCC)
  fetchFilterOptions: async () => {
    try {
      const groups = await supplierService.getGroups();
      set((state) => ({
        filterOptions: { ...state.filterOptions, groups },
      }));
    } catch (error) {
      console.error("Lỗi tải nhóm nhà cung cấp:", error);
    }
  },
}));
