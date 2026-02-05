/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable prefer-const */

// src/components/suppliers/SupplierTable.tsx

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

import { format } from "date-fns";

import { toast } from "react-hot-toast";

// Import Custom Components & Store

import CreateSupplierModal from "./CreateSupplierModal";

import { useSupplierStore } from "../../store/useSupplierStore";

import { supplierService } from "../../services/supplierService";

import ExportSupplierModal from "./modals/ExportSupplierModal";

// Nếu chưa có ExportSupplierModal, bạn có thể comment lại hoặc tạo file tương tự Product

// import ExportSupplierModal from "./modals/ExportSupplierModal";

// --- CẤU HÌNH CỘT CHO NHÀ CUNG CẤP ---

const COLUMN_CONFIG = [
  { key: "code", label: "Mã NCC", default: true },

  { key: "name", label: "Tên nhà cung cấp", default: true },

  { key: "group_name", label: "Nhóm NCC", default: true },

  { key: "contact", label: "Liên hệ (SĐT/Email)", default: true }, // Gộp Phone + Email

  { key: "address", label: "Địa chỉ", default: false },

  { key: "current_debt", label: "Nợ hiện tại", default: true },

  { key: "total_revenue", label: "Tổng mua", default: true },

  { key: "status", label: "Trạng thái", default: true },

  { key: "created_at", label: "Ngày tạo", default: false },
];

export default function SupplierTable() {
  const { suppliers, total, filters, setFilters, fetchSuppliers, isLoading } =
    useSupplierStore();

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

  // Quản lý ẩn/hiện cột

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};

      COLUMN_CONFIG.forEach((col) => (initial[col.key] = col.default));

      return initial;
    },
  );

  const selectorRef = useRef<HTMLDivElement>(null);

  // Reset selection khi data thay đổi (ví dụ chuyển trang)

  useEffect(() => {
    console.log(suppliers);

    setSelectedIds([]);
  }, [suppliers]);

  // Click outside để đóng column selector

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

  // --- IMPORT LOGIC ---

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    console.log(file);

    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Vui lòng chọn file Excel (.xlsx, .xls)");

      return;
    }

    setIsImporting(true);

    // Giả sử supplierService có hàm importSuppliers tương tự products

    // Nếu chưa có, bạn cần thêm vào service

    // const importPromise = new Promise((resolve) => setTimeout(resolve, 1000)); // Mock tạm thời

    const importPromise = supplierService.importSuppliers(file);

    toast

      .promise(importPromise, {
        loading: "Đang nhập dữ liệu...",

        success: () => {
          fetchSuppliers();

          return "Nhập thành công!";
        },

        error: "Lỗi khi nhập file",
      })

      .finally(() => {
        setIsImporting(false);

        if (event.target) event.target.value = "";
      });
  };

  // --- SELECTION LOGIC ---

  const isAllSelected =
    suppliers.length > 0 && suppliers.every((s) => selectedIds.includes(s.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = selectedIds.filter(
        (id) => !suppliers.find((s) => s.id === id),
      );

      setSelectedIds(newSelected);
    } else {
      const newIds = suppliers.map((s) => s.id);

      const uniqueIds = Array.from(new Set([...selectedIds, ...newIds]));

      setSelectedIds(uniqueIds);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // --- DELETE LOGIC ---

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedIds.length} nhà cung cấp đã chọn?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      await supplierService.deleteMany(selectedIds);

      toast.success(`Đã xóa ${selectedIds.length} nhà cung cấp`);

      setSelectedIds([]);

      fetchSuppliers();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Xóa thất bại";

      toast.error(typeof msg === "string" ? msg : "Lỗi khi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- FORMATTERS ---

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",

      currency: "VND",
    }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  // --- PAGINATION ---

  const totalPages = Math.ceil(total / filters.limit);

  const currentPage = filters.page;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters({ page: newPage });
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];

    let startPage = Math.max(1, currentPage - 2);

    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded border text-sm transition-colors ${
            currentPage === i
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer"
          }`}
        >
          {i}
        </button>,
      );
    }

    return buttons;
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
              placeholder="Tìm theo mã, tên, SĐT..."
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
            {/* --- DELETE BUTTON --- */}

            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium text-sm mr-2 animate-in fade-in zoom-in duration-200"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus size={16} />{" "}
              <span className="hidden sm:inline">Thêm mới</span>
            </button>

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
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              <FileDown size={16} />{" "}
              <span className="hidden sm:inline">Xuất file</span>
            </button>

            {/* Column Selector Toggle */}

            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 ${
                  showColumnSelector ? "bg-gray-100" : "bg-white"
                }`}
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

              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-[#f4f6f8] border-b border-gray-200 sticky top-0 z-0">
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

                    {visibleColumns.code && (
                      <th className="p-4 font-semibold text-gray-600">
                        Mã NCC
                      </th>
                    )}

                    {visibleColumns.name && (
                      <th className="p-4 font-semibold text-gray-600">
                        Tên NCC
                      </th>
                    )}

                    {visibleColumns.group_name && (
                      <th className="p-4 font-semibold text-gray-600">Nhóm</th>
                    )}

                    {visibleColumns.contact && (
                      <th className="p-4 font-semibold text-gray-600">
                        Liên hệ
                      </th>
                    )}

                    {visibleColumns.address && (
                      <th className="p-4 font-semibold text-gray-600">
                        Địa chỉ
                      </th>
                    )}

                    {visibleColumns.current_debt && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Nợ
                      </th>
                    )}

                    {visibleColumns.total_revenue && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Tổng mua
                      </th>
                    )}

                    {visibleColumns.status && (
                      <th className="p-4 font-semibold text-gray-600 text-center">
                        Trạng thái
                      </th>
                    )}

                    {visibleColumns.created_at && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Ngày tạo
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {suppliers.length > 0 ? (
                    suppliers.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50/50 transition-colors group ${
                          selectedIds.includes(item.id) ? "bg-blue-50" : ""
                        }`}
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
                          <td className="p-4 font-medium text-blue-600 cursor-pointer hover:underline">
                            {item.code}
                          </td>
                        )}

                        {visibleColumns.name && (
                          <td className="p-4 font-medium text-gray-800">
                            {item.name}
                          </td>
                        )}

                        {visibleColumns.group_name && (
                          <td className="p-4 text-gray-600">
                            {item.group_name || "---"}
                          </td>
                        )}

                        {visibleColumns.contact && (
                          <td className="p-4 text-gray-600 text-xs">
                            <div className="font-medium">{item.phone}</div>

                            <div className="text-gray-400">{item.email}</div>
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
                            className={`p-4 text-right font-mono ${item.current_debt > 0 ? "text-red-500 font-bold" : "text-gray-700"}`}
                          >
                            {formatMoney(item.current_debt)}
                          </td>
                        )}

                        {visibleColumns.total_revenue && (
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatMoney(item.total_revenue)}
                          </td>
                        )}

                        {visibleColumns.status && (
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                item.status === "active"
                                  ? "text-green-700 bg-green-50"
                                  : "text-gray-500 bg-gray-100"
                              }`}
                            >
                              {item.status === "active"
                                ? "Đang hoạt động"
                                : "Ngừng hoạt động"}
                            </span>
                          </td>
                        )}

                        {visibleColumns.created_at && (
                          <td className="p-4 text-right text-gray-500 text-xs">
                            {formatDate(item.created_at)}
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
                  tổng số <b>{total}</b> nhà cung cấp
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {renderPaginationButtons()}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateSupplierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchSuppliers()}
      />

      <ExportSupplierModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
