/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from "./axiosClient";

export interface TransferItemInput {
  product_id: number | string;
  quantity: number;
}

export interface CreateTransferInput {
  code: string;
  from_warehouse_id: number | string;
  to_warehouse_id: number | string;
  note?: string;
  items: TransferItemInput[];
}

export const stockTransferService = {
  // Lấy danh sách (có bộ lọc)
  getAll: (params: any) => {
    return axiosClient.get("/stock-transfers/advance", { params });
  },

  // Lấy chi tiết 1 phiếu
  getOne: (id: string | number) => {
    return axiosClient.get(`/stock-transfers/${id}`);
  },

  // Tạo phiếu chuyển (Kho gửi)
  create: (data: CreateTransferInput) => {
    return axiosClient.post("/stock-transfers", data);
  },

  // Nhận hàng (Kho nhận)
  receive: (id: string | number) => {
    return axiosClient.post(`/stock-transfers/${id}/receive`);
  },

  // Từ chối/Hủy phiếu
  reject: (id: string | number, reason: string) => {
    return axiosClient.post(`/stock-transfers/${id}/reject`, { reason });
  },

  update: async (id: number | string, data: any, userId?: string) => {
    // Nếu có userId thì nối vào query URL
    const url = userId
      ? `/stock-transfers/${id}?userId=${userId}`
      : `/stock-transfers/${id}`;

    const response = await axiosClient.put(url, data);
    return response.data;
  },

  /**
   * Xóa một phiếu chuyển (Hoàn lại tồn kho nếu đang pending)
   */
  remove: async (id: number | string) => {
    const response = await axiosClient.delete(`/stock-transfers/${id}`);
    return response.data;
  },

  /**
   * Xóa nhiều phiếu chuyển cùng lúc
   */
  removeMany: async (ids: (number | string)[]) => {
    const response = await axiosClient.post(`/stock-transfers/delete-many`, {
      ids,
    });
    return response.data;
  },
};
