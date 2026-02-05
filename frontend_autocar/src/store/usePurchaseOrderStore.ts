import { create } from "zustand";
import { purchaseOrderService } from "../services/purchaseOrderService";
import type {
  PurchaseOrder,
  PurchaseOrderFilterParams,
} from "../types/purchase-order";

interface PurchaseOrderState {
  orders: PurchaseOrder[];
  total: number;
  isLoading: boolean;
  filters: PurchaseOrderFilterParams;

  filterOptions: {
    warehouses: { id: number; name: string }[];
    staffs: { id: string; full_name: string }[];
  };

  fetchOrders: () => Promise<void>;
  setFilters: (newFilters: Partial<PurchaseOrderFilterParams>) => void;
  resetFilters: () => void;
  fetchFilterOptions: () => Promise<void>;
}

const initialFilters: PurchaseOrderFilterParams = {
  page: 1,
  limit: 10,
  search: "",
  warehouseIds: [],
  statuses: [],
  staffIds: [],
};

export const usePurchaseOrderStore = create<PurchaseOrderState>((set, get) => ({
  orders: [],
  total: 0,
  isLoading: false,
  filters: initialFilters,

  filterOptions: {
    warehouses: [],
    staffs: [],
  },

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const res = await purchaseOrderService.getAll(get().filters);
      set({ orders: res.data, total: res.meta.total, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchOrders();
  },

  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchOrders();
  },

  fetchFilterOptions: async () => {
    try {
      const [warehouses, staffs] = await Promise.all([
        purchaseOrderService.getWarehouses(),
        purchaseOrderService.getStaffs(),
      ]);
      set({
        filterOptions: {
          warehouses: warehouses.data || warehouses,
          staffs: staffs.data || staffs,
        },
      });
    } catch (error) {
      console.error(error);
    }
  },
}));
