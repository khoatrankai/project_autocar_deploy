/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import type { ProductAdvance, ProductFilterParams } from "../types/product";
import { productService } from "../services/productService";

interface ProductState {
  products: ProductAdvance[];
  total: number;
  isLoading: boolean;
  error: string | null;

  filterOptions: {
    categories: any[];
    suppliers: any[];
    brands: any[];
    locations: any[];
  };

  filters: ProductFilterParams;

  fetchProducts: () => Promise<void>;
  setFilters: (newFilters: Partial<ProductFilterParams>) => void;
  resetFilters: () => void;
  fetchFilterOptions: () => Promise<void>;
}

const initialFilters: ProductFilterParams = {
  page: 1,
  limit: 10,
  search: "",
  stockStatus: "all",
  stockoutDateType: "all",
  createdDateType: "all",
  categoryIds: [],
  supplierIds: [],
  brandIds: [],
  locationIds: [],
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  total: 0,
  isLoading: false,
  error: null,

  filterOptions: {
    categories: [],
    suppliers: [],
    brands: [],
    locations: [],
  },

  filters: initialFilters,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const params = get().filters;
      // Gọi API
      const response = await productService.getProducts(params);

      // --- SỬA ĐỔI Ở ĐÂY ---
      // response = { statusCode: 200, data: { data: [...], meta: {...} } }
      // Ta cần lấy response.data.data (mảng sp) và response.data.meta (phân trang)
      const result = response.data;

      set({
        products: result.data, // Mảng sản phẩm
        total: result.meta.total, // Tổng số lượng để phân trang
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || "Lỗi tải dữ liệu",
      });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchProducts();
  },

  resetFilters: () => {
    set({ filters: initialFilters });
    get().fetchProducts();
  },

  fetchFilterOptions: async () => {
    try {
      const [categoriesRes, suppliersRes, brandsRes, locationsRes] =
        await Promise.all([
          productService.getCategories(),
          productService.getSuppliers(),
          productService.getBrands(),
          productService.getLocations(),
        ]);

      // --- SỬA ĐỔI Ở ĐÂY: Truy cập vào .data của ApiResponse ---
      set({
        filterOptions: {
          categories: categoriesRes.data || [],
          suppliers: suppliersRes.data || [],
          brands: brandsRes.data || [],
          locations: locationsRes.data || [],
        },
      });
    } catch (error) {
      console.error("Failed to load filter options", error);
    }
  },
}));
