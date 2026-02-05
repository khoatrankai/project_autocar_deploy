/* eslint-disable @typescript-eslint/no-explicit-any */
// import axios from "axios";
import type { ProductAdvance, ProductFilterParams } from "../types/product";
import type { ApiResponse, PaginatedResult } from "../types/common"; // Import type vừa tạo
import axiosClient from "./axiosClient";

export const productService = {
  // 1. Lấy danh sách sản phẩm (Có phân trang)
  getProducts: async (
    params: ProductFilterParams,
  ): Promise<ApiResponse<PaginatedResult<ProductAdvance>>> => {
    const response = await axiosClient.get(`/products/advance`, {
      params,
    });
    return response.data; // Trả về { statusCode, message, data: { data: [], meta: {} } }
  },

  // 2. Các hàm lấy Options (Giả sử BE trả về mảng trong data)
  // VD Response: { statusCode: 200, data: [{id: 1, name: 'Samsung'}], ... }
  getCategories: async (): Promise<ApiResponse<any[]>> => {
    const response = await axiosClient.get(`/categories`);

    return response.data;
  },

  getSuppliers: async (): Promise<ApiResponse<any[]>> => {
    const response = await axiosClient.get(`/partners?type=supplier`);
    return response.data?.data;
  },

  getBrands: async (): Promise<ApiResponse<string[]>> => {
    const response = await axiosClient.get(`/products/brands`);
    return response.data?.data;
  },

  getLocations: async (): Promise<ApiResponse<any[]>> => {
    const response = await axiosClient.get(`/warehouses`);
    return response.data;
  },
  getFilterOptions: async () => {
    // Giả sử bạn có các API này, hoặc 1 API tổng hợp
    const [categories, suppliers, brands, locations] = await Promise.all([
      axiosClient.get(`/categories`),
      axiosClient.get(`/partners?type=supplier`),
      axiosClient.get(`/products/brands`), // API trả về list brand distinct
      axiosClient.get(`/warehouses`),
    ]);

    return {
      categories: categories.data.data,
      suppliers: suppliers.data.data,
      brands: brands.data.data, // Cần map nếu API trả về string[]
      locations: locations.data.data,
    };
  },
  create: async (data: any) => {
    // data ở đây sẽ khớp với CreateProductDto
    const response = await axiosClient.post("/products", data);
    return response.data;
  },
  deleteMany: async (ids: string[]) => {
    // Lưu ý: axios.delete cú pháp khác axios.post
    // Phải dùng { data: { ... } } để gửi body
    const response = await axiosClient.delete("/products/multiple", {
      data: { ids },
    });
    return response.data;
  },
  createCategory: async (data: {
    name: string;
    slug?: string;
    parent_id?: number;
  }) => {
    const response = await axiosClient.post("/categories", data);
    return response.data;
  },

  // 2. Tạo Kho/Vị trí (Warehouse)
  createWarehouse: async (data: {
    name: string;
    type: string;
    address?: string;
  }) => {
    const response = await axiosClient.post("/warehouses", data);
    return response.data;
  },
  importProducts: async (file: File) => {
    // 1. Tạo FormData để chứa file
    const formData = new FormData();
    formData.append("file", file);

    // 2. Gọi API (Axios tự động set Content-Type: multipart/form-data khi nhận FormData)
    const response = await axiosClient.post("/import/products", formData);
    return response.data;
  },

  // (Optional) Hàm tải file mẫu nếu cần
  downloadTemplate: async () => {
    const response = await axiosClient.get("/import/products/template", {
      responseType: "blob", // Quan trọng để tải file binary
    });
    // Logic tạo thẻ <a> để tải xuống sẽ xử lý ở Component hoặc Helper
    return response.data;
  },
  exportData: async (columns: string[]) => {
    // Chuyển mảng ["sku", "name"] thành chuỗi "sku,name"
    const query = columns.length > 0 ? `?columns=${columns.join(",")}` : "";

    const response = await axiosClient.get(`/import/products/export${query}`, {
      responseType: "blob", // Quan trọng: nhận về file binary
    });
    return response.data;
  },

  getStocks: async (productId: any) => {
    const response = await axiosClient.get(`/products/stock-card/${productId}`);
    return response.data?.data;
  },
  getInventoryDetails: async (productId: any) => {
    const response = await axiosClient.get(
      `/products/inventory-detail/${productId}`,
    );
    return response.data?.data;
  },
  update: async (productId: any, data: any) => {
    const response = await axiosClient.put(`/products/${productId}`, data);
    return response.data?.data;
  },
};
