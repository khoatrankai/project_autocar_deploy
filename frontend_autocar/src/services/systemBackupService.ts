import axiosClient from "./axiosClient";

export const systemBackupService = {
  // Lấy lịch sử chung
  getHistory: async () => {
    const response = await axiosClient.get("/system-backups/history");
    return response?.data?.data;
  },

  // Khôi phục theo batchCode
  restoreBatch: async (batchCode: string) => {
    const response = await axiosClient.post("/system-backups/restore", {
      batchCode,
    });
    return response?.data?.data;
  },

  // Xóa toàn bộ tồn kho (có tạo backup trước khi xóa)
  clearInventory: async (reason: string) => {
    const response = await axiosClient.post("/system-backups/clear-inventory", {
      reason,
    });
    return response?.data?.data;
  },

  // Lấy lịch sử riêng của Sản phẩm
  getProductHistory: async () => {
    const response = await axiosClient.get("/system-backups/products/history");
    return response?.data?.data;
  },

  // Khôi phục Sản phẩm theo batchCode
  restoreProducts: async (batchCode: string) => {
    const response = await axiosClient.post(
      "/system-backups/products/restore",
      { batchCode },
    );
    return response?.data?.data;
  },

  // Khôi phục toàn bộ sản phẩm bị xóa trong 30 ngày qua
  restoreAllLastMonth: async () => {
    const response = await axiosClient.post(
      "/system-backups/products/restore-last-month",
    );
    return response?.data?.data;
  },
};
