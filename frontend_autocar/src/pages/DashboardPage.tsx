/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ShoppingCart,
  Activity,
  Calendar,
  UserCheck,
  CreditCard,
  FileSpreadsheet,
  Target,
  Truck,
  Receipt,
  Download,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

// Import API Services (Đảm bảo đường dẫn đúng với cấu trúc thư mục của bạn)
import { orderService } from "../services/orderService";
import { transactionService } from "../services/transactionService";
import { dashboardService } from "../services/dashboardService";
import { customerService } from "../services/customerService";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore";
import {
  exportDebtExcel,
  exportGrabFeeExcel,
  exportSaleProfitExcel,
} from "../utils/exportDashboardExcel";

// --- HELPER FORMAT ---
const formatMoney = (amount: number | string | undefined | null) => {
  if (amount === undefined || amount === null) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(amount));
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
];

// Mock data nhân viên (Sau này bạn có thể fetch từ API danh sách user)

export default function DashboardPage() {
  // ==========================================
  // 1. STATES
  // ==========================================
  const [activeTab, setActiveTab] = useState<"overview" | "debts" | "payroll">(
    "overview",
  );

  const {
    filterOptions: filterPurchase,
    fetchFilterOptions: fetchFilterPurchase,
  } = usePurchaseOrderStore();

  // Filters
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(), "yyyy-MM-01"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [payrollFilter, setPayrollFilter] = useState({
    staffId: filterPurchase.staffs?.[0]?.id,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Data: Tab Overview
  const [revenueData, setRevenueData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [warehouseKeys, setWarehouseKeys] = useState<string[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Data: Tab Debts
  const [debtCustomers, setDebtCustomers] = useState<any[]>([]);
  const [overdueDebts, setOverdueDebts] = useState<any[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(false);

  // Data: Tab Payroll
  const [payrollData, setPayrollData] = useState<any>(null);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // States: Modal Thu Nợ
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState<number | string>("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [collectNote, setCollectNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // 2. FETCH DATA
  // ==========================================
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const [
        resProfit,
        resChart,
        resProducts,
        resCustomers,
        resActivities,
        resDaily,
      ] = await Promise.all([
        orderService.getRevenueAndProfit(
          dateFilter.startDate,
          dateFilter.endDate,
        ),
        dashboardService.getChart({
          from_date: dateFilter.startDate,
          to_date: dateFilter.endDate,
        }),
        dashboardService.getTopProducts({
          from_date: dateFilter.startDate,
          to_date: dateFilter.endDate,
        }),
        dashboardService.getTopCustomers({
          from_date: dateFilter.startDate,
          to_date: dateFilter.endDate,
        }),
        dashboardService.getActivities(),
        orderService.getDailySales(dateFilter.startDate), // Chi tiết bán hàng ngày
      ]);

      // Set state
      setRevenueData(resProfit.data || resProfit);
      setTopProducts(
        Array.isArray(resProducts?.data?.data) ? resProducts.data.data : [],
      );
      setTopCustomers(
        Array.isArray(resCustomers?.data?.data) ? resCustomers.data.data : [],
      );
      setActivities(
        Array.isArray(resActivities?.data?.data) ? resActivities.data.data : [],
      );
      setDailySales(
        Array.isArray(resDaily?.data) ? resDaily.data : resDaily || [],
      );

      // Xử lý biểu đồ
      const rawChartData = Array.isArray(resChart?.data?.data)
        ? resChart.data.data
        : [];
      setChartData(rawChartData);
      const keys = new Set<string>();
      rawChartData.forEach((item: any) => {
        Object.keys(item).forEach((key) => {
          if (key !== "date") keys.add(key);
        });
      });
      setWarehouseKeys(Array.from(keys));
    } catch (error) {
      console.error("Lỗi tải overview:", error);
      toast.error("Lỗi tải dữ liệu tổng quan");
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchDebts = async () => {
    setLoadingDebts(true);
    try {
      const [resDebts, resOverdue] = await Promise.all([
        customerService.getCustomersWithDebt(),
        orderService.getOverdueDebts(30),
      ]);
      setDebtCustomers(Array.isArray(resDebts.data) ? resDebts.data : resDebts);
      setOverdueDebts(
        Array.isArray(resOverdue.data) ? resOverdue.data : resOverdue,
      );
    } catch (error) {
      toast.error("Lỗi tải danh sách công nợ");
    } finally {
      setLoadingDebts(false);
    }
  };

  const fetchPayroll = async () => {
    setLoadingPayroll(true);
    try {
      const res = await orderService.getPayroll(
        payrollFilter.staffId,
        payrollFilter.month,
        payrollFilter.year,
      );
      setPayrollData(res.data || res);
    } catch (error) {
      toast.error("Lỗi tính lương nhân viên");
    } finally {
      setLoadingPayroll(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    if (activeTab === "debts") fetchDebts();
    if (activeTab === "payroll") fetchPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateFilter, payrollFilter]);

  useEffect(() => {
    if (filterPurchase.staffs) {
      setPayrollFilter({
        staffId: filterPurchase.staffs?.[0]?.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });
    }
  }, [filterPurchase.staffs]);
  // ==========================================
  // 3. HANDLERS
  // ==========================================
  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey;
    setHiddenKeys((prev) =>
      prev.includes(dataKey)
        ? prev.filter((key) => key !== dataKey)
        : [...prev, dataKey],
    );
  };

  const handleOpenCollectDebt = (customer: any) => {
    // Nếu ở chế độ nợ quá hạn, object customer là từ bảng orders, phải lấy partner ra
    const isOverdueItem = !!customer.partners;
    const actualCustomer = isOverdueItem
      ? {
          ...customer.partners,
          id: customer.partner_id,
          current_debt: customer.total_amount - customer.paid_amount,
        }
      : customer;

    setSelectedCustomer(actualCustomer);
    setCollectAmount(actualCustomer.current_debt);
    setCollectMethod("transfer");
    setCollectNote(`Thu nợ khách hàng ${actualCustomer.name}`);
    setShowCollectModal(true);
  };

  const handleSubmitCollectDebt = async () => {
    if (!collectAmount || Number(collectAmount) <= 0) {
      toast.error("Vui lòng nhập số tiền thu hợp lệ");
      return;
    }

    setIsSubmitting(true);
    try {
      await transactionService.collectDebt({
        partnerId:
          selectedCustomer.id?.toString() || selectedCustomer.code?.toString(),
        staffId: undefined as any, // Để Backend tự lấy từ Token
        amount: Number(collectAmount),
        paymentMethod: collectMethod,
        note: collectNote,
      });

      toast.success("Thu nợ thành công!");
      setShowCollectModal(false);
      fetchDebts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi thu nợ");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchFilterPurchase();
  }, []);

  const handleExportExcel = async (type: string) => {
    try {
      if (type === "Bao_Cao_Cong_No") {
        toast.loading("Đang xuất file Công nợ...");
        const dataToExport = showOverdueOnly ? overdueDebts : debtCustomers;
        if (dataToExport.length === 0) {
          toast.dismiss();
          return toast.error("Không có dữ liệu để xuất");
        }
        await exportDebtExcel(dataToExport, showOverdueOnly);
        toast.dismiss();
        toast.success("Xuất file thành công!");
      } else if (type === "Loi_Nhuan_Sale") {
        if (!payrollData) return toast.error("Chưa có dữ liệu lương");
        toast.loading("Đang xuất file Lợi nhuận...");

        // Lấy tên nhân viên đang chọn
        const staffName =
          filterPurchase.staffs?.find(
            (s: any) => s.id === payrollFilter.staffId,
          )?.full_name || "NhanVien";

        await exportSaleProfitExcel(payrollData, staffName);
        toast.dismiss();
        toast.success("Xuất file thành công!");
      } else if (type === "Phi_Grab_Cong_Ty") {
        if (!payrollData) return toast.error("Chưa có dữ liệu Grab");
        toast.loading("Đang xuất file Phí Grab...");

        const staffName =
          filterPurchase.staffs?.find(
            (s: any) => s.id === payrollFilter.staffId,
          )?.full_name || "NhanVien";

        await exportGrabFeeExcel(payrollData, staffName);
        toast.dismiss();
        toast.success("Xuất file thành công!");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Lỗi khi xuất Excel");
      console.error(error);
    }
  };
  // ==========================================
  // 4. RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* CỘT CHÍNH */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* HEADER & TABS */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Quản trị & Kế toán
              </h1>
              <div className="flex gap-6 mt-3">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2 text-sm font-semibold transition-all ${activeTab === "overview" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Tổng quan Kinh doanh
                </button>
                <button
                  onClick={() => setActiveTab("debts")}
                  className={`pb-2 text-sm font-semibold transition-all ${activeTab === "debts" ? "text-red-600 border-b-2 border-red-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Quản lý Công nợ
                </button>
                <button
                  onClick={() => setActiveTab("payroll")}
                  className={`pb-2 text-sm font-semibold transition-all ${activeTab === "payroll" ? "text-green-600 border-b-2 border-green-600" : "text-gray-500 hover:text-gray-800"}`}
                >
                  Tính lương & KPI
                </button>
              </div>
            </div>

            {/* BỘ LỌC ĐỘNG TÙY TAB */}
            <div>
              {activeTab === "overview" && (
                <div className="flex gap-2 bg-white p-2 rounded shadow-sm border border-gray-100">
                  <div className="flex items-center border rounded px-2 bg-gray-50">
                    <Calendar size={14} className="text-gray-500 mr-2" />
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) =>
                        setDateFilter({
                          ...dateFilter,
                          startDate: e.target.value,
                        })
                      }
                      className="outline-none text-sm text-gray-600 bg-transparent py-1"
                    />
                  </div>
                  <span className="self-center text-gray-400">-</span>
                  <div className="flex items-center border rounded px-2 bg-gray-50">
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) =>
                        setDateFilter({
                          ...dateFilter,
                          endDate: e.target.value,
                        })
                      }
                      className="outline-none text-sm text-gray-600 bg-transparent py-1"
                    />
                  </div>
                </div>
              )}

              {activeTab === "debts" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                    className={`text-sm px-4 py-2 rounded-md font-medium border transition-colors ${showOverdueOnly ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    {showOverdueOnly
                      ? "Xem tất cả công nợ"
                      : "⚠️ Cảnh báo nợ quá hạn"}
                  </button>
                  <button
                    onClick={() => handleExportExcel("Bao_Cao_Cong_No")}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 shadow-sm transition-colors"
                  >
                    <FileSpreadsheet size={16} /> Xuất Excel
                  </button>
                </div>
              )}

              {activeTab === "payroll" && (
                <div className="flex gap-2 bg-white p-2 rounded shadow-sm border border-gray-100 items-center">
                  <select
                    value={payrollFilter.staffId}
                    onChange={(e) =>
                      setPayrollFilter({
                        ...payrollFilter,
                        staffId: e.target.value,
                      })
                    }
                    className="text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
                  >
                    {filterPurchase.staffs?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={payrollFilter.month}
                    onChange={(e) =>
                      setPayrollFilter({
                        ...payrollFilter,
                        month: Number(e.target.value),
                      })
                    }
                    className="text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={payrollFilter.year}
                    onChange={(e) =>
                      setPayrollFilter({
                        ...payrollFilter,
                        year: Number(e.target.value),
                      })
                    }
                    className="text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-500"
                  >
                    {[2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* =========================================
              NỘI DUNG TAB 1: TỔNG QUAN
              ========================================= */}
          {activeTab === "overview" && (
            <div className="animate-in fade-in duration-300">
              {loadingOverview && !revenueData ? (
                <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-2">
                  <Activity className="animate-spin text-blue-500" /> Đang tải
                  dữ liệu báo cáo...
                </div>
              ) : (
                <>
                  {/* 1. Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-0"></div>
                      <p className="text-xs text-gray-500 font-bold uppercase relative z-10">
                        Doanh thu thô
                      </p>
                      <h3 className="text-2xl font-bold text-blue-600 mt-2 relative z-10">
                        {formatMoney(revenueData?.grossRevenue)}
                      </h3>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-16 h-16 bg-orange-50 rounded-bl-full -z-0"></div>
                      <p className="text-xs text-gray-500 font-bold uppercase relative z-10">
                        Giá trị trả hàng
                      </p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-2 relative z-10">
                        {formatMoney(revenueData?.returnDeduction)}
                      </h3>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-bl-full -z-0"></div>
                      <p className="text-xs text-gray-500 font-bold uppercase relative z-10">
                        Doanh thu thuần
                      </p>
                      <h3 className="text-2xl font-bold text-green-600 mt-2 relative z-10">
                        {formatMoney(revenueData?.netRevenue)}
                      </h3>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden">
                      <p className="text-xs text-indigo-600 font-bold uppercase relative z-10">
                        Lợi nhuận gộp
                      </p>
                      <h3 className="text-2xl font-black text-indigo-700 mt-2 relative z-10">
                        {formatMoney(revenueData?.netProfit)}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1 relative z-10 font-medium">
                        Vốn: {formatMoney(revenueData?.netCost)}
                      </p>
                    </div>
                  </div>

                  {/* 2. Main Chart */}
                  <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">
                      Biểu đồ doanh thu theo thời gian
                    </h3>
                    <div className="h-[300px] w-full">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f3f4f6"
                            />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#6b7280", fontSize: 12 }}
                              tickFormatter={(val) => `${val / 1000000}M`}
                            />
                            <Tooltip
                              formatter={(value: any) => formatMoney(value)}
                              contentStyle={{
                                borderRadius: "8px",
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                            />
                            <Legend
                              onClick={handleLegendClick}
                              wrapperStyle={{
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                            />
                            {warehouseKeys.map((key, index) => (
                              <Bar
                                key={key}
                                dataKey={key}
                                name={key}
                                fill={COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                                stackId="a"
                                hide={hiddenKeys.includes(key)}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          Không có dữ liệu biểu đồ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. BẢNG CHI TIẾT BÁN HÀNG NGÀY (Mục 1) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart size={18} className="text-blue-600" />
                        Chi tiết bán hàng ngày{" "}
                        <span className="text-blue-600">
                          {format(new Date(dateFilter.startDate), "dd/MM/yyyy")}
                        </span>
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-80 custom-scrollbar">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-white border-b border-gray-200 text-xs uppercase text-gray-500 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-5 py-3 font-semibold">
                              Mã Đơn / Giờ
                            </th>
                            <th className="px-5 py-3 font-semibold">
                              Khách hàng
                            </th>
                            <th className="px-5 py-3 font-semibold">
                              Món hàng đã mua
                            </th>
                            <th className="px-5 py-3 font-semibold text-right">
                              Tổng tiền
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dailySales.map((order, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-blue-50/30 transition-colors"
                            >
                              <td className="px-5 py-3 align-top whitespace-nowrap">
                                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  {order.code}
                                </span>
                                <span className="block text-[11px] text-gray-400 mt-1 font-medium">
                                  {format(new Date(order.created_at), "HH:mm")}
                                </span>
                              </td>
                              <td className="px-5 py-3 align-top">
                                <p className="font-medium text-gray-900">
                                  {order.partners?.name || "Khách lẻ"}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {order.partners?.phone || ""}
                                </p>
                              </td>
                              <td className="px-5 py-3 align-top">
                                <ul className="space-y-1.5">
                                  {order.order_items?.map(
                                    (item: any, i: number) => (
                                      <li
                                        key={i}
                                        className="flex gap-2 items-start text-[13px]"
                                      >
                                        <span className="text-gray-400 font-mono text-[10px] bg-gray-100 px-1 rounded mt-0.5 shrink-0">
                                          {item.products?.sku}
                                        </span>
                                        <span className="text-gray-700">
                                          {item.products?.name}{" "}
                                          <strong className="text-gray-900 ml-1">
                                            x{Number(item.quantity)}
                                          </strong>
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </td>
                              <td className="px-5 py-3 align-top text-right font-bold text-gray-900">
                                {formatMoney(order.final_amount)}
                              </td>
                            </tr>
                          ))}
                          {dailySales.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="p-8 text-center text-gray-400 italic"
                              >
                                Không có giao dịch bán hàng nào trong ngày này.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Top Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-800 mb-5">
                        Top 10 Hàng bán chạy
                      </h3>
                      <div className="space-y-4">
                        {topProducts.length > 0 ? (
                          topProducts.map((prod, idx) => (
                            <div key={idx} className="relative pt-1">
                              <div className="flex justify-between items-center mb-1.5 text-xs">
                                <span className="font-medium text-gray-700 truncate w-3/4">
                                  {idx + 1}. {prod.name}
                                </span>
                                <span className="font-bold text-blue-600">
                                  {prod.value}
                                </span>
                              </div>
                              <div className="overflow-hidden h-1.5 text-xs flex rounded bg-gray-100">
                                <div
                                  style={{
                                    width: `${(prod.value / (topProducts[0]?.value || 1)) * 100}%`,
                                  }}
                                  className="bg-blue-500 rounded-full"
                                ></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-center text-gray-400 py-4">
                            Chưa có dữ liệu
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-sm font-bold text-gray-800 mb-5">
                        Top Khách hàng
                      </h3>
                      <div className="space-y-4">
                        {topCustomers.length > 0 ? (
                          topCustomers.map((cus, idx) => (
                            <div key={idx} className="relative pt-1">
                              <div className="flex justify-between items-center mb-1.5 text-xs">
                                <span className="font-medium text-gray-700 truncate w-2/3">
                                  {idx + 1}. {cus.name}
                                </span>
                                <span className="font-bold text-green-600">
                                  {formatMoney(cus.value)}
                                </span>
                              </div>
                              <div className="overflow-hidden h-1.5 text-xs flex rounded bg-gray-100">
                                <div
                                  style={{
                                    width: `${(cus.value / (topCustomers[0]?.value || 1)) * 100}%`,
                                  }}
                                  className="bg-green-500 rounded-full"
                                ></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-center text-gray-400 py-4">
                            Chưa có dữ liệu
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================
              NỘI DUNG TAB 2: QUẢN LÝ CÔNG NỢ
              ========================================= */}
          {activeTab === "debts" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  {showOverdueOnly ? (
                    <AlertTriangle size={18} className="text-red-500" />
                  ) : (
                    <UserCheck size={18} className="text-blue-600" />
                  )}
                  {showOverdueOnly
                    ? "Danh sách đơn hàng quá hạn (30 ngày)"
                    : "Danh sách khách hàng đang có nợ"}
                </h3>
              </div>

              {loadingDebts ? (
                <div className="p-10 text-center text-gray-500">
                  Đang tải danh sách công nợ...
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[500px]">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">
                          {showOverdueOnly ? "Đơn hàng" : "Khách hàng"}
                        </th>
                        <th className="px-5 py-3 font-semibold">
                          {showOverdueOnly ? "Ngày tạo / KH" : "Liên hệ"}
                        </th>
                        <th className="px-5 py-3 font-semibold text-right">
                          {showOverdueOnly ? "Nợ đơn này" : "Tổng Dư nợ"}
                        </th>
                        <th className="px-5 py-3 font-semibold text-center w-32">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(showOverdueOnly ? overdueDebts : debtCustomers).map(
                        (item, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-blue-50/30 transition-colors"
                          >
                            {showOverdueOnly ? (
                              <>
                                <td className="px-5 py-4">
                                  <p className="font-bold text-blue-600">
                                    {item.code}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Sale: {item.profiles?.full_name}
                                  </p>
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-gray-900 font-medium">
                                    {item.partners?.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {format(
                                      new Date(item.created_at),
                                      "dd/MM/yyyy",
                                    )}
                                  </p>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className="font-bold text-red-600">
                                    {formatMoney(
                                      Number(item.total_amount) -
                                        Number(item.paid_amount),
                                    )}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-5 py-4">
                                  <p className="font-medium text-gray-900">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {item.code}
                                  </p>
                                </td>
                                <td className="px-5 py-4">
                                  {item.phone || "N/A"}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                                    {formatMoney(item.current_debt)}
                                  </span>
                                </td>
                              </>
                            )}
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => handleOpenCollectDebt(item)}
                                className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                              >
                                <CreditCard size={14} /> Thu nợ
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                      {(showOverdueOnly ? overdueDebts : debtCustomers)
                        .length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-16 text-center text-gray-400 text-lg"
                          >
                            Không có dữ liệu nợ. Tuyệt vời! 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* =========================================
              NỘI DUNG TAB 3: TÍNH LƯƠNG & KPI
              ========================================= */}
          {activeTab === "payroll" && (
            <div className="animate-in fade-in duration-300 space-y-6">
              {loadingPayroll ? (
                <div className="py-10 text-center text-gray-500 flex justify-center items-center gap-2">
                  <Activity className="animate-spin" /> Đang tính toán bảng
                  lương...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bảng phân tích cấu thành doanh thu/lợi nhuận Sale */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <Receipt size={22} className="text-blue-500" />
                        Phân tích Lợi nhuận Sale - Tháng {payrollData?.month}/
                        {payrollData?.year}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-600 font-medium">
                            1. Tổng bán ra (Bao gồm VAT)
                          </span>
                          <span className="font-bold text-gray-900 text-lg">
                            {formatMoney(payrollData?.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3.5 bg-orange-50/50 rounded-lg text-orange-800 border border-orange-100">
                          <span className="font-medium">
                            - Tổng VAT xuất (Kế toán thu)
                          </span>
                          <span className="font-bold">
                            {formatMoney(payrollData?.totalVat)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3.5 bg-blue-50 rounded-lg text-blue-900 border border-blue-100">
                          <span className="font-bold">
                            = Doanh thu thực tế (Tính hoa hồng)
                          </span>
                          <span className="font-black text-xl text-blue-700">
                            {formatMoney(payrollData?.netRevenue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3.5 bg-gray-50 rounded-lg mt-4">
                          <span className="text-gray-600 font-medium">
                            - Tổng giá vốn sản phẩm
                          </span>
                          <span className="font-bold text-gray-800">
                            {formatMoney(payrollData?.totalCost)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3.5 bg-red-50/50 rounded-lg text-red-800 border border-red-100">
                          <span className="font-medium flex items-center gap-2">
                            <Truck size={16} /> - Phí Grab (Sale chịu)
                          </span>
                          <span className="font-bold">
                            {formatMoney(payrollData?.staffGrabFee)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-5 bg-green-50 rounded-xl text-green-900 border-2 border-green-200 mt-4 shadow-sm">
                          <span className="font-black text-lg uppercase">
                            Lợi nhuận cuối của Sale
                          </span>
                          <span className="font-black text-3xl text-green-700">
                            {formatMoney(payrollData?.profitForSale)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vòng tròn KPI */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
                      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 w-full">
                        <Target size={22} className="text-red-500" /> KPI Chỉ
                        tiêu
                      </h3>

                      <div className="relative w-44 h-44 flex items-center justify-center rounded-full border-8 border-gray-100 mb-6 shadow-inner">
                        {/* CSS hack đơn giản để vẽ vòng cung tiến độ. (Dùng <PieChart> nếu cần đẹp hơn) */}
                        <div
                          className="absolute inset-0 rounded-full border-8 border-blue-500"
                          style={{
                            clipPath: `polygon(0 0, 100% 0, 100% ${Math.min((payrollData?.kpi?.achieved / (payrollData?.kpi?.target || 1)) * 100, 100)}%, 0 100%)`,
                            transition: "clip-path 1s ease",
                          }}
                        ></div>
                        <div className="text-center z-10 flex flex-col items-center">
                          <span className="text-4xl font-black text-gray-800">
                            {payrollData?.kpi?.target > 0
                              ? Math.round(
                                  (payrollData?.kpi?.achieved /
                                    payrollData?.kpi?.target) *
                                    100,
                                )
                              : 0}
                            <span className="text-xl">%</span>
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                            Hoàn thành
                          </span>
                        </div>
                      </div>

                      <div className="w-full space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">
                            Chỉ tiêu:
                          </span>
                          <span className="font-bold text-gray-800">
                            {formatMoney(payrollData?.kpi?.target)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">
                            Đạt được:
                          </span>
                          <span className="font-bold text-blue-600">
                            {formatMoney(payrollData?.kpi?.achieved)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`mt-4 w-full text-center py-2.5 rounded-lg font-black tracking-wide ${payrollData?.kpi?.passed ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-100"}`}
                      >
                        {payrollData?.kpi?.passed
                          ? "🎉 ĐẠT CHỈ TIÊU"
                          : "⚠️ CHƯA ĐẠT CHỈ TIÊU"}
                      </div>
                    </div>
                  </div>

                  {/* Nút Xuất Báo Cáo */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Download size={18} className="text-gray-500" /> Xuất file
                      báo cáo
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleExportExcel("Loi_Nhuan_Sale")}
                        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        📊 Xuất Doanh thu & Lợi nhuận Sale
                      </button>
                      <button
                        onClick={() => handleExportExcel("Phi_Grab_Cong_Ty")}
                        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      >
                        🛵 Xuất báo cáo phí Grab
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* CỘT SIDEBAR HOẠT ĐỘNG (Phải - Chỉ hiện ở Overview) */}
        {activeTab === "overview" && (
          <div className="w-80 bg-white border-l border-gray-100 p-5 overflow-y-auto hidden xl:block z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" /> Lịch sử hoạt động
            </h3>
            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-100 before:via-gray-100 before:to-transparent">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-blue-100 text-blue-600 font-bold text-xs shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {(act.user || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-bold text-gray-900">
                          {act.user || "System"}
                        </span>{" "}
                        {act.action}
                      </p>
                      {Number(act.amount) > 0 && (
                        <p className="text-sm font-black text-blue-600 mt-1">
                          {formatMoney(act.amount)}
                        </p>
                      )}
                      <time className="block text-[10px] font-bold text-gray-400 mt-2 tracking-wide uppercase">
                        {act.time
                          ? format(new Date(act.time), "HH:mm dd/MM")
                          : ""}
                      </time>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-gray-400 italic">
                  Chưa có hoạt động nào
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          MODAL THU NỢ
          ========================================= */}
      {showCollectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-7 animate-in zoom-in-95 duration-200">
            <div className="mb-6 text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CreditCard size={28} />
              </div>
              <h3 className="font-black text-xl text-gray-900">
                Thu Nợ Khách Hàng
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Đối tác:{" "}
                <span className="font-bold text-gray-800">
                  {selectedCustomer?.name}
                </span>
              </p>
            </div>

            <div className="space-y-5">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center shadow-inner">
                <p className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-1">
                  Dư nợ hiện tại
                </p>
                <div className="text-3xl font-black text-red-600">
                  {formatMoney(selectedCustomer?.current_debt)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Số tiền thu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl pl-4 pr-10 py-3 outline-none focus:border-blue-500 font-bold text-gray-900 text-lg transition-colors"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-3.5 font-bold text-gray-400 text-lg">
                    ₫
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Hình thức thanh toán
                </label>
                <select
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-gray-800 font-semibold transition-colors"
                >
                  <option value="cash">💵 Tiền mặt</option>
                  <option value="transfer">🏦 Chuyển khoản ngân hàng</option>
                  <option value="card">💳 Cà thẻ (POS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Ghi chú (Tùy chọn)
                </label>
                <textarea
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm text-gray-700 transition-colors resize-none"
                  rows={2}
                  placeholder="Ví dụ: Anh khách chuyển khoản VCB..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setShowCollectModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmitCollectDebt}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-70 flex justify-center items-center"
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận thu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
