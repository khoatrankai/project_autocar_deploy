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
};
