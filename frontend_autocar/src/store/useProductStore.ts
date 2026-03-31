/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import type { ProductAdvance, ProductFilterParams } from "../types/product";
import { productService } from "../services/productService";
import { customerService } from "../services/customerService";

interface ProductState {
  products: ProductAdvance[];
  total: number;
  isLoading: boolean;
  error: string | null;

  filterOptions: {
    categories: any[]; // Danh sách phẳng (Cũ)
    categories_advance: any[]; // Danh sách cây phân cấp (Mới)
    suppliers: any[];
    customers: any[];
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
// --- HÀM TIỆN ÍCH: Lấy ID chi nhánh từ LocalStorage ---
const getBranchIdFromLocal = () => {
  try {
    const branchData = localStorage.getItem("selected_branch");
    if (branchData) {
      const parsedData = JSON.parse(branchData);
      return parsedData?.id ? [parsedData.id] : [];
    }
  } catch (error) {
    console.error("Lỗi khi parse selected_branch từ localStorage:", error);
  }
  return [];
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
    customers: [],
    brands: [],
    locations: [],
  },

  filters: initialFilters,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = { ...get().filters };

      // 2. Nếu locationIds rỗng (người dùng không tự lọc chi nhánh) -> Lấy từ LocalStorage
      if (
        !currentFilters.locationIds ||
        currentFilters.locationIds.length === 0
      ) {
        currentFilters.locationIds = getBranchIdFromLocal();
      }

      // 3. Gọi API lấy sản phẩm với params đã được bổ sung
      const response = await productService.getProducts(currentFilters);
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
        customersRes,
        brandsRes,
        locationsRes,
      ] = await Promise.all([
        productService.getCategories(), // Gọi API findAll cũ
        productService.getCategoriesAdvance(), // Gọi API findAllAdvance mới
        productService.getSuppliers(),
        customerService.getCustomers({}),
        productService.getBrands(),
        productService.getLocations(),
      ]);

      set({
        filterOptions: {
          categories: categoriesRes.data || [],
          categories_advance: categoriesAdvanceRes.data || [], // <--- Lưu vào state
          suppliers: suppliersRes.data || [],
          customers: customersRes.data || [],
          brands: brandsRes.data || [],
          locations: locationsRes.data || [],
        },
      });
    } catch (error) {
      console.error("Failed to load filter options", error);
    }
  },
}));
