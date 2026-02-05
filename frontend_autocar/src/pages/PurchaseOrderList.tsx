import { useEffect, useRef, useState } from "react";
import PurchaseOrderFilter from "../components/purchase-orders/PurchaseOrderFilter";
import PurchaseOrderTable from "../components/purchase-orders/PurchaseOrderTable";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore";

export default function PurchaseOrderList() {
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const { fetchFilterOptions } = usePurchaseOrderStore();

  // Dùng useRef để đảm bảo API chỉ gọi 1 lần khi mount (tránh React Strict Mode double call)
  const isDataFetched = useRef(false);

  // State quản lý việc đóng/mở sidebar

  useEffect(() => {
    if (!isDataFetched.current) {
      const initData = async () => {
        // Gọi song song cả 2 API để tối ưu thời gian
        await Promise.all([fetchFilterOptions()]);
      };

      initData();
      isDataFetched.current = true;
    }
  }, []); // Dependency rỗng = Component Did Mount
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#f0f2f5]">
      <PurchaseOrderFilter
        isCollapsed={isFilterCollapsed}
        onToggle={() => setIsFilterCollapsed(!isFilterCollapsed)}
      />
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <PurchaseOrderTable />
      </div>
    </div>
  );
}
