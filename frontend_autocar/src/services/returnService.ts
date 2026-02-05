/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosClient from "./axiosClient"; // Giả sử bạn đã có axios instance

// Endpoint API
const ENDPOINT = "/returns";

export const returnService = {
  // Lấy danh sách (có filter)
  getAll: (params: any) => {
    return axiosClient.get(ENDPOINT, { params });
  },

  // Lấy chi tiết
  getOne: (id: string) => {
    return axiosClient.get(`${ENDPOINT}/${id}`);
  },

  // Tạo phiếu trả (nhập/bán)
  create: (data: any) => {
    return axiosClient.post(ENDPOINT, data);
  },

  // Cập nhật (nếu cần)
  update: (id: string, data: any) => {
    return axiosClient.patch(`${ENDPOINT}/${id}`, data);
  },

  // Xóa
  delete: (id: string) => {
    return axiosClient.delete(`${ENDPOINT}/${id}`);
  },

  // Xóa nhiều
  deleteMany: (ids: string[]) => {
    return axiosClient.delete(`${ENDPOINT}/bulk`, { data: { ids } });
  },
};
