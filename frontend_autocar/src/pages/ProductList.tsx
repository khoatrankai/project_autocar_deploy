// src/pages/ProductList.tsx

import { useEffect, useRef, useState } from "react";
import ProductFilter from "../components/products/ProductFilter";
import ProductTable from "../components/products/ProductTable";
import { useProductStore } from "../store/useProductStore";

export default function ProductList() {
  const { fetchFilterOptions, fetchProducts } = useProductStore();

  // Dùng useRef để đảm bảo API chỉ gọi 1 lần khi mount (tránh React Strict Mode double call)
  const isDataFetched = useRef(false);

  // State quản lý việc đóng/mở sidebar
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    if (!isDataFetched.current) {
      const initData = async () => {
        // Gọi song song cả 2 API để tối ưu thời gian
        await Promise.all([fetchProducts(), fetchFilterOptions()]);
      };

      initData();
      isDataFetched.current = true;
    }
  }, []); // Dependency rỗng = Component Did Mount

  return (
    // Container chính: Full chiều cao - Header (64px)
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#f0f2f5]">
      {/* 1. Sidebar Filter */}
      <ProductFilter
        isCollapsed={isFilterCollapsed}
        onToggle={() => setIsFilterCollapsed(!isFilterCollapsed)}
      />

      {/* 2. Main Content (Table) */}
      {/* flex-1 và min-w-0 giúp table tự co giãn lấp đầy khoảng trống còn lại */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <ProductTable />
      </div>
    </div>
  );
}
