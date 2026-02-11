/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Plus,
  FileDown,
  Settings,
  Star,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Upload,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useCustomerStore } from "../../store/useCustomerStore";
import { customerService } from "../../services/customerService";
import CreateCustomerModal from "./modals/CreateCustomerModal";
import ExportCustomerModal from "./modals/ExportCustomerModal";

// Import Custom Components & Store

// --- CẤU HÌNH CỘT ---
const COLUMN_CONFIG = [
  { key: "code", label: "Mã khách hàng", default: true },
  { key: "name", label: "Tên khách hàng", default: true },
  { key: "phone", label: "Điện thoại", default: true },
  { key: "group_name", label: "Nhóm KH", default: false },
  { key: "address", label: "Địa chỉ", default: false },
  // 3 cột số liệu quan trọng
  { key: "current_debt", label: "Nợ hiện tại", default: true },
  { key: "total_revenue", label: "Tổng bán", default: true },
  { key: "net_revenue", label: "Tổng bán trừ trả hàng", default: true },
];

export default function CustomerTable() {
  // Lấy data từ Store (Bao gồm cả phần summary cho header)
  const {
    customers,
    total,
    summary,
    filters,
    setFilters,
    fetchCustomers,
    isLoading,
  } = useCustomerStore();

  // --- STATE UI ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // --- STATE SELECTION ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE IMPORT ---
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Quản lý ẩn/hiện cột
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      COLUMN_CONFIG.forEach((col) => (initial[col.key] = col.default));
      return initial;
    },
  );

  // Load data & Reset selection
  useEffect(() => {
    fetchCustomers();
  }, []);
  useEffect(() => {
    setSelectedIds([]);
  }, [customers]);

  // Click outside column selector
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setShowColumnSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters({ search: localSearch, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, setFilters]);

  // --- HANDLERS ---
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    // const importPromise = customerService.import(file); // Giả sử có API import
    const importPromise = new Promise((resolve) => setTimeout(resolve, 1000));
    toast
      .promise(importPromise, {
        loading: "Đang nhập dữ liệu...",
        success: () => {
          fetchCustomers();
          return "Nhập thành công!";
        },
        error: "Lỗi khi nhập file",
      })
      .finally(() => {
        setIsImporting(false);
        if (event.target) event.target.value = "";
      });
  };

  const handleSelectAll = () => {
    if (
      customers.length > 0 &&
      customers.every((c: any) => selectedIds.includes(c.id))
    ) {
      setSelectedIds(
        selectedIds.filter((id) => !customers.find((c: any) => c.id === id)),
      );
    } else {
      const newIds = customers.map((c: any) => c.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...newIds])));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((item) => item !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedIds.length} khách hàng?`,
      )
    )
      return;

    setIsDeleting(true);
    try {
      await customerService.deleteMany(selectedIds);
      toast.success(`Đã xóa ${selectedIds.length} khách hàng`);
      setSelectedIds([]);
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- FORMATTERS ---
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount || 0);

  // --- PAGINATION ---
  const totalPages = Math.ceil(total / filters.limit);
  const currentPage = filters.page;
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setFilters({ page: newPage });
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
        />

        {/* --- ACTION BAR --- */}
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm z-10 border-b border-gray-200">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Theo mã, tên, số điện thoại..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>

          <div className="flex gap-2 items-center">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium text-sm"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus size={16} /> <span>Khách hàng</span>
            </button>

            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              {isImporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              <FileDown size={16} />{" "}
              <span className="hidden sm:inline">Xuất file</span>
            </button>

            {/* Column Selector */}
            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 ${showColumnSelector ? "bg-gray-100" : "bg-white"}`}
              >
                <LayoutGrid size={20} />
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 p-2">
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
                          onChange={() =>
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [col.key]: !prev[col.key],
                            }))
                          }
                          className="accent-blue-600 w-4 h-4"
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
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 bg-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* --- TABLE CONTENT --- */}
        <div className="flex-1 overflow-auto p-4 flex flex-col">
          <div className="border border-gray-200 rounded bg-white shadow-sm flex-1 flex flex-col">
            <div className="overflow-auto flex-1 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-gray-500 bg-[#f4f6f8] border-b border-gray-200 sticky top-0 z-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                        checked={
                          customers.length > 0 &&
                          customers.every((c: any) =>
                            selectedIds.includes(c.id),
                          )
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 w-10 text-center">
                      <Star size={14} />
                    </th>

                    {visibleColumns.code && (
                      <th className="p-4 font-semibold text-gray-600">
                        Mã Khách hàng
                      </th>
                    )}
                    {visibleColumns.name && (
                      <th className="p-4 font-semibold text-gray-600">
                        Tên khách hàng
                      </th>
                    )}
                    {visibleColumns.phone && (
                      <th className="p-4 font-semibold text-gray-600">
                        Điện thoại
                      </th>
                    )}
                    {visibleColumns.group_name && (
                      <th className="p-4 font-semibold text-gray-600">
                        Nhóm KH
                      </th>
                    )}
                    {visibleColumns.address && (
                      <th className="p-4 font-semibold text-gray-600">
                        Địa chỉ
                      </th>
                    )}

                    {/* CỘT CÓ SỐ LIỆU TỔNG QUAN (Header) */}
                    {visibleColumns.current_debt && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        <div>Nợ hiện tại</div>
                        {/* Hiển thị tổng nợ từ summary */}
                        <div className="text-red-600 font-bold text-xs mt-1">
                          {formatMoney(summary?.totalDebt || 0)}
                        </div>
                      </th>
                    )}

                    {visibleColumns.total_revenue && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        <div>Tổng bán</div>
                        <div className="text-gray-800 font-bold text-xs mt-1">
                          {formatMoney(summary?.totalRevenue || 0)}
                        </div>
                      </th>
                    )}

                    {visibleColumns.net_revenue && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        <div>Tổng bán trừ trả hàng</div>
                        <div className="text-gray-800 font-bold text-xs mt-1">
                          {formatMoney(summary?.netRevenue || 0)}
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {customers.length > 0 ? (
                    customers.map((item: any) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50/50 transition-colors group ${selectedIds.includes(item.id) ? "bg-blue-50" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="accent-blue-600 w-4 h-4 cursor-pointer"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelectOne(item.id)}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Star
                            size={16}
                            className="text-gray-300 hover:text-yellow-400 cursor-pointer"
                          />
                        </td>

                        {visibleColumns.code && (
                          <td className="p-4 text-gray-500">{item.code}</td>
                        )}

                        {visibleColumns.name && (
                          <td className="p-4 font-medium text-blue-600 cursor-pointer hover:underline">
                            {item.name}
                          </td>
                        )}

                        {visibleColumns.phone && (
                          <td className="p-4 text-gray-600">{item.phone}</td>
                        )}

                        {visibleColumns.group_name && (
                          <td className="p-4 text-gray-600">
                            {item.group_name || "---"}
                          </td>
                        )}

                        {visibleColumns.address && (
                          <td
                            className="p-4 text-gray-600 truncate max-w-[150px]"
                            title={item.address}
                          >
                            {item.address || "---"}
                          </td>
                        )}

                        {visibleColumns.current_debt && (
                          <td
                            className={`p-4 text-right font-mono ${Number(item.current_debt) > 0 ? "text-red-500 font-bold" : "text-gray-700"}`}
                          >
                            {formatMoney(item.current_debt)}
                          </td>
                        )}

                        {visibleColumns.total_revenue && (
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatMoney(item.total_revenue)}
                          </td>
                        )}

                        {visibleColumns.net_revenue && (
                          // Hiện tại model chưa có net_revenue per row, tạm dùng total_revenue hoặc tính toán nếu có data trả hàng
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatMoney(item.total_revenue)}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-8 text-center text-gray-500"
                      >
                        {isLoading
                          ? "Đang tải dữ liệu..."
                          : "Không tìm thấy dữ liệu phù hợp"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* --- PAGINATION FOOTER --- */}
            {total > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="text-gray-600">
                  Hiển thị <b>{(currentPage - 1) * filters.limit + 1}</b> -{" "}
                  <b>{Math.min(currentPage * filters.limit, total)}</b> trên
                  tổng số <b>{total}</b> khách hàng
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {/* Logic render page buttons có thể tái sử dụng từ SupplierTable */}
                  <span className="px-3 py-1 bg-blue-600 text-white rounded text-xs">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateCustomerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchCustomers()}
      />
      <ExportCustomerModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
