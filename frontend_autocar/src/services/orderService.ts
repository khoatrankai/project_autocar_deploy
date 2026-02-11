/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/supplierService.ts
import axiosClient from "./axiosClient";

export const orderService = {
  getStocks: async (productId: any) => {
    const response = await axiosClient.get(`/orders/stock-card/${productId}`);
    return response.data?.data;
  },

  create: async (payload: any) => {
    // Gọi API: POST /orders
    const response = await axiosClient.post("/orders", payload);
    return response.data;
  },

  // Lấy chi tiết đơn hàng (để in hóa đơn sau khi bán)
  getDetail: async (id: string) => {
    const response = await axiosClient.get(`/orders/${id}`);
    return response.data;
  },
};
