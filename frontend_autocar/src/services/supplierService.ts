/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/supplierService.ts
import axiosClient from "./axiosClient";
import type { SupplierFilterParams, SupplierResponse } from "../types/supplier";

export const supplierService = {
  // 1. Lấy danh sách Nhà cung cấp (Có lọc & phân trang)
  // GET /partners/supplier (Giả sử Controller prefix là 'partners')
  getSuppliers: async (
    params: SupplierFilterParams,
  ): Promise<SupplierResponse> => {
    const response = await axiosClient.get("/partners/supplier", {
      params,
      // Lưu ý: axiosClient đã cấu hình paramsSerializer để xử lý mảng groupNames[]
    });
    return response.data?.data;
  },

  // 2. Lấy danh sách Nhóm NCC (Để đổ vào Dropdown bộ lọc)
  // GET /partners/groups
  getGroups: async (): Promise<string[]> => {
    const response = await axiosClient.get("/partners/groups");
    return response.data?.data;
  },

  // 3. Xóa nhiều nhà cung cấp (Nếu cần)
  deleteMany: async (ids: string[]) => {
    const response = await axiosClient.delete("/partners/supplier/multiple", {
      data: { ids },
    });
    return response.data;
  },
  create: async (data: any) => {
    const response = await axiosClient.post("/partners", data);
    return response.data;
  },
  exportData: async (columns: string[]) => {
    const query = columns.length > 0 ? `?columns=${columns.join(",")}` : "";

    // Gọi đúng endpoint đã tạo ở controller
    const response = await axiosClient.get(`/import/suppliers/export${query}`, {
      responseType: "blob",
    });
    return response.data;
  },
  importSuppliers: async (file: File) => {
    // 1. Tạo FormData
    const formData = new FormData();
    formData.append("file", file); // Key 'file' phải khớp với FileInterceptor('file') ở Backend

    // 2. Gọi API với config header riêng
    const response = await axiosClient.post("/import/suppliers", formData, {
      headers: {
        "Content-Type": "multipart/form-data", // <--- QUAN TRỌNG: Ghi đè header JSON mặc định
      },
    });

    return response.data;
  },
};
