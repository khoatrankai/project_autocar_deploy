import { useEffect, useRef, useState } from "react";
import { useStockTransferStore } from "../store/useStockTransferStore";
import StockTransferFilter from "../components/stock-transfers/StockTransferFilter";
import StockTransferTable from "../components/stock-transfers/StockTransferTable";
import { useProductStore } from "../store/useProductStore";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore";

export default function StockTransferPage() {
  const {
    fetchTransfers,
    // Nếu store có thêm hàm fetchWarehouses cho bộ lọc thì gọi thêm ở đây
    // fetchWarehouses,
  } = useStockTransferStore();
  const {
    fetchFilterOptions,
    // Nếu store có thêm hàm fetchWarehouses cho bộ lọc thì gọi thêm ở đây
    // fetchWarehouses,
  } = useProductStore();

  const {
    fetchFilterOptions: fetchPurchase,
    // Nếu store có thêm hàm fetchWarehouses cho bộ lọc thì gọi thêm ở đây
    // fetchWarehouses,
  } = usePurchaseOrderStore();
  // Dùng useRef để đảm bảo API chỉ gọi 1 lần khi mount
  const isDataFetched = useRef(false);

  // State quản lý việc đóng/mở sidebar
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    if (!isDataFetched.current) {
      const initData = async () => {
        // Gọi API lấy danh sách phiếu chuyển
        await fetchTransfers();
        await fetchFilterOptions();
        await fetchPurchase();
        // Nếu cần lấy danh sách kho từ backend cho bộ lọc:
        // await fetchWarehouses();
      };

      initData();
      isDataFetched.current = true;
    }
  }, [fetchTransfers]);

  return (
    // Container chính: Full chiều cao - Header (64px)
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#f0f2f5]">
      {/* 1. Sidebar Filter (Bộ lọc bên trái) */}
      <StockTransferFilter
        isCollapsed={isFilterCollapsed}
        onToggle={() => setIsFilterCollapsed(!isFilterCollapsed)}
      />

      {/* 2. Main Content (Bảng dữ liệu bên phải) */}
      {/* flex-1 và min-w-0 giúp table tự co giãn lấp đầy khoảng trống còn lại */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <StockTransferTable />
      </div>
    </div>
  );
}
