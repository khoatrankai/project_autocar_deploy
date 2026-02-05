import { create } from "zustand";
import type { User } from "../types/auth";
import { isTokenValid } from "../utils/auth"; // Import hàm vừa tạo

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;

  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => void; // Hàm check thủ công nếu cần
}

// 1. Lấy dữ liệu thô từ LocalStorage
const storedToken = localStorage.getItem("access_token");
const storedUser = localStorage.getItem("user_info");

// 2. Kiểm tra tính hợp lệ ngay lập tức
const isValid = isTokenValid(storedToken);
console.log("vao roi", storedToken, storedUser);
// 3. Nếu Token tồn tại nhưng đã hết hạn -> Xóa sạch LocalStorage ngay để tránh rác
if (storedToken && !isValid) {
  console.log("Het han roi");
  // localStorage.removeItem("access_token");
  // localStorage.removeItem("user_info");
}

export const useAuthStore = create<AuthState>((set) => ({
  // 4. Khởi tạo State dựa trên kết quả kiểm tra (isValid)
  token: isValid ? storedToken : null,
  user: isValid && storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: isValid,

  login: (token, user) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_info", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_info");
    set({ token: null, user: null, isAuthenticated: false });
  },

  // Hàm này có thể dùng ở App.tsx để check định kỳ hoặc khi focus lại tab
  checkAuth: () => {
    const currentToken = localStorage.getItem("access_token");
    if (!isTokenValid(currentToken)) {
      // Nếu đang login mà phát hiện hết hạn -> Logout ngay
      set((state) => {
        if (state.isAuthenticated) {
          state.logout();
        }
        return {};
      });
    }
  },
}));
