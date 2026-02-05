/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Filter,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";

// --- REUSED SUB-COMPONENTS (From ProductFilter) ---
function FilterSection({ title, children, isOpen = false }: any) {
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
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

// MultiSelect with Search
function MultiSelectSection({ title, options, selectedIds, onChange }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(true);

  const filteredOptions = useMemo(() => {
    return options.filter((opt: any) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  return (
    <div className="mb-4 border-b border-gray-50 pb-4 last:border-0">
      <div
        className="flex items-center justify-between mb-2 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <h4 className="font-bold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
          {title}
        </h4>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
          <div className="relative mb-2">
            <input
              type="text"
              placeholder={`Tìm ${title.toLowerCase()}...`}
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
              <Search
                size={12}
                className="absolute right-2 top-2 text-gray-400"
              />
            )}
          </div>
          <div className="max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 space-y-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: any) => (
                <label
                  key={opt.id}
                  className="flex items-start gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds?.includes(opt.id)}
                    onChange={(e) => onChange(opt.id, e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span
                    className={`text-sm leading-tight group-hover:text-blue-600 ${selectedIds?.includes(opt.id) ? "font-medium text-gray-900" : "text-gray-600"}`}
                  >
                    {opt.label}
                  </span>
                </label>
              ))
            ) : (
              <div className="text-xs text-gray-400 text-center py-2">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---
interface Props {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function PurchaseOrderFilter({ isCollapsed, onToggle }: Props) {
  const { filterOptions, setFilters } = usePurchaseOrderStore();

  // Local state
  const [localFilters, setLocalFilters] = useState({
    warehouseIds: [] as number[],
    statuses: [] as string[],
    dateType: "month" as "week" | "month" | "quarter" | "year" | "custom",
    dateRange: { from: "", to: "" },
    staffIds: [] as string[],
  });

  // Calculate Date Ranges Helper
  const getDateRange = (type: string) => {
    const now = new Date();
    switch (type) {
      case "week":
        return {
          from: startOfWeek(now, { weekStartsOn: 1 }),
          to: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "quarter":
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case "year":
        return { from: startOfYear(now), to: endOfYear(now) };
      default:
        return null;
    }
  };

  // Debounce Submit
  useEffect(() => {
    const timer = setTimeout(() => {
      let dateFrom = undefined;
      let dateTo = undefined;

      if (localFilters.dateType !== "custom") {
        const range = getDateRange(localFilters.dateType);
        if (range) {
          dateFrom = format(range.from, "yyyy-MM-dd");
          dateTo = format(range.to, "yyyy-MM-dd");
        }
      } else {
        dateFrom = localFilters.dateRange.from;
        dateTo = localFilters.dateRange.to;
      }

      setFilters({
        warehouseIds: localFilters.warehouseIds,
        statuses: localFilters.statuses,
        staffIds: localFilters.staffIds,
        dateFrom,
        dateTo,
        page: 1,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);

  // Handlers
  const handleMultiChange = (
    field: "warehouseIds" | "staffIds",
    id: any,
    checked: boolean,
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], id]
        : prev[field].filter((item) => item !== id),
    }));
  };

  const handleStatusChange = (id: string, checked: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      statuses: checked
        ? [...prev.statuses, id]
        : prev.statuses.filter((item) => item !== id),
    }));
  };

  // Mappers
  const warehouseOptions = filterOptions.warehouses.map((w) => ({
    id: w.id,
    label: w.name,
  }));
  const staffOptions = filterOptions.staffs.map((s) => ({
    id: s.id,
    label: s.full_name,
  }));

  return (
    <div
      className={`flex-shrink-0 border-r border-gray-200 bg-white h-full relative transition-all duration-300 ease-in-out ${isCollapsed ? "w-12" : "w-64"} hidden md:flex flex-col z-20`}
    >
      <button
        onClick={onToggle}
        className="absolute cursor-pointer -right-3 top-4 z-50 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-500"
      >
        {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center pt-4">
          <Filter size={20} className="text-blue-600" />
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-4 scrollbar-thin select-none">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg">Lọc phiếu nhập</h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Chi nhánh (Multi-select + Search) */}
          <MultiSelectSection
            title="Chi nhánh"
            options={warehouseOptions}
            selectedIds={localFilters.warehouseIds}
            onChange={(id: number, checked: boolean) =>
              handleMultiChange("warehouseIds", id, checked)
            }
          />

          {/* 2. Trạng thái */}
          <FilterSection title="Trạng thái" isOpen>
            <div className="space-y-1.5">
              {[
                { id: "draft", label: "Phiếu tạm" },
                { id: "completed", label: "Đã nhập hàng" },
                { id: "cancelled", label: "Đã hủy" },
              ].map((st) => (
                <label
                  key={st.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.statuses.includes(st.id)}
                    onChange={(e) =>
                      handleStatusChange(st.id, e.target.checked)
                    }
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-sm text-gray-600">{st.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* 3. Thời gian */}
          <FilterSection title="Thời gian" isOpen>
            <div className="space-y-2">
              {[
                { id: "week", label: "Tuần này" },
                { id: "month", label: "Tháng này" },
                { id: "quarter", label: "Quý này" },
                { id: "year", label: "Năm này" },
              ].map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={localFilters.dateType === t.id}
                    onChange={() =>
                      setLocalFilters({
                        ...localFilters,
                        dateType: t.id as any,
                      })
                    }
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.dateType === "custom"}
                  onChange={() =>
                    setLocalFilters({ ...localFilters, dateType: "custom" })
                  }
                  className="accent-blue-600 w-3.5 h-3.5"
                />
                <span className="text-sm text-gray-700">Tùy chỉnh</span>
              </label>

              {localFilters.dateType === "custom" && (
                <div className="grid grid-cols-2 gap-1 mt-1 animate-in fade-in">
                  <input
                    type="date"
                    value={localFilters.dateRange.from}
                    className="border rounded px-1 text-[10px]"
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: {
                          ...localFilters.dateRange,
                          from: e.target.value,
                        },
                      })
                    }
                  />
                  <input
                    type="date"
                    value={localFilters.dateRange.to}
                    className="border rounded px-1 text-[10px]"
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        dateRange: {
                          ...localFilters.dateRange,
                          to: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </FilterSection>

          {/* 4. Người tạo (Multi-select + Search) */}
          <MultiSelectSection
            title="Người tạo"
            options={staffOptions}
            selectedIds={localFilters.staffIds}
            onChange={(id: string, checked: boolean) =>
              handleMultiChange("staffIds", id, checked)
            }
          />
        </div>
      )}
    </div>
  );
}
