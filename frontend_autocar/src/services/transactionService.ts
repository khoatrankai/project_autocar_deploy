/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from "./axiosClient"; // Giả sử bạn đã có axios instance

// Endpoint API

export const transactionService = {
  collectDebt: async (payload: {
    partnerId: string;
    staffId?: string;
    amount: number;
    paymentMethod: string;
    note?: string;
  }) => {
    const response = await axiosClient.post(
      "/transactions/collect-debt",
      payload,
    );
    return response.data;
  },

  // Lấy lịch sử giao dịch (nếu cần cho các tab khác)
  getHistory: async () => {
    const response = await axiosClient.get("/transactions");
    return response.data;
  },
};
