// src/pages/CustomerList.tsx

import { useEffect, useRef, useState } from "react";
import { useCustomerStore } from "../store/useCustomerStore";
import CustomerFilter from "../components/customers/CustomerFilter";
import CustomerTable from "../components/customers/CustomerTable";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore"; // Để load danh sách nhân viên cho bộ lọc

export default function CustomerList() {
  const {
    fetchCustomers,
    fetchFilterOptions, // Gọi cái này để lấy Data cho Dropdown Filter (Nhóm KH)
  } = useCustomerStore();

  const {
    fetchFilterOptions: fetchStaffOptions, // Gọi thêm cái này để lấy list Nhân viên cho bộ lọc "Người tạo"
  } = usePurchaseOrderStore();

  // Dùng useRef để đảm bảo API chỉ gọi 1 lần khi mount (tránh React Strict Mode double call)
  const isDataFetched = useRef(false);

  // State quản lý việc đóng/mở sidebar
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    if (!isDataFetched.current) {
      const initData = async () => {
        // Gọi song song các API cần thiết để tối ưu thời gian tải trang
        await Promise.all([
          fetchCustomers(),
          fetchFilterOptions(),
          fetchStaffOptions(),
        ]);
      };

      initData();
      isDataFetched.current = true;
    }
  }, []); // Dependency rỗng = Component Did Mount

  return (
    // Container chính: Full chiều cao - Header (64px)
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#f0f2f5]">
      {/* 1. Sidebar Filter */}
      <CustomerFilter
        isCollapsed={isFilterCollapsed}
        onToggle={() => setIsFilterCollapsed(!isFilterCollapsed)}
      />

      {/* 2. Main Content (Table) */}
      {/* flex-1 và min-w-0 giúp table tự co giãn lấp đầy khoảng trống còn lại */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <CustomerTable />
      </div>
    </div>
  );
}
