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
  DollarSign,
  ShoppingCart,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { dashboardService } from "../services/dashboardService";

// --- HELPER: Format tiền tệ an toàn ---
const formatMoney = (amount: number | string | undefined | null) => {
  if (amount === undefined || amount === null) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(amount));
};

// Danh sách màu sắc để tô cho các cột kho khác nhau
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

export default function DashboardPage() {
  // --- STATES ---
  const [filter, setFilter] = useState({
    from_date: format(new Date(), "yyyy-MM-01"),
    to_date: format(new Date(), "yyyy-MM-dd"),
  });

  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [warehouseKeys, setWarehouseKeys] = useState<string[]>([]); // Lưu danh sách tên kho tìm được
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);

  // --- FETCH DATA ---
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resSummary, resChart, resProducts, resCustomers, resActivities] =
        await Promise.all([
          dashboardService.getSummary(filter),
          dashboardService.getChart(filter),
          dashboardService.getTopProducts(filter),
          dashboardService.getTopCustomers(filter),
          dashboardService.getActivities(),
        ]);

      // Lưu ý: Cấu trúc res?.data?.data dựa trên response backend của bạn
      setSummary(resSummary?.data?.data || {});
      setTopProducts(
        Array.isArray(resProducts?.data?.data) ? resProducts.data.data : [],
      );
      setTopCustomers(
        Array.isArray(resCustomers?.data?.data) ? resCustomers.data.data : [],
      );
      setActivities(
        Array.isArray(resActivities?.data?.data) ? resActivities.data.data : [],
      );

      // --- XỬ LÝ BIỂU ĐỒ ĐỘNG ---
      const rawChartData = Array.isArray(resChart?.data?.data)
        ? resChart.data.data
        : [];
      setChartData(rawChartData);

      // Tự động tìm tên các kho có trong dữ liệu (loại trừ key 'date')
      const keys = new Set<string>();
      rawChartData.forEach((item: any) => {
        Object.keys(item).forEach((key) => {
          if (key !== "date") {
            keys.add(key);
          }
        });
      });
      setWarehouseKeys(Array.from(keys));
    } catch (error) {
      console.error("Lỗi tải dashboard:", error);
      // Reset về rỗng để tránh crash UI
      setChartData([]);
      setTopProducts([]);
      setTopCustomers([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey;
    setHiddenKeys(
      (prev) =>
        prev.includes(dataKey)
          ? prev.filter((key) => key !== dataKey) // Nếu đang ẩn -> Hiện lại
          : [...prev, dataKey], // Nếu đang hiện -> Ẩn đi
    );
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  // --- UI RENDER ---
  if (loading && !summary) {
    return (
      <div className="p-8 text-center text-gray-500">
        Đang tải dữ liệu báo cáo...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* CỘT CHÍNH (Trái) */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header Filter */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kết quả bán hàng</h1>
          <div className="flex gap-2 bg-white p-2 rounded shadow-sm">
            <div className="flex items-center border rounded px-2">
              <Calendar size={16} className="text-gray-500 mr-2" />
              <input
                type="date"
                value={filter.from_date}
                onChange={(e) =>
                  setFilter({ ...filter, from_date: e.target.value })
                }
                className="outline-none text-sm text-gray-600"
              />
            </div>
            <span className="self-center">-</span>
            <div className="flex items-center border rounded px-2">
              <input
                type="date"
                value={filter.to_date}
                onChange={(e) =>
                  setFilter({ ...filter, to_date: e.target.value })
                }
                className="outline-none text-sm text-gray-600"
              />
            </div>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700"
            >
              Lọc
            </button>
          </div>
        </div>

        {/* 1. Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Card Doanh thu */}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Doanh thu
                </p>
                <h3 className="text-xl font-bold text-blue-600 mt-1">
                  {formatMoney(summary?.revenue)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {summary?.orders_count || 0} đơn hàng
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <DollarSign size={20} />
              </div>
            </div>
          </div>

          {/* Card Trả hàng */}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Trả hàng
                </p>
                <h3 className="text-xl font-bold text-orange-600 mt-1">
                  {formatMoney(summary?.return_value)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {summary?.return_count || 0} phiếu trả
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                <RefreshCcw size={20} />
              </div>
            </div>
          </div>

          {/* Card Doanh thu thuần */}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Doanh thu thuần
                </p>
                <h3 className="text-xl font-bold text-green-600 mt-1">
                  {formatMoney(summary?.net_revenue)}
                </h3>
                <div
                  className={`flex items-center text-xs mt-1 font-bold ${
                    summary?.growth_vs_yesterday >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {summary?.growth_vs_yesterday >= 0 ? (
                    <TrendingUp size={14} className="mr-1" />
                  ) : (
                    <TrendingDown size={14} className="mr-1" />
                  )}
                  {summary?.growth_vs_yesterday}%{" "}
                  <span className="text-gray-400 font-normal ml-1">
                    so với hôm qua
                  </span>
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <ShoppingCart size={20} />
              </div>
            </div>
          </div>

          {/* Card Thực thu */}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">
                  Thực thu
                </p>
                <h3 className="text-xl font-bold text-purple-600 mt-1">
                  {formatMoney((summary?.net_revenue || 0) * 0.9)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Dự kiến</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                <Activity size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Main Chart (Đã sửa dynamic keys) */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">
            Doanh thu thuần theo thời gian
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
                    stroke="#e5e7eb"
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
                    wrapperStyle={{ cursor: "pointer", userSelect: "none" }}
                  />

                  {/* Render cột động dựa trên tên kho tìm được */}
                  {warehouseKeys.map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key} // Tên hiển thị trong Legend
                      fill={COLORS[index % COLORS.length]} // Màu xoay vòng
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                      stackId="a" // Chồng cột lên nhau (Stacked)
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

        {/* 3. Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700">
                Top 10 Hàng bán chạy
              </h3>
              <select className="text-xs border rounded p-1 outline-none text-gray-600">
                <option>Theo số lượng</option>
              </select>
            </div>
            <div className="space-y-3">
              {topProducts.length > 0 ? (
                topProducts.map((prod, idx) => (
                  <div key={idx} className="relative pt-1">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-gray-700 truncate w-3/4">
                        {idx + 1}. {prod.name}
                      </span>
                      <span className="font-bold text-blue-600">
                        {prod.value}
                      </span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                      <div
                        style={{
                          width: `${
                            (prod.value / (topProducts[0]?.value || 1)) * 100
                          }%`,
                        }}
                        className="shadow-none bg-blue-500 h-full"
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

          {/* Top Customers */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700">
                Top 10 Khách mua nhiều nhất
              </h3>
            </div>
            <div className="space-y-3">
              {topCustomers.length > 0 ? (
                topCustomers.map((cus, idx) => (
                  <div key={idx} className="relative pt-1">
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <span className="font-medium text-gray-700 truncate w-2/3">
                        {idx + 1}. {cus.name}
                      </span>
                      <span className="font-bold text-green-600">
                        {formatMoney(cus.value)}
                      </span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-green-100">
                      <div
                        style={{
                          width: `${
                            (cus.value / (topCustomers[0]?.value || 1)) * 100
                          }%`,
                        }}
                        className="shadow-none bg-green-500 h-full"
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
      </div>

      {/* CỘT SIDEBAR (Phải) - Activities */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto hidden xl:block shadow-lg z-10">
        <h3 className="text-sm font-bold text-gray-800 mb-4 border-b pb-2">
          Hoạt động gần đây
        </h3>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div
                key={act.id}
                className="flex gap-3 items-start group hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <div className="mt-1 min-w-[24px]">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {(act.user || "U").charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-800">
                    <span className="font-bold text-blue-600">
                      {act.user || "Người dùng"}
                    </span>{" "}
                    {act.action}
                  </p>
                  {Number(act.amount) > 0 && (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {formatMoney(act.amount)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {act.time
                        ? format(new Date(act.time), "HH:mm dd/MM")
                        : ""}
                    </span>
                    {act.code && (
                      <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500 border">
                        {act.code}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-center text-gray-400">
              Chưa có hoạt động nào
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
