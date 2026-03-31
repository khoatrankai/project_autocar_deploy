/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/supplierService.ts
import axiosClient from "./axiosClient";
export interface OrderFilterParams {
  startDate?: string;
  endDate?: string;
  search?: string;
  // page?: number;
  // limit?: number;
}
export const orderService = {
  getStocks: async (productId: any) => {
    const response = await axiosClient.get(`/orders/stock-card/${productId}`);
    return response.data?.data;
  },

  create: async (payload: any) => {
    // Gọi API: POST /orders
    const response = await axiosClient.post("/orders", payload);
    return response?.data?.data;
  },
  update: async (id: string | number, data: any) => {
    const response = await axiosClient.put(`/orders/${id}`, data);
    return response?.data?.data;
  },

  /**
   * Xóa một đơn hàng
   * Lưu ý: Backend chỉ cho phép xóa khi đơn hàng CHƯA hoàn thành.
   */
  remove: async (id: string | number) => {
    const response = await axiosClient.delete(`/orders/${id}`);
    return response.data;
  },
  removeMany: async (ids: string[]) => {
    // Backend yêu cầu body có dạng { ids: ['1', '2'] }
    const response = await axiosClient.post(`/orders/delete-many`, { ids });
    return response.data;
  },

  // Lấy chi tiết đơn hàng (để in hóa đơn sau khi bán)
  getDetail: async (id: string) => {
    const response = await axiosClient.get(`/orders/${id}`);
    return response.data;
  },

  getAll: async (params?: OrderFilterParams) => {
    const response = await axiosClient.get(`/orders`, { params });
    return response.data;
  },
  getDailySales: async (date: string) => {
    const response = await axiosClient.get("/orders/daily-sales", {
      params: { date },
    });
    return response.data;
  },

  getRevenueAndProfit: async (
    startDate: string,
    endDate: string,
    staffId?: string,
  ) => {
    const response = await axiosClient.get("/orders/revenue-and-profit", {
      params: { startDate, endDate, staffId },
    });
    return response.data;
  },

  getPayroll: async (staffId: string, month: number, year: number) => {
    const response = await axiosClient.get("/orders/payroll", {
      params: { staffId, month, year },
    });
    return response.data;
  },

  getOverdueDebts: async (days: number = 30) => {
    const response = await axiosClient.get("/orders/debts/overdue", {
      params: { days },
    });
    return response.data;
  },
};
