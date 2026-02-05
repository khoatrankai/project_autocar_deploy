// src/types/auth.ts

// Enum Role giống hệt Backend
export const UserRole = {
  ADMIN: "admin",
  SALE: "sale",
  WAREHOUSE: "warehouse",
  ACCOUNTANT: "accountant",
} as const; // <--- as const giúp nó trở thành Read-only

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
// User Profile nhận về từ API /me`
export interface User {
  id: string;
  email: string;
  full_name: string; // Backend trả về snake_case
  phone_number?: string;
  role: UserRole;
  created_at?: string;
}

// Kết quả trả về khi Login thành công
export interface AuthResponse {
  access_token: string;
  user: User; // Backend có thể trả về user luôn hoặc phải gọi /me để lấy
}

// DTO gửi đi khi Đăng ký (Khớp RegisterDto)
export interface RegisterDto {
  email: string;
  password: string;
  full_name: string; // Lưu ý: snake_case
  phone_number?: string; // Lưu ý: snake_case
  role?: UserRole;
}

// DTO gửi đi khi Đăng nhập (Khớp LoginDto)
export interface LoginDto {
  email: string;
  password: string;
}
