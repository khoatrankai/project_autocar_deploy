// src/components/PublicRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

export default function PublicRoute() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  // Nếu đã đăng nhập rồi -> Đuổi về trang trước đó hoặc trang chủ
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  // Nếu chưa đăng nhập -> Cho phép xem Login/Register
  return <Outlet />;
}
