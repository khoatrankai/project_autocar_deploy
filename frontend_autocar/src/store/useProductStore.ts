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
    categories: any[]; // Danh sách phẳng (Cũ)
    categories_advance: any[]; // Danh sách cây phân cấp (Mới)
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
    categories_advance: [], // Khởi tạo mảng rỗng
    suppliers: [],
    brands: [],
    locations: [],
  },

  filters: initialFilters,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const params = get().filters;
      // Gọi API lấy sản phẩm
      const response = await productService.getProducts(params);
      const result = response.data;

      set({
        products: result.data,
        total: result.meta.total,
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
      // Gọi song song cả API cũ và API Advance mới
      const [
        categoriesRes,
        categoriesAdvanceRes, // <--- Thêm biến nhận kết quả mới
        suppliersRes,
        brandsRes,
        locationsRes,
      ] = await Promise.all([
        productService.getCategories(), // Gọi API findAll cũ
        productService.getCategoriesAdvance(), // Gọi API findAllAdvance mới
        productService.getSuppliers(),
        productService.getBrands(),
        productService.getLocations(),
      ]);

      set({
        filterOptions: {
          categories: categoriesRes.data || [],
          categories_advance: categoriesAdvanceRes.data || [], // <--- Lưu vào state
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
