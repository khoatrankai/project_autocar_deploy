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
  ChevronDown, // <-- Thêm icon này
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { orderService } from "../services/orderService";
import exportOrdersToExcel from "../utils/exportOrdersExcel";

// Định nghĩa nhãn hiển thị cho bộ lọc
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

  // --- STATES QUẢN LÝ BỘ LỌC THỜI GIAN ---
  const [timeFilter, setTimeFilter] = useState<string>("all"); // Mặc định lấy tất cả
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click ra ngoài để đóng dropdown
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

  const handleExportExcel = async () => {
    await exportOrdersToExcel(filteredOrders);
  };

  // Gọi API lấy danh sách kèm tham số startDate, endDate
  const fetchOrders = async (
    params: { startDate?: string; endDate?: string } = {},
  ) => {
    setIsLoading(true);
    try {
      // Truyền params vào hàm getAll của service
      const res = await orderService.getAll(params);
      setOrders(res.data);
      setIsLoading(false);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách phiếu xuất");
      setIsLoading(false);
    }
  };

  // Gọi lần đầu khi load trang
  useEffect(() => {
    fetchOrders(dateRange);
  }, []);

  // Xử lý khi chọn các mốc thời gian trong Dropdown
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
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        );
        startDate = formatDate(firstDayOfMonth);
        endDate = formatDate(lastDayOfMonth);
        break;
      case "year":
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(now.getFullYear(), 11, 31);
        startDate = formatDate(firstDayOfYear);
        endDate = formatDate(lastDayOfYear);
        break;
      case "all":
        startDate = "";
        endDate = "";
        break;
    }

    const newRange = { startDate, endDate };
    setDateRange(newRange);

    // Gọi lại API với khoảng thời gian mới
    fetchOrders(newRange);
  };

  // Lọc dữ liệu local theo từ khóa tìm kiếm (Search Bar)
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
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Download size={16} /> Xuất Excel
          </button>
          <button
            onClick={() => (window.location.href = "/orders")}
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
                <th className="p-3 w-12 text-center">STT</th>
                <th className="p-3 whitespace-nowrap">Mã phiếu</th>
                <th className="p-3 whitespace-nowrap">Thời gian</th>
                <th className="p-3 min-w-[150px]">Khách hàng</th>
                <th className="p-3">Kho xuất</th>
                <th className="p-3">Người bán</th>
                <th className="p-3 text-right">Tổng tiền</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 w-20 text-center">Thao tác</th>
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
                filteredOrders.map((order, index) => {
                  const isDebt =
                    Number(order.final_amount) > Number(order.paid_amount);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="p-3 text-center text-gray-500">
                        {index + 1}
                      </td>
                      <td className="p-3 font-medium text-blue-600 cursor-pointer hover:underline">
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
                        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            className="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="text-gray-600 hover:bg-gray-200 p-1.5 rounded transition-colors"
                            title="In phiếu"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
