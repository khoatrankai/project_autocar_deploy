/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/customerService.ts
import axiosClient from "./axiosClient";
// import type { CustomerFilterParams, CustomerResponse } from "../types/customer";

export const customerService = {
  // 1. Lấy danh sách Khách hàng (Có lọc & phân trang)
  // GET /partners/customer (Backend cần endpoint này lọc where type = 'customer')
  getCustomers: async (params: any): Promise<any> => {
    const response = await axiosClient.get("/partners/customer", {
      params,
    });
    return response.data?.data; // Thường trả về { data: [], meta: {}, summary: {} }
  },

  // 2. Lấy danh sách Nhóm Khách hàng
  // GET /partners/groups
  getGroups: async (): Promise<string[]> => {
    // Thường cần truyền type để chỉ lấy nhóm của khách hàng, tránh lấy nhóm NCC
    const response = await axiosClient.get("/partners/groups", {
      params: { type: "customer" },
    });
    return response.data?.data;
  },

  // 3. Tạo mới Khách hàng
  create: async (data: any) => {
    // Mặc định type là customer nếu frontend chưa gửi
    const payload = { ...data, type: "customer" };
    const response = await axiosClient.post("/partners", payload);
    return response.data;
  },

  // 4. Xóa nhiều khách hàng
  deleteMany: async (ids: string[]) => {
    // Sử dụng endpoint xóa chung của partners hoặc riêng tùy route backend
    const response = await axiosClient.delete("/partners/bulk", {
      data: { ids },
    });
    return response.data;
  },

  // 5. Xuất file Excel
  exportData: async (columns: string[]) => {
    const query = columns.length > 0 ? `?columns=${columns.join(",")}` : "";

    // Gọi endpoint export dành riêng cho customer
    const response = await axiosClient.get(`/import/customers/export${query}`, {
      responseType: "blob", // Quan trọng để tải file
    });
    return response.data;
  },

  // 6. Import file Excel
  importCustomers: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosClient.post("/import/customers", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
};
