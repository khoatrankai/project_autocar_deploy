/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/supplierService.ts
import axiosClient from "./axiosClient";

export const orderService = {
  getStocks: async (productId: any) => {
    const response = await axiosClient.get(`/orders/stock-card/${productId}`);
    return response.data?.data;
  },
};
