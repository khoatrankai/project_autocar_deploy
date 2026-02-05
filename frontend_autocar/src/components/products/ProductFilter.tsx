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
} from "lucide-react";
import { useProductStore } from "../../store/useProductStore";

// --- TYPES ---
export interface DateRange {
  from: string;
  to: string;
}

interface UIState {
  categoryIds: string[];
  supplierIds: string[];
  brandIds: string[];
  locationIds: string[];
  stockStatus: string;
  productTypes: string[];
  stockoutDateType: "all" | "custom";
  stockoutDateRange: DateRange;
  createdDateType: "all" | "custom";
  createdDateRange: DateRange;
}

// --- SUB COMPONENTS ---

function FilterSection({
  title,
  children,
  isOpen = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  action?: React.ReactNode;
}) {
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
  action,
}: {
  title: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
  onChange: (id: string, checked: boolean) => void;
  action?: React.ReactNode;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  return (
    <FilterSection title={title} isOpen action={action}>
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
                  className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <span
                  className={`text-sm leading-tight group-hover:text-blue-600 ${
                    selectedIds?.includes(opt.id)
                      ? "font-medium text-gray-900"
                      : "text-gray-600"
                  }`}
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

function DateRangeSection({
  title,
  modeType,
  dateRange,
  onModeChange,
  onDateChange,
}: {
  title: string;
  modeType: "all" | "custom";
  dateRange: DateRange;
  onModeChange: (mode: "all" | "custom") => void;
  onDateChange: (type: "from" | "to", val: string) => void;
}) {
  return (
    <FilterSection title={title} isOpen>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={modeType === "all"}
            onChange={() => onModeChange("all")}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">Toàn thời gian</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={modeType === "custom"}
            onChange={() => onModeChange("custom")}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">Tùy chỉnh</span>
        </label>

        {modeType === "custom" && (
          <div className="mt-2 grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded border border-gray-200 animate-in slide-in-from-top-2 fade-in">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">
                Từ ngày
              </span>
              <input
                type="date"
                value={dateRange?.from || ""}
                onChange={(e) => onDateChange("from", e.target.value)}
                className="w-full text-xs p-1 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-semibold">
                Đến ngày
              </span>
              <input
                type="date"
                value={dateRange?.to || ""}
                onChange={(e) => onDateChange("to", e.target.value)}
                className="w-full text-xs p-1 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </FilterSection>
  );
}

// --- MAIN COMPONENT ---

interface ProductFilterProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function ProductFilter({
  isCollapsed,
  onToggle,
}: ProductFilterProps) {
  const { filterOptions, setFilters } = useProductStore();

  const [localFilters, setLocalFilters] = useState<UIState>({
    categoryIds: [],
    supplierIds: [],
    brandIds: [],
    locationIds: [],
    stockStatus: "all",
    productTypes: [],
    stockoutDateType: "all",
    stockoutDateRange: { from: "", to: "" },
    createdDateType: "all",
    createdDateRange: { from: "", to: "" },
  });

  // Debounce & Submit Params
  useEffect(() => {
    const timer = setTimeout(() => {
      const apiPayload = {
        categoryIds: localFilters.categoryIds,
        supplierIds: localFilters.supplierIds,
        brandIds: localFilters.brandIds,
        locationIds: localFilters.locationIds,
        stockStatus: localFilters.stockStatus,
        productTypes: localFilters.productTypes,

        stockoutDateType: localFilters.stockoutDateType,
        stockoutFrom:
          localFilters.stockoutDateType === "custom"
            ? localFilters.stockoutDateRange.from
            : undefined,
        stockoutTo:
          localFilters.stockoutDateType === "custom"
            ? localFilters.stockoutDateRange.to
            : undefined,

        createdDateType: localFilters.createdDateType,
        createdFrom:
          localFilters.createdDateType === "custom"
            ? localFilters.createdDateRange.from
            : undefined,
        createdTo:
          localFilters.createdDateType === "custom"
            ? localFilters.createdDateRange.to
            : undefined,

        page: 1,
      };

      setFilters(apiPayload as any);
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);

  // Helpers
  const handleMultiSelectChange = (
    field: keyof UIState,
    id: string,
    checked: boolean,
  ) => {
    setLocalFilters((prev) => {
      const currentList = prev[field] as string[];
      return {
        ...prev,
        [field]: checked
          ? [...currentList, id]
          : currentList.filter((item) => item !== id),
      };
    });
  };

  const handleDateRangeChange = (
    field: "stockoutDateRange" | "createdDateRange",
    subField: "from" | "to",
    value: string,
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: { ...prev[field], [subField]: value },
    }));
  };

  const mapOptions = (data: any[]) => {
    return data.map((item) => ({
      id: String(item.id || item),
      label: item.name || item.label || item,
    }));
  };

  return (
    <div
      className={`
        flex-shrink-0 border-r border-gray-200 bg-white h-full relative transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-12" : "w-64"} 
        hidden md:flex flex-col z-20
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute cursor-pointer -right-3 top-1/2 z-50 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500"
        title={isCollapsed ? "Mở bộ lọc" : "Thu gọn"}
      >
        {isCollapsed ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
      </button>

      {/* --- CONTENT --- */}
      {isCollapsed ? (
        // Collapsed View (Icon Only)
        <div className="flex flex-col items-center pt-4 gap-4 w-full">
          <div
            className="p-2 bg-blue-50 rounded-lg text-blue-600 cursor-pointer"
            title="Bộ lọc đang ẩn"
          >
            <Filter size={20} />
          </div>
        </div>
      ) : (
        // Expanded View (Full Filter)
        <div className="h-full overflow-y-auto p-4 scrollbar-thin select-none">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg whitespace-nowrap">Bộ lọc</h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Nhóm hàng */}
          <MultiSelectSection
            title="Nhóm hàng"
            options={mapOptions(filterOptions.categories)}
            selectedIds={localFilters.categoryIds}
            onChange={(id, checked) =>
              handleMultiSelectChange("categoryIds", id, checked)
            }
          />

          {/* 2. Tồn kho */}
          <FilterSection title="Tồn kho" isOpen>
            <div className="relative">
              <select
                value={localFilters.stockStatus}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    stockStatus: e.target.value,
                  }))
                }
                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded focus:outline-none focus:border-blue-500 hover:border-blue-400 cursor-pointer text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="low_stock">Dưới định mức</option>
                <option value="over_stock">Vượt định mức</option>
                <option value="in_stock">Có tồn kho</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </FilterSection>

          {/* 3. Dự kiến hết hàng */}
          <DateRangeSection
            title="Dự kiến hết hàng"
            modeType={localFilters.stockoutDateType}
            dateRange={localFilters.stockoutDateRange}
            onModeChange={(mode) =>
              setLocalFilters((prev) => ({ ...prev, stockoutDateType: mode }))
            }
            onDateChange={(type, val) =>
              handleDateRangeChange("stockoutDateRange", type, val)
            }
          />

          {/* 4. Thời gian tạo */}
          <DateRangeSection
            title="Thời gian tạo"
            modeType={localFilters.createdDateType}
            dateRange={localFilters.createdDateRange}
            onModeChange={(mode) =>
              setLocalFilters((prev) => ({ ...prev, createdDateType: mode }))
            }
            onDateChange={(type, val) =>
              handleDateRangeChange("createdDateRange", type, val)
            }
          />

          {/* 5. Nhà cung cấp */}
          <MultiSelectSection
            title="Nhà cung cấp"
            options={mapOptions(filterOptions.suppliers)}
            selectedIds={localFilters.supplierIds}
            onChange={(id, checked) =>
              handleMultiSelectChange("supplierIds", id, checked)
            }
          />

          {/* 6. Thương hiệu */}
          <MultiSelectSection
            title="Thương hiệu"
            options={mapOptions(filterOptions.brands)}
            selectedIds={localFilters.brandIds}
            onChange={(id, checked) =>
              handleMultiSelectChange("brandIds", id, checked)
            }
          />

          {/* 7. Vị trí */}
          <MultiSelectSection
            title="Vị trí"
            options={mapOptions(filterOptions.locations)}
            selectedIds={localFilters.locationIds}
            onChange={(id, checked) =>
              handleMultiSelectChange("locationIds", id, checked)
            }
          />
        </div>
      )}
    </div>
  );
}
