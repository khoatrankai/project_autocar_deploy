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
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { useReturnStore } from "../../store/useReturnStore"; // Store mới tạo
import { useProductStore } from "../../store/useProductStore"; // Lấy Warehouse
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore"; // Lấy Staff/Supplier

// --- TYPES & INTERFACES ---
interface ReturnUIState {
  branchIds: string[];
  statuses: string[];
  timePreset: "week" | "month" | "year" | "custom";
  dateRange: { from: string; to: string };
  creatorIds: string[];
  partnerIds: string[]; // Người trả (NCC)
}

// --- SUB COMPONENTS (Tái sử dụng) ---
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
                  checked={selectedIds?.includes(opt.id.toString())} // Convert to string để so sánh an toàn
                  onChange={(e) =>
                    onChange(opt.id.toString(), e.target.checked)
                  }
                  className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
                />
                <span
                  className={`text-sm leading-tight group-hover:text-blue-600 ${selectedIds?.includes(opt.id.toString()) ? "font-medium text-gray-900" : "text-gray-600"}`}
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
interface ReturnFilterProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function ReturnFilter({
  isCollapsed,
  onToggle,
}: ReturnFilterProps) {
  const { setFilters } = useReturnStore();
  const { filterOptions: productOptions } = useProductStore(); // Lấy Warehouses
  const { filterOptions: purchaseOptions } = usePurchaseOrderStore(); // Lấy Staffs, Suppliers

  const [localFilters, setLocalFilters] = useState<ReturnUIState>({
    branchIds: [],
    statuses: [],
    timePreset: "month",
    dateRange: {
      from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      to: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    creatorIds: [],
    partnerIds: [],
  });

  // Debounce submit filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        branchIds:
          localFilters.branchIds.length > 0
            ? localFilters.branchIds
            : undefined,
        status:
          localFilters.statuses.length > 0 ? localFilters.statuses : undefined,
        startDate: localFilters.dateRange.from || undefined,
        endDate: localFilters.dateRange.to || undefined,
        creatorIds:
          localFilters.creatorIds.length > 0
            ? localFilters.creatorIds
            : undefined,
        partnerIds:
          localFilters.partnerIds.length > 0
            ? localFilters.partnerIds
            : undefined,
        page: 1, // Reset về trang 1 khi filter thay đổi
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);

  // --- Handlers ---
  const handleMultiSelectChange = (
    field: keyof ReturnUIState,
    id: string,
    checked: boolean,
  ) => {
    setLocalFilters((prev) => {
      const list = prev[field] as string[];
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

  const handleTimePresetChange = (
    preset: "week" | "month" | "year" | "custom",
  ) => {
    const now = new Date();
    let newRange = { from: "", to: "" };

    if (preset === "week") {
      newRange.from = format(
        startOfWeek(now, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      newRange.to = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (preset === "month") {
      newRange.from = format(startOfMonth(now), "yyyy-MM-dd");
      newRange.to = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (preset === "year") {
      newRange.from = format(startOfYear(now), "yyyy-MM-dd");
      newRange.to = format(endOfYear(now), "yyyy-MM-dd");
    } else {
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
      <button
        onClick={onToggle}
        className="absolute cursor-pointer -right-3 top-1/2 z-50 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500"
      >
        {isCollapsed ? <ChevronsRight size={24} /> : <ChevronsLeft size={24} />}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center pt-4 gap-4 w-full">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600 cursor-pointer">
            <Filter size={20} />
          </div>
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-4 scrollbar-thin select-none">
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg whitespace-nowrap">
              Trả hàng nhập
            </h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Chi nhánh */}
          <MultiSelectSection
            title="Chi nhánh"
            placeholder="Chọn chi nhánh"
            options={
              productOptions?.locations?.map((w: any) => ({
                id: w.id,
                label: w.name,
              })) || []
            }
            selectedIds={localFilters.branchIds}
            onChange={(id: string, checked: boolean) =>
              handleMultiSelectChange("branchIds", id, checked)
            }
          />

          {/* 2. Trạng thái */}
          <FilterSection title="Trạng thái" isOpen>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "draft", label: "Phiếu tạm" },
                { id: "completed", label: "Đã trả hàng" },
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

          {/* 3. Thời gian */}
          <FilterSection title="Thời gian" isOpen>
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Calendar size={12} /> <span>Theo ngày tạo</span>
              </div>
              {["week", "month", "year", "custom"].map((preset) => (
                <label
                  key={preset}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={localFilters.timePreset === preset}
                    onChange={() => handleTimePresetChange(preset as any)}
                    className="w-3.5 h-3.5 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {preset === "week"
                      ? "Tuần này"
                      : preset === "month"
                        ? "Tháng này"
                        : preset === "year"
                          ? "Năm này"
                          : "Tùy chỉnh"}
                  </span>
                </label>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 animate-in fade-in bg-gray-50 p-2 rounded border border-gray-200">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Từ ngày
                  </span>
                  <input
                    type="date"
                    value={localFilters.dateRange.from}
                    onChange={(e) =>
                      setLocalFilters((p) => ({
                        ...p,
                        timePreset: "custom",
                        dateRange: { ...p.dateRange, from: e.target.value },
                      }))
                    }
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
                    onChange={(e) =>
                      setLocalFilters((p) => ({
                        ...p,
                        timePreset: "custom",
                        dateRange: { ...p.dateRange, to: e.target.value },
                      }))
                    }
                    className="w-full text-[10px] p-1 border rounded focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* 4. Người tạo (Staff) */}
          <MultiSelectSection
            title="Người tạo"
            placeholder="Chọn người tạo"
            options={
              purchaseOptions?.staffs?.map((s: any) => ({
                id: s.id,
                label: s.full_name,
              })) || []
            }
            selectedIds={localFilters.creatorIds}
            onChange={(id: string, checked: boolean) =>
              handleMultiSelectChange("creatorIds", id, checked)
            }
          />

          {/* 5. Người trả (NCC/Partner) */}
          <MultiSelectSection
            title="Người trả"
            placeholder="Chọn người trả"
            options={
              productOptions?.suppliers?.map((s: any) => ({
                id: s.id,
                label: s.name,
              })) || []
            }
            selectedIds={localFilters.partnerIds}
            onChange={(id: string, checked: boolean) =>
              handleMultiSelectChange("partnerIds", id, checked)
            }
          />
        </div>
      )}
    </div>
  );
}
