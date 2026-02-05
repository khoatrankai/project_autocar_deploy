/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { stockTransferService } from "../services/stockTransferService";

interface StockTransferState {
  transfers: any[];
  total: number;
  isLoading: boolean;
  filters: {
    page: number;
    limit: number;
    status?: string;
    from_warehouse?: string;
    to_warehouse?: string;
    search?: string;
  };
  setFilters: (filters: any) => void;
  fetchTransfers: () => Promise<void>;
}

export const useStockTransferStore = create<StockTransferState>((set, get) => ({
  transfers: [],
  total: 0,
  isLoading: false,
  filters: {
    page: 1,
    limit: 10,
    status: undefined,
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchTransfers();
  },

  fetchTransfers: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      // Gọi API
      const response: any = await stockTransferService.getAll(filters);
      // Giả sử API trả về { data: [], total: 100 } hoặc mảng trực tiếp
      // Tùy format response của axiosClient
      if (Array.isArray(response?.data)) {
        set({
          transfers: response?.data?.data?.data,
          total: response?.data?.data?.total,
        });
      } else {
        set({
          transfers: response?.data?.data?.data || [],
          total: response?.data?.data?.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch transfers", error);
      set({ transfers: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
