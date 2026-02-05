/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from "./axiosClient";
import type {
  PurchaseOrderFilterParams,
  PurchaseOrderResponse,
} from "../types/purchase-order";

export const purchaseOrderService = {
  // 1. Lấy danh sách phiếu nhập
  getAll: async (
    params: PurchaseOrderFilterParams,
  ): Promise<PurchaseOrderResponse> => {
    const response = await axiosClient.get("/purchase-orders/advance", {
      params,
      // paramsSerializer đã cấu hình ở axiosClient
    });
    return response?.data?.data || response.data;
  },

  // 2. Tạo phiếu nhập mới
  create: async (data: any) => {
    const response = await axiosClient.post("/purchase-orders", data);
    return response.data;
  },
  importOrders: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosClient.post(
      "/import/purchase-orders",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  // 4. Export Excel
  exportOrders: async (columns: string[]) => {
    const query = columns.length > 0 ? `?columns=${columns.join(",")}` : "";
    const response = await axiosClient.get(
      `/import/purchase-orders/export${query}`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  },
  // 3. Lấy danh sách Kho (Để đổ vào filter Chi nhánh)
  getWarehouses: async () => {
    // Giả sử có API này
    const response = await axiosClient.get("/warehouses");
    return response.data; // Trả về mảng [{id, name}, ...]
  },

  // 4. Lấy danh sách Nhân viên (Để đổ vào filter Người tạo)
  getStaffs: async () => {
    // Giả sử có API lấy list user/profile
    const response = await axiosClient.get("/users/staffs");
    return response.data; // Trả về mảng [{id, full_name}, ...]
  },
  deleteMany: async (ids: string[]) => {
    // Giả sử API backend hỗ trợ delete body hoặc query
    // Cách 1: Gửi body (chuẩn RESTful hiện đại)
    const response = await axiosClient.delete("/purchase-orders", {
      data: { ids },
    });
    return response.data;
  },
};
