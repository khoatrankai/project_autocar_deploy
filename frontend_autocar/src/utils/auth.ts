/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/auth.ts
import { jwtDecode } from "jwt-decode";

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;

  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000; // Chuyển sang giây

    // Kiểm tra nếu thời gian hết hạn (exp) nhỏ hơn thời gian hiện tại -> Hết hạn
    if (decoded.exp < currentTime) {
      return false;
    }

    return true;
  } catch (err) {
    return false; // Token lỗi format -> coi như không hợp lệ
  }
};
