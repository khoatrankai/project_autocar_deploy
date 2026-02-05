/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Plus,
  FileDown,
  Settings,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  LayoutGrid,
  Upload, // Import LayoutGrid
} from "lucide-react";
import { useState, useEffect, useRef } from "react"; // Import useRef
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";
import { purchaseOrderService } from "../../services/purchaseOrderService";
import CreatePurchaseOrderModal from "./CreatePurchaseOrderModal";
import ExportPurchaseOrderModal from "./modals/ExportPurchaseOrderModal";

const COLUMN_CONFIG = [
  { key: "code", label: "Mã nhập hàng", default: true },
  { key: "import_date", label: "Thời gian", default: true },
  { key: "supplier_code", label: "Mã NCC", default: true },
  { key: "supplier_name", label: "Nhà cung cấp", default: true },
  { key: "total_amount", label: "Tổng tiền hàng", default: false },
  { key: "final_amount", label: "Cần trả NCC", default: true },
  { key: "status", label: "Trạng thái", default: true },
];

export default function PurchaseOrderTable() {
  const { orders, total, filters, setFilters, fetchOrders, isLoading } =
    usePurchaseOrderStore();

  // --- STATE MODAL & SEARCH ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // --- STATE SELECTION (CHỌN DÒNG) ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE HIỂN THỊ CỘT (COLUMN SELECTOR) ---
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null); // Ref để bắt click out
  const [visibleColumns, setVisibleColumns] = useState<any>(() => {
    const initial: any = {};
    COLUMN_CONFIG.forEach((col) => (initial[col.key] = col.default));
    return initial;
  });

  // --- IMPORT STATE ---
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init Data
  useEffect(() => {
    fetchOrders();
  }, []);
  useEffect(() => {
    console.log(orders);
  }, [orders]);
  // Reset selection
  useEffect(() => {
    setSelectedIds([]);
  }, [orders]);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search)
        setFilters({ search: localSearch, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Click Outside Column Selector -> Close
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setShowColumnSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIC HELPERS ---
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllSelected =
    orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = selectedIds.filter(
        (id) => !orders.find((o) => o.id === id),
      );
      setSelectedIds(newSelected);
    } else {
      const newIds = orders.map((o) => o.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...newIds])));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${selectedIds.length} phiếu nhập đã chọn?`,
      )
    )
      return;

    setIsDeleting(true);
    try {
      await purchaseOrderService.deleteMany(selectedIds);
      toast.success(`Đã xóa ${selectedIds.length} phiếu nhập`);
      setSelectedIds([]);
      fetchOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi khi xóa dữ liệu");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(val);
  const formatDate = (date: string) =>
    format(new Date(date), "dd/MM/yyyy HH:mm");

  const renderStatus = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
            Đã nhập hàng
          </span>
        );
      case "draft":
        return (
          <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold">
            Phiếu tạm
          </span>
        );
      default:
        return (
          <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-bold">
            Đã hủy
          </span>
        );
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate đuôi file
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Vui lòng chọn file Excel (.xlsx, .xls)");
      return;
    }

    setIsImporting(true);
    const importPromise = purchaseOrderService.importOrders(file);

    toast
      .promise(importPromise, {
        loading: "Đang nhập dữ liệu...",
        success: (res) => {
          fetchOrders(); // Reload lại bảng
          return `Nhập thành công! ${res.message || ""}`;
        },
        error: (err) => {
          return err.response?.data?.message || "Lỗi khi nhập file";
        },
      })
      .finally(() => {
        setIsImporting(false);
        if (event.target) event.target.value = ""; // Reset input để chọn lại được file cũ
      });
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
        {/* --- INPUT FILE ẨN --- */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
        />
        {/* --- ACTION BAR --- */}
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm z-10">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Theo mã phiếu nhập..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded focus:border-blue-500 outline-none text-sm"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>

          <div className="flex gap-2 items-center">
            {/* Delete Button */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium text-sm mr-2 animate-in fade-in zoom-in"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>Xóa ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              <Plus size={16} /> Nhập hàng
            </button>

            {/* NÚT IMPORT */}
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              {isImporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              <span className="hidden sm:inline">
                {isImporting ? "Đang nhập..." : "Import"}
              </span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border rounded hover:bg-gray-50 text-sm"
            >
              <FileDown size={16} /> Xuất file
            </button>

            {/* --- COLUMN SELECTOR (ĐÃ THÊM) --- */}
            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 ${showColumnSelector ? "bg-gray-100" : "bg-white"}`}
              >
                <LayoutGrid size={20} />
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-100 p-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-xs font-bold text-gray-500 mb-2 px-2">
                    HIỂN THỊ CỘT
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {COLUMN_CONFIG.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 accent-blue-600 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          {col.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded border bg-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="flex-1 overflow-auto p-4 z-5">
          <div className="bg-white border rounded shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#f4f6f8] text-gray-500 font-semibold border-b sticky top-0 z-10">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4 w-10 text-center">
                    <Star size={14} />
                  </th>

                  {/* Render Dynamic Columns */}
                  {visibleColumns.code && <th className="p-4">Mã nhập hàng</th>}
                  {visibleColumns.import_date && (
                    <th className="p-4">Thời gian</th>
                  )}
                  {visibleColumns.supplier_code && (
                    <th className="p-4">Mã NCC</th>
                  )}
                  {visibleColumns.supplier_name && (
                    <th className="p-4">Nhà cung cấp</th>
                  )}
                  {visibleColumns.total_amount && (
                    <th className="p-4 text-right">Tổng tiền hàng</th>
                  )}
                  {visibleColumns.final_amount && (
                    <th className="p-4 text-right">Cần trả NCC</th>
                  )}
                  {visibleColumns.status && (
                    <th className="p-4 text-center">Trạng thái</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`hover:bg-blue-50/50 transition-colors ${selectedIds.includes(order.id) ? "bg-blue-50" : ""}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="accent-blue-600 w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => handleSelectOne(order.id)}
                        />
                      </td>
                      <td className="p-4 text-center">
                        <Star
                          size={16}
                          className="text-gray-300 hover:text-yellow-400 cursor-pointer"
                        />
                      </td>

                      {visibleColumns.code && (
                        <td className="p-4 font-medium text-blue-600 cursor-pointer hover:underline">
                          {order.code}
                        </td>
                      )}
                      {visibleColumns.import_date && (
                        <td className="p-4 text-gray-600">
                          {formatDate(order.import_date)}
                        </td>
                      )}
                      {visibleColumns.supplier_code && (
                        <td className="p-4 text-gray-600">
                          {order.supplier_code || "---"}
                        </td>
                      )}
                      {visibleColumns.supplier_name && (
                        <td className="p-4 font-medium text-gray-800">
                          {order.supplier_name}
                        </td>
                      )}
                      {visibleColumns.total_amount && (
                        <td className="p-4 text-right font-mono text-gray-600">
                          {formatMoney(order.total_amount)}
                        </td>
                      )}
                      {visibleColumns.final_amount && (
                        <td className="p-4 text-right font-mono font-bold text-gray-800">
                          {formatMoney(order.final_amount)}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="p-4 text-center">
                          {renderStatus(order.status)}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      Không tìm thấy dữ liệu phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            {total > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="text-gray-600">
                  Hiển thị <b>{(filters.page - 1) * filters.limit + 1}</b> -{" "}
                  <b>{Math.min(filters.page * filters.limit, total)}</b> trên
                  tổng số <b>{total}</b> phiếu
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilters({ page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 border rounded bg-blue-600 text-white">
                    {filters.page}
                  </span>
                  <button
                    onClick={() => setFilters({ page: filters.page + 1 })}
                    disabled={filters.page * filters.limit >= total}
                    className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreatePurchaseOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchOrders()}
      />
      <ExportPurchaseOrderModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
