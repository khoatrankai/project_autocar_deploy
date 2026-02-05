/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  FileDown,
  Settings,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Upload,
  Printer,
  ExternalLink,
  Edit,
  MoreHorizontal,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";

// --- IMPORT COMPONENTS ---
import { useReturnStore } from "../../store/useReturnStore";
import CreateReturnModal from "./modals/CreateReturnModal";
// Bạn cần tạo thêm ReturnDetailPanel tương tự StockTransferDetailPanel
// import CreateReturnModal from "./modals/CreateReturnModal"; // (Tạo sau)

// --- CẤU HÌNH CỘT ---
const COLUMN_CONFIG = [
  { key: "code", label: "Mã trả hàng", default: true },
  { key: "created_at", label: "Thời gian", default: true },
  { key: "partner", label: "Nhà cung cấp", default: true },
  { key: "total_refund", label: "Tổng tiền hàng", default: true },
  // Các cột giả định (chưa có trong model returns gốc nhưng có trong hình)
  { key: "discount", label: "Giảm giá", default: true },
  { key: "must_pay", label: "NCC cần trả", default: true },
  { key: "paid", label: "NCC đã trả", default: true },
  { key: "status", label: "Trạng thái", default: true },
  { key: "actions", label: "", default: true },
];

export default function ReturnTable() {
  const {
    returns,
    total,
    filters,
    setFilters,
    fetchReturns,
    isLoading,
    deleteReturn,
  } = useReturnStore();

  // State UI
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // State Selection & Expand
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      COLUMN_CONFIG.forEach((col) => (initial[col.key] = col.default));
      return initial;
    },
  );

  // Effects
  useEffect(() => {
    fetchReturns();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
    setExpandedRowId(null);
  }, [returns]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      )
        setShowColumnSelector(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search)
        setFilters({ search: localSearch, page: 1 });
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, setFilters]);

  // --- HANDLERS ---
  const handleToggleExpand = (id: string) =>
    setExpandedRowId((prev) => (prev === id ? null : id));

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((i) => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleSelectAll = () => {
    if (
      returns.length > 0 &&
      returns.every((t: any) => selectedIds.includes(t.id))
    ) {
      setSelectedIds(
        selectedIds.filter((id) => !returns.find((t: any) => t.id === id)),
      );
    } else {
      const newIds = returns.map((t: any) => t.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...newIds])));
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
    setExpandedRowId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa phiếu này?")) {
      await deleteReturn(id);
    }
  };

  // --- MENU ACTIONS ---
  const getActionMenu = (record: any): MenuProps => ({
    items: [
      {
        key: "view",
        label: "Xem chi tiết",
        icon: <ExternalLink size={16} />,
        onClick: () => handleToggleExpand(record.id),
      },
      { key: "print", label: "In phiếu", icon: <Printer size={16} /> },
      ...(record.status === "pending" || record.status === "draft"
        ? [
            { key: "edit", label: "Sửa phiếu", icon: <Edit size={16} /> },
            { type: "divider" as const },
            {
              key: "delete",
              label: <span className="text-red-600">Hủy phiếu</span>,
              icon: <XCircle size={16} className="text-red-600" />,
              danger: true,
              onClick: () => handleDelete(record.id),
            },
          ]
        : []),
    ],
  });

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  const formatDate = (dateString: string) =>
    dateString ? format(new Date(dateString), "dd/MM/yyyy HH:mm") : "";

  // Pagination
  const totalPages = Math.ceil(total / filters.limit);
  const currentPage = filters.page;

  const renderPaginationButtons = () => {
    const buttons = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded border text-sm transition-colors ${currentPage === i ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden min-h-[500px]">
        <input type="file" ref={fileInputRef} className="hidden" />

        {/* TOOLBAR */}
        <div className="p-4 flex justify-between items-center bg-white shadow-sm z-10 border-b border-gray-200">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, NCC..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none text-sm"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
          <div className="flex gap-2 items-center">
            {selectedIds.length > 0 && (
              <button className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
                <Trash2 size={16} /> <span>Xóa ({selectedIds.length})</span>
              </button>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
            >
              <Plus size={16} /> <span>Trả hàng</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50 text-sm">
              <Upload size={16} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50 text-sm">
              <FileDown size={16} />
              <span className="hidden sm:inline">Xuất file</span>
            </button>

            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="p-2 border rounded hover:bg-gray-50 bg-white text-gray-600"
              >
                <LayoutGrid size={20} />
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded shadow-lg border z-100 p-2">
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
                          className="accent-blue-600"
                        />
                        <span className="text-sm">{col.label || "Tác vụ"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="p-2 border rounded hover:bg-gray-50 bg-white text-gray-600">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-auto p-4 flex flex-col z-0">
          <div className="border border-gray-200 rounded bg-white shadow-sm flex-1 flex flex-col h-full">
            <div className="overflow-auto flex-1 relative h-full">
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}

              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-gray-500 uppercase bg-[#f9fafb] border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                        checked={
                          returns.length > 0 &&
                          returns.every((t: any) => selectedIds.includes(t.id))
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 w-8 text-center"></th>
                    {visibleColumns.code && (
                      <th className="p-4 font-semibold text-gray-600">
                        Mã trả hàng
                      </th>
                    )}
                    {visibleColumns.created_at && (
                      <th className="p-4 font-semibold text-gray-600">
                        Thời gian
                      </th>
                    )}
                    {visibleColumns.partner && (
                      <th className="p-4 font-semibold text-gray-600">
                        Nhà cung cấp
                      </th>
                    )}
                    {visibleColumns.total_refund && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Tổng tiền hàng
                      </th>
                    )}
                    {visibleColumns.discount && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Giảm giá
                      </th>
                    )}
                    {visibleColumns.must_pay && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        NCC cần trả
                      </th>
                    )}
                    {visibleColumns.paid && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        NCC đã trả
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="p-4 font-semibold text-gray-600 text-center">
                        Trạng thái
                      </th>
                    )}
                    {visibleColumns.actions && <th className="p-4 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {returns.length > 0
                    ? returns.map((item: any) => (
                        <React.Fragment key={item.id}>
                          <tr
                            className={`hover:bg-blue-50/60 transition-colors group cursor-pointer ${expandedRowId === item.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                            onClick={() => handleToggleExpand(item.id)}
                          >
                            <td
                              className="p-4 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="accent-blue-600 w-4 h-4 cursor-pointer"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => handleSelectOne(item.id)}
                              />
                            </td>
                            <td className="p-4 text-center text-gray-400">
                              {expandedRowId === item.id ? (
                                <ChevronUp
                                  size={16}
                                  className="text-blue-600"
                                />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </td>

                            {visibleColumns.code && (
                              <td className="p-4 font-medium text-blue-600">
                                {item.code}
                              </td>
                            )}
                            {visibleColumns.created_at && (
                              <td className="p-4 text-gray-600">
                                {formatDate(item.created_at)}
                              </td>
                            )}
                            {visibleColumns.partner && (
                              <td className="p-4 text-gray-800 font-medium uppercase text-xs">
                                {item.partners?.name || "---"}
                              </td>
                            )}

                            {visibleColumns.total_refund && (
                              <td className="p-4 text-right font-mono font-bold text-gray-900">
                                {formatMoney(item.total_refund)}
                              </td>
                            )}

                            {/* Các cột giả định: Giảm giá, Cần trả, Đã trả (Nếu model chưa có thì để 0) */}
                            {visibleColumns.discount && (
                              <td className="p-4 text-right text-gray-600">
                                {formatMoney(0)}
                              </td>
                            )}
                            {visibleColumns.must_pay && (
                              <td className="p-4 text-right font-bold text-blue-600">
                                {formatMoney(item.total_refund)}
                              </td>
                            )}
                            {visibleColumns.paid && (
                              <td className="p-4 text-right text-gray-600">
                                {formatMoney(0)}
                              </td>
                            )}

                            {visibleColumns.status && (
                              <td className="p-4 text-center">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-[11px] font-bold border ${
                                    item.status === "completed"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : item.status === "cancelled"
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                  }`}
                                >
                                  {item.status === "completed"
                                    ? "Đã trả hàng"
                                    : item.status === "cancelled"
                                      ? "Đã hủy"
                                      : "Phiếu tạm"}
                                </span>
                              </td>
                            )}

                            {visibleColumns.actions && (
                              <td
                                className="p-4 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Dropdown
                                  menu={getActionMenu(item)}
                                  trigger={["click"]}
                                  placement="bottomRight"
                                  overlayClassName="w-48"
                                >
                                  <button className="p-2 hover:bg-gray-200 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal size={18} />
                                  </button>
                                </Dropdown>
                              </td>
                            )}
                          </tr>

                          {/* EXPANDED ROW */}
                          {/* {expandedRowId === item.id && (
                        <tr>
                           <td colSpan={11} className="p-0 border-b-2 border-blue-100">
                              <ReturnDetailPanel 
                                 returnId={item.id} 
                                 onClose={() => setExpandedRowId(null)}
                              />
                           </td>
                        </tr>
                      )} */}
                        </React.Fragment>
                      ))
                    : !isLoading && (
                        <tr>
                          <td
                            colSpan={11}
                            className="p-12 text-center text-gray-400"
                          >
                            Không tìm thấy dữ liệu
                          </td>
                        </tr>
                      )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm flex-shrink-0">
                <div className="text-gray-600">
                  Hiển thị <b>{(currentPage - 1) * filters.limit + 1}</b> -{" "}
                  <b>{Math.min(currentPage * filters.limit, total)}</b> trên{" "}
                  <b>{total}</b>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {renderPaginationButtons()}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
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

      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchReturns();
        }}
      />
    </>
  );
}
