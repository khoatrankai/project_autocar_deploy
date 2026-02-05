import { useEffect, useRef, useState } from "react";
// Import Stores
import { useReturnStore } from "../store/useReturnStore";
import { useProductStore } from "../store/useProductStore";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore";

// Import Components
import ReturnFilter from "../components/returns/ReturnFilter";
import ReturnTable from "../components/returns/ReturnTable";

export default function ReturnPage() {
  // 1. Lấy các hàm fetch từ Store
  const { fetchReturns } = useReturnStore();

  const { fetchFilterOptions: fetchProductOptions } = useProductStore(); // Lấy danh sách Kho (Warehouses)

  const { fetchFilterOptions: fetchPurchaseOptions } = usePurchaseOrderStore(); // Lấy danh sách NCC & Nhân viên (Suppliers & Staffs)

  // Dùng useRef để đảm bảo API chỉ gọi 1 lần khi mount (đặc biệt trong React 18 Strict Mode)
  const isDataFetched = useRef(false);

  // State quản lý việc đóng/mở sidebar filter
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    if (!isDataFetched.current) {
      const initData = async () => {
        // Gọi API song song để tiết kiệm thời gian
        await Promise.all([
          fetchReturns(), // Lấy danh sách phiếu trả
          fetchProductOptions(), // Lấy option kho
          fetchPurchaseOptions(), // Lấy option NCC, nhân viên
        ]);
      };

      initData();
      isDataFetched.current = true;
    }
  }, [fetchReturns, fetchProductOptions, fetchPurchaseOptions]);

  return (
    // Container chính: Full chiều cao - Header (64px/14rem trong layout chính)
    // overflow-hidden để scroll nằm trong table/filter chứ không phải cả trang
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-[#f0f2f5]">
      {/* 1. Sidebar Filter (Bộ lọc bên trái) */}
      <ReturnFilter
        isCollapsed={isFilterCollapsed}
        onToggle={() => setIsFilterCollapsed(!isFilterCollapsed)}
      />

      {/* 2. Main Content (Bảng dữ liệu bên phải) */}
      {/* flex-1 và min-w-0 giúp table tự co giãn lấp đầy khoảng trống còn lại */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <ReturnTable />
      </div>
    </div>
  );
}
