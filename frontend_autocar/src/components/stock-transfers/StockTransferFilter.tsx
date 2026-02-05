/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Filter,
  Search,
  X,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
} from "lucide-react";
import { useStockTransferStore } from "../../store/useStockTransferStore";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";

// --- TYPES ---
export interface DateRange {
  from: string;
  to: string;
}

interface TransferUIState {
  fromWarehouseIds: string[];
  toWarehouseIds: string[];
  statuses: string[];

  // Thời gian
  timePreset: "week" | "month" | "year" | "custom"; // Các tùy chọn
  dateRange: DateRange; // Giá trị thực tế gửi đi (startDate, endDate)

  matchStatus: "all" | "match" | "mismatch";
}

// --- SUB COMPONENTS (Giữ nguyên component con để tái sử dụng) ---

function FilterSection({ title, children, isOpen = false, action }: any) {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="mb-4 border-b border-gray-50 pb-4 last:border-0">
      <div
        className="flex items-center justify-between mb-2 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <h4 className="font-bold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-2">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function MultiSelectSection({
  title,
  options,
  selectedIds,
  onChange,
  placeholder = "Chọn...",
}: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredOptions = useMemo(
    () =>
      options.filter((opt: any) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [options, searchTerm],
  );

  return (
    <FilterSection title={title} isOpen>
      <div className="relative mb-2">
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-2 pr-7 py-1.5 text-xs bg-white border border-gray-300 rounded focus:border-blue-500 outline-none"
        />
        {searchTerm ? (
          <X
            size={12}
            className="absolute right-2 top-2 text-gray-400 cursor-pointer hover:text-red-500"
            onClick={() => setSearchTerm("")}
          />
        ) : (
          <Search size={12} className="absolute right-2 top-2 text-gray-400" />
        )}
      </div>
      <div className="max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
        {filteredOptions.length > 0 ? (
          <div className="space-y-1.5">
            {filteredOptions.map((opt: any) => (
              <label
                key={opt.id}
                className="flex items-start gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedIds?.includes(opt.id)}
                  onChange={(e) => onChange(opt.id, e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
                />
                <span
                  className={`text-sm leading-tight group-hover:text-blue-600 ${selectedIds?.includes(opt.id) ? "font-medium text-gray-900" : "text-gray-600"}`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center py-2">
            Không tìm thấy kết quả
          </div>
        )}
      </div>
    </FilterSection>
  );
}

// --- MAIN COMPONENT ---

interface StockTransferFilterProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function StockTransferFilter({
  isCollapsed,
  onToggle,
}: StockTransferFilterProps) {
  const { setFilters } = useStockTransferStore();

  // Mock warehouses (Thực tế lấy từ store Warehouse)
  // const [warehouses] = useState([
  //   { id: "1", label: "THỦ ĐỨC" },
  //   { id: "2", label: "BÌNH THẠNH" },
  //   { id: "3", label: "GÒ VẤP" },
  // ]);
  const { filterOptions } = usePurchaseOrderStore();

  const [localFilters, setLocalFilters] = useState<TransferUIState>({
    fromWarehouseIds: [],
    toWarehouseIds: [],
    statuses: [],
    timePreset: "month", // Mặc định là tháng này
    dateRange: {
      from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    matchStatus: "all",
  });

  // Effect: Debounce & Submit Params theo đúng DTO
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mapping State UI -> DTO Backend
      const apiPayload = {
        // DTO: from_warehouse?: string (hoặc mảng string tùy backend xử lý 'in')
        from_warehouse:
          localFilters.fromWarehouseIds.length > 0
            ? localFilters.fromWarehouseIds
            : undefined,

        // DTO: to_warehouse?: string
        to_warehouse:
          localFilters.toWarehouseIds.length > 0
            ? localFilters.toWarehouseIds
            : undefined,

        // DTO: status?: string
        status:
          localFilters.statuses.length > 0 ? localFilters.statuses : undefined,

        // DTO: startDate?: string
        startDate: localFilters.dateRange.from || undefined,

        // DTO: endDate?: string
        endDate: localFilters.dateRange.to || undefined,

        // Các field khác chưa có trong DTO chuẩn nhưng UI có
        matchStatus:
          localFilters.matchStatus === "all"
            ? undefined
            : localFilters.matchStatus,

        page: 1,
      };

      setFilters(apiPayload);
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);

  // --- Handlers ---

  const handleWarehouseChange = (
    type: "from" | "to",
    id: string,
    checked: boolean,
  ) => {
    setLocalFilters((prev) => {
      const field = type === "from" ? "fromWarehouseIds" : "toWarehouseIds";
      const list = prev[field];
      return {
        ...prev,
        [field]: checked ? [...list, id] : list.filter((item) => item !== id),
      };
    });
  };

  const toggleStatus = (statusId: string) => {
    setLocalFilters((prev) => {
      const isSelected = prev.statuses.includes(statusId);
      return {
        ...prev,
        statuses: isSelected
          ? prev.statuses.filter((s) => s !== statusId)
          : [...prev.statuses, statusId],
      };
    });
  };

  // Logic chọn khoảng thời gian tự động
  const handleTimePresetChange = (
    preset: "week" | "month" | "year" | "custom",
  ) => {
    const now = new Date();
    let newRange = { from: "", to: "" };

    if (preset === "week") {
      // Tuần này (Thứ 2 - Chủ nhật)
      newRange.from = format(
        startOfWeek(now, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      newRange.to = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (preset === "month") {
      // Tháng này
      newRange.from = format(startOfMonth(now), "yyyy-MM-dd");
      newRange.to = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (preset === "year") {
      // Năm này
      newRange.from = format(startOfYear(now), "yyyy-MM-dd");
      newRange.to = format(endOfYear(now), "yyyy-MM-dd");
    } else {
      // Custom: Giữ nguyên giá trị cũ hoặc reset
      newRange = localFilters.dateRange;
    }

    setLocalFilters((prev) => ({
      ...prev,
      timePreset: preset,
      dateRange: newRange,
    }));
  };

  return (
    <div
      className={`flex-shrink-0 border-r border-gray-200 bg-white h-full relative transition-all duration-300 ease-in-out ${isCollapsed ? "w-12" : "w-64"} hidden md:flex flex-col z-20`}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute cursor-pointer -right-3 top-1/2 z-50 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500"
      >
        {isCollapsed ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
      </button>

      {/* --- CONTENT --- */}
      {isCollapsed ? (
        <div className="flex flex-col items-center pt-4 gap-4 w-full">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600 cursor-pointer">
            <Filter size={20} />
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-4 scrollbar-thin select-none">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg whitespace-nowrap">Chuyển hàng</h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Chuyển đi */}
          <MultiSelectSection
            title="Chuyển đi"
            placeholder="Chọn chi nhánh"
            options={filterOptions.warehouses.map((dt) => {
              return { id: dt.id, label: dt.name };
            })}
            selectedIds={localFilters.fromWarehouseIds}
            onChange={(id: string, checked: boolean) =>
              handleWarehouseChange("from", id, checked)
            }
          />

          {/* 2. Nhận về */}
          <MultiSelectSection
            title="Nhận về"
            placeholder="Chọn chi nhánh"
            options={filterOptions.warehouses.map((dt) => {
              return { id: dt.id, label: dt.name };
            })}
            selectedIds={localFilters.toWarehouseIds}
            onChange={(id: string, checked: boolean) =>
              handleWarehouseChange("to", id, checked)
            }
          />

          {/* 3. Trạng thái */}
          <FilterSection title="Trạng thái" isOpen>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "draft", label: "Phiếu tạm" },
                { id: "pending", label: "Đang chuyển" },
                { id: "completed", label: "Đã nhận" },
                { id: "cancelled", label: "Đã hủy" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => toggleStatus(st.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${localFilters.statuses.includes(st.id) ? "bg-blue-600 text-white border-blue-600 font-medium" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                  {st.label}
                  {localFilters.statuses.includes(st.id) && (
                    <span className="ml-1 text-[10px]">✕</span>
                  )}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* 4. Thời gian (Đã cập nhật logic Tuần/Tháng/Năm) */}
          <FilterSection title="Thời gian" isOpen>
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={12} /> <span>Theo ngày chuyển</span>
              </div>

              {/* Các Radio Button lựa chọn nhanh */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.timePreset === "week"}
                  onChange={() => handleTimePresetChange("week")}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Tuần này</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.timePreset === "month"}
                  onChange={() => handleTimePresetChange("month")}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Tháng này</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.timePreset === "year"}
                  onChange={() => handleTimePresetChange("year")}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Năm này</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.timePreset === "custom"}
                  onChange={() => handleTimePresetChange("custom")}
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Tùy chỉnh</span>
              </label>

              {/* Input Date Picker (Hiện khi chọn Tùy chỉnh HOẶC để hiển thị ngày đã tính toán) */}
              <div className="mt-2 grid grid-cols-2 gap-2 animate-in fade-in bg-gray-50 p-2 rounded border border-gray-200">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Từ ngày
                  </span>
                  <input
                    type="date"
                    value={localFilters.dateRange.from}
                    // Nếu đang chọn preset tự động thì disable, hoặc cho phép sửa nhưng chuyển về custom
                    onChange={(e) => {
                      setLocalFilters((p) => ({
                        ...p,
                        timePreset: "custom",
                        dateRange: { ...p.dateRange, from: e.target.value },
                      }));
                    }}
                    className="w-full text-[10px] p-1 border rounded focus:border-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Đến ngày
                  </span>
                  <input
                    type="date"
                    value={localFilters.dateRange.to}
                    onChange={(e) => {
                      setLocalFilters((p) => ({
                        ...p,
                        timePreset: "custom",
                        dateRange: { ...p.dateRange, to: e.target.value },
                      }));
                    }}
                    className="w-full text-[10px] p-1 border rounded focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* 5. Tình trạng nhận hàng */}
          {/* <FilterSection title="Tình trạng nhận hàng" isOpen>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Tất cả" },
                { id: "match", label: "Khớp" },
                { id: "mismatch", label: "Không khớp" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setLocalFilters({
                      ...localFilters,
                      matchStatus: opt.id as any,
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${localFilters.matchStatus === opt.id ? "bg-blue-600 text-white border-blue-600 font-medium" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection> */}
        </div>
      )}
    </div>
  );
}
