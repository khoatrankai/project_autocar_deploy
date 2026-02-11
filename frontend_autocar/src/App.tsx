// App.tsx
import { Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import { UserRole } from "./types/auth";
import AuthPage from "./pages/AuthPage";
import ProductList from "./pages/ProductList";
import PublicRoute from "./components/shared/PublicRoute";
import SupplierList from "./pages/SupplierList";
import PurchaseOrderList from "./pages/PurchaseOrderList";
import StockTransferPage from "./pages/StockTransferPage";
import ReturnPage from "./pages/ReturnPage";
import CustomerList from "./pages/CustomerList";
import PosPage from "./pages/PosPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* --- CÁC TRANG CẦN ĐĂNG NHẬP --- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          {/* Trang chủ dashboard (hoặc redirect về products) */}
          <Route index element={<ProductList />} />

          {/* NHÓM PRODUCTS */}
          {/* Dùng path="products" (relative) để gom nhóm */}
          <Route path="products">
            <Route index element={<ProductList />} /> {/* URL: /products */}
            <Route path="transfer" element={<StockTransferPage />} />{" "}
            {/* URL: /products/transfer */}
            <Route path="import" element={<PurchaseOrderList />} />{" "}
            <Route path="return" element={<ReturnPage />} />
            {/* URL: /products/import */}
            {/* Thêm các route khác vào đây: price-setting, dispose... */}
          </Route>

          <Route path="suppliers" element={<SupplierList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="orders" element={<PosPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      {/* --- TRANG CHỈ DÀNH CHO ADMIN (Ban/Delete User) --- */}
      <Route element={<ProtectedRoute roles={[UserRole.ADMIN]} />}>
        <Route path="/admin" element={<MainLayout />}>
          <Route
            index
            element={<div>Trang quản trị User (Chỉ Admin thấy)</div>}
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
