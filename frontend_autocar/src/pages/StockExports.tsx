/* eslint-disable no-case-declarations */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Eye,
  Printer,
  Download,
  FileText,
  Loader2,
  Calendar,
  Filter,
  ChevronDown,
  Trash2, // Thêm icon xóa
  Edit, // Thêm icon sửa
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Dropdown } from "antd"; // Dùng Dropdown của Antd cho menu thao tác
import type { MenuProps } from "antd";

import { orderService } from "../services/orderService";
import exportOrdersToExcel from "../utils/exportOrdersExcel";
import UpdateOrderModal from "../components/stock-export/UpdateOrderModal";
import OrderDetailModal from "../components/stock-export/OrderDetailModal";

const timeFilterLabels: Record<string, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  year: "Năm nay",
  all: "Tất cả thời gian",
};

export default function StockExportPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updateOrderId, setUpdateOrderId] = useState<string | null>(null);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  // --- STATES SELECTION & DELETION ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATES QUẢN LÝ BỘ LỌC THỜI GIAN ---
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS LẤY DỮ LIỆU ---
  const fetchOrders = async (
    params: { startDate?: string; endDate?: string } = {},
  ) => {
    setIsLoading(true);
    try {
      const res = await orderService.getAll(params);
      setOrders(res.data);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách đơn bán hàng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(dateRange);
  }, []);

  useEffect(() => {
    setSelectedIds([]); // Reset selection khi data đổi
  }, [orders]);

  // --- LỌC THỜI GIAN ---
  const handleSelectTimeFilter = (type: string) => {
    setTimeFilter(type);
    setShowTimeDropdown(false);

    const now = new Date();
    let startDate = "";
    let endDate = "";

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    switch (type) {
      case "today":
        startDate = formatDate(now);
        endDate = formatDate(now);
        break;
      case "week":
        const day = now.getDay();
        const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
        const firstDayOfWeek = new Date(now.setDate(diffToMonday));
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        startDate = formatDate(firstDayOfWeek);
        endDate = formatDate(lastDayOfWeek);
        break;
      case "month":
        startDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        endDate = formatDate(
          new Date(now.getFullYear(), now.getMonth() + 1, 0),
        );
        break;
      case "year":
        startDate = formatDate(new Date(now.getFullYear(), 0, 1));
        endDate = formatDate(new Date(now.getFullYear(), 11, 31));
        break;
      case "all":
      default:
        startDate = "";
        endDate = "";
        break;
    }

    const newRange = { startDate, endDate };
    setDateRange(newRange);
    fetchOrders(newRange);
  };

  // --- SELECTION HANDLERS ---
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

  // --- DELETE HANDLERS ---
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    // Lọc ra các ID hợp lệ (những đơn chưa hoàn thành)
    const validIdsToDelete = selectedIds.filter((id) => {
      const order = orders.find((o) => o.id === id);
      return order && order.status !== "completed";
    });

    if (validIdsToDelete.length < selectedIds.length) {
      toast("Đã loại bỏ các đơn hàng đã hoàn thành khỏi danh sách xóa.", {
        icon: "ℹ️",
      });
    }

    if (validIdsToDelete.length === 0) {
      toast.error("Không có đơn hàng nào hợp lệ để xóa!");
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${validIdsToDelete.length} đơn hàng đã chọn?`,
      )
    )
      return;

    setIsDeleting(true);
    try {
      // SỬ DỤNG API MỚI DELETE-MANY Ở ĐÂY
      await orderService.removeMany(validIdsToDelete);

      toast.success(`Đã xóa ${validIdsToDelete.length} đơn hàng.`);
      setSelectedIds([]); // Reset lại các ô checkbox
      fetchOrders(dateRange); // Load lại bảng
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi khi xóa dữ liệu");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đơn hàng ${code}?`)) return;
    try {
      await orderService.remove(id);
      toast.success(`Xóa đơn hàng ${code} thành công!`);
      fetchOrders(dateRange);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa đơn hàng");
    }
  };

  // --- ACTION MENU ---
  const getActionMenu = (order: any): MenuProps => ({
    items: [
      {
        key: "view",
        label: "Xem chi tiết",
        icon: <Eye size={16} />,
        onClick: () => setViewOrderId(order.id),
      },
      { key: "print", label: "In phiếu", icon: <Printer size={16} /> },
      ...(order.status !== "completed"
        ? [
            {
              key: "edit",
              label: "Sửa đơn hàng",
              icon: <Edit size={16} />,
              onClick: () => setUpdateOrderId(order.id), // Gắn id để mở Modal
            },
            { type: "divider" as const },
            {
              key: "delete",
              label: <span className="text-red-600">Xóa đơn hàng</span>,
              icon: <Trash2 size={16} className="text-red-600" />,
              danger: true,
              onClick: () => handleDeleteSingle(order.id, order.code),
            },
          ]
        : []), // Ẩn Sửa/Xóa nếu đã hoàn thành
    ],
  });

  const handleExportExcel = async () => {
    await exportOrdersToExcel(filteredOrders);
  };

  // --- FILTER LOCAL ---
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.code?.toLowerCase().includes(term) ||
      order.partners?.name?.toLowerCase().includes(term) ||
      order.partners?.phone?.includes(term)
    );
  });

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(val);

  return (
    <div className="flex flex-col h-full bg-gray-100 p-4 font-sans">
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Phiếu xuất kho / Bán hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các đơn hàng đã bán và xuất kho
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* NÚT XÓA XUẤT HIỆN KHI CHỌN */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors text-sm font-medium animate-in fade-in"
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
            onClick={handleExportExcel}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Download size={16} /> Xuất Excel
          </button>
          <button
            onClick={() => (window.location.href = "/pos")}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 text-sm font-bold transition-colors shadow-sm"
          >
            Tạo đơn mới (POS)
          </button>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white p-4 rounded-t border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên, SĐT khách..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-blue-500 text-sm transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>

        <div className="flex gap-3">
          {/* --- NÚT DROPDOWN LỌC THỜI GIAN --- */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 min-w-[160px] bg-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" />
                <span className="font-medium">
                  {timeFilterLabels[timeFilter]}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {/* Menu thả xuống */}
            {showTimeDropdown && (
              <div className="absolute top-full right-0 mt-1 w-[160px] bg-white border border-gray-200 rounded shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {Object.entries(timeFilterLabels).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => handleSelectTimeFilter(key)}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                      timeFilter === key
                        ? "text-blue-600 bg-blue-50 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 bg-white">
              <Filter size={16} className="text-gray-500" />
              Lọc thêm
            </button>
          </div>
        </div>
      </div>

      {/* 3. DATA TABLE */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col rounded-b shadow-sm relative">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8fbff] text-gray-600 sticky top-0 z-10 text-xs font-bold uppercase border-b border-gray-200 shadow-sm">
              <tr>
                <th className="p-3 w-12 text-center">
                  <input
                    type="checkbox"
                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-3 whitespace-nowrap">Mã phiếu</th>
                <th className="p-3 whitespace-nowrap">Thời gian</th>
                <th className="p-3 min-w-[150px]">Khách hàng</th>
                <th className="p-3">Kho xuất</th>
                <th className="p-3">Người bán</th>
                <th className="p-3 text-right">Tổng tiền</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 w-16 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-500">
                    <Loader2
                      size={32}
                      className="animate-spin mx-auto mb-2 text-blue-500"
                    />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-2 opacity-20" />
                    Không tìm thấy phiếu xuất nào.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isDebt =
                    Number(order.final_amount) > Number(order.paid_amount);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-blue-50/50 transition-colors group ${selectedIds.includes(order.id) ? "bg-blue-50" : ""}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          className="accent-blue-600 w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => handleSelectOne(order.id)}
                        />
                      </td>
                      <td
                        className="p-3 font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => setViewOrderId(order.id)}
                      >
                        {order.code}
                      </td>
                      <td className="p-3 text-gray-600">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-800">
                          {order.partners?.name || "Khách lẻ"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.partners?.phone || ""}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">
                        {order.warehouses?.name || "---"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {order.profiles?.full_name || "---"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-gray-800">
                          {formatMoney(Number(order.final_amount))}
                        </div>
                        {isDebt && (
                          <div className="text-[10px] text-red-500 mt-0.5 font-medium">
                            Nợ:{" "}
                            {formatMoney(
                              Number(order.final_amount) -
                                Number(order.paid_amount),
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${
                            isDebt
                              ? "bg-orange-50 text-orange-600 border-orange-200"
                              : "bg-green-50 text-green-600 border-green-200"
                          }`}
                        >
                          {isDebt ? "Ghi nợ" : "Đã thanh toán"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Dropdown
                          menu={getActionMenu(order)}
                          trigger={["click"]}
                          placement="bottomRight"
                        >
                          <button className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {updateOrderId && (
        <UpdateOrderModal
          isOpen={!!updateOrderId}
          orderId={updateOrderId}
          onClose={() => setUpdateOrderId(null)}
          onSuccess={() => {
            setUpdateOrderId(null);
            fetchOrders(dateRange); // Reload lại bảng sau khi sửa
          }}
        />
      )}
      {viewOrderId && (
        <OrderDetailModal
          isOpen={!!viewOrderId}
          orderId={viewOrderId}
          onClose={() => setViewOrderId(null)}
        />
      )}
    </div>
  );
}
