/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/authApi.ts
import axios from "axios";
import type { LoginDto, RegisterDto, AuthResponse, User } from "../types/auth";
const baseURL =
  import.meta.env.VITE_API_URL ||
  "https://quotes-integration-closer-adjusted.trycloudflare.com";
// 1. Tạo instance axios
const api = axios.create({
  baseURL: baseURL, // Đổi theo port backend của bạn
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Interceptor: Tự động gắn Token vào mỗi request
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Các hàm gọi API
export const authApi = {
  // Đăng ký
  register: async (data: RegisterDto) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  // Đăng nhập
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const res = await api.post("/auth/login", data);
    return res?.data?.data;
  },

  // Lấy thông tin user hiện tại (cần Token)
  getProfile: async (): Promise<{ user: User }> => {
    const res = await api.get("/auth/me");
    return res.data?.data;
  },

  // Admin xóa user
  removeUser: async (id: string) => {
    await api.delete(`/auth/${id}`);
  },

  // Admin ban user
  banUser: async (id: string) => {
    await api.patch(`/auth/ban/${id}`);
  },
};
