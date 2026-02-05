/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import type { LoginDto, RegisterDto } from "../types/auth";
import { toast } from "react-hot-toast"; // 1. Dùng Toast thay vì Alert

// Hook Đăng nhập
export const useLogin = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: (data: LoginDto) => authApi.login(data),

    onSuccess: async (data) => {
      // data ở đây là response từ API Login (thường chứa access_token)
      const accessToken = data.access_token;

      // ✅ ĐÚNG: Lưu ngay vào Storage để request tiếp theo (getProfile) có token dùng
      localStorage.setItem("access_token", accessToken);

      // Hiển thị loading nhẹ hoặc toast đang xử lý nếu cần thiết
      const toastId = toast.loading("Đang lấy thông tin tài khoản...");

      try {
        // 2. Gọi API lấy thông tin User
        // Lúc này axiosClient interceptor sẽ đọc được token từ localStorage vừa set ở trên
        const profileRes = await authApi.getProfile();

        // Kiểm tra kỹ cấu trúc trả về của getProfile.
        // Nếu backend trả về { data: user } hay { user: ... } thì map cho đúng.
        // Giả sử profileRes chính là object User hoặc profileRes.data
        // console.log(profileRes);
        // const user = profileRes.user || profileRes;

        // 3. Cập nhật vào Store
        // Lưu ý: Hàm setAuth trong Store cũng set localStorage lần nữa,
        // nhưng không sao, nó chỉ ghi đè lại giá trị cũ, không ảnh hưởng logic.
        setAuth(accessToken, profileRes.user);

        toast.success("Đăng nhập thành công!");
        toast.dismiss(toastId);

        navigate("/");
      } catch (error) {
        console.error("Lỗi lấy thông tin user:", error);
        localStorage.removeItem("access_token"); // <--- THỦ PHẠM XÓA TOKEN
        alert("Đăng nhập thất bại...");
      }
    },
    onError: (error: any) => {
      // Xử lý thông báo lỗi chi tiết
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        // Nếu NestJS trả về mảng lỗi (Validation Pipe)
        toast.error(message[0]);
      } else {
        toast.error(message || "Đăng nhập thất bại. Vui lòng kiểm tra lại.");
      }
    },
  });
};

// Hook Đăng ký
export const useRegister = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: () => {
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
        toast.error(message[0]);
      } else {
        toast.error(message || "Đăng ký thất bại.");
      }
    },
  });
};
