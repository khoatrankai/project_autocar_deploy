// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom"; // <--- Thêm useLocation
import { useAuthStore } from "../store/useAuthStore";
import { UserRole } from "../types/auth";

interface Props {
  roles?: UserRole[];
}

export default function ProtectedRoute({ roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation(); // <--- Lấy vị trí hiện tại
  console.log(isAuthenticated, user);
  // 1. Chưa đăng nhập
  if (!isAuthenticated || !user) {
    // QUAN TRỌNG: Thêm state={{ from: location }} để lưu vết
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Sai quyền
  if (roles && !roles.includes(user.role)) {
    alert("Bạn không có quyền truy cập trang này!");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
