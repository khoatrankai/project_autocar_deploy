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
import { useSupplierStore } from "../../store/useSupplierStore"; // Import Store Supplier

// --- TYPES ---
export interface DateRange {
  from: string;
  to: string;
}

interface SupplierUIState {
  groupNames: string[]; // Thay vì IDs, ta dùng tên nhóm như đã thống nhất
  minDebt: string; // Dùng string để handle việc input rỗng dễ hơn
  maxDebt: string;
  minRevenue: string;
  maxRevenue: string;
  revenueDateType: "all" | "custom";
  revenueDateRange: DateRange;
  status: string; // active, inactive, all
}

// --- SUB COMPONENTS (Tái sử dụng) ---

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
  selectedIds, // Ở đây là selectedValues (string[])
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

// --- NEW COMPONENT: NUMBER RANGE (Cho Tiền/Nợ) ---
function NumberRangeSection({
  title,
  from,
  to,
  onChange,
}: {
  title: string;
  from: string;
  to: string;
  onChange: (type: "min" | "max", value: string) => void;
}) {
  return (
    <FilterSection title={title} isOpen>
      <div className="space-y-2">
        <div className="flex items-center">
          <span className="w-8 text-xs text-gray-500 bg-gray-100 h-8 flex items-center justify-center rounded-l border border-r-0 border-gray-300">
            Từ
          </span>
          <input
            type="number"
            value={from}
            onChange={(e) => onChange("min", e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-r h-8 px-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center">
          <span className="w-8 text-xs text-gray-500 bg-gray-100 h-8 flex items-center justify-center rounded-l border border-r-0 border-gray-300">
            Tới
          </span>
          <input
            type="number"
            value={to}
            onChange={(e) => onChange("max", e.target.value)}
            placeholder="Giá trị"
            className="w-full border border-gray-300 rounded-r h-8 px-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </FilterSection>
  );
}

// --- MAIN COMPONENT ---

interface SupplierFilterProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function SupplierFilter({
  isCollapsed,
  onToggle,
}: SupplierFilterProps) {
  const { filterOptions, setFilters } = useSupplierStore();

  // State nội bộ
  const [localFilters, setLocalFilters] = useState<SupplierUIState>({
    groupNames: [],
    minDebt: "",
    maxDebt: "",
    minRevenue: "",
    maxRevenue: "",
    revenueDateType: "all",
    revenueDateRange: { from: "", to: "" },
    status: "active", // Mặc định hiển thị đang hoạt động
  });

  // Debounce & Submit Params
  useEffect(() => {
    const timer = setTimeout(() => {
      const apiPayload = {
        // Mảng tên nhóm
        groupNames: localFilters.groupNames,

        // Nợ (Convert string -> number/undefined)
        minDebt: localFilters.minDebt
          ? Number(localFilters.minDebt)
          : undefined,
        maxDebt: localFilters.maxDebt
          ? Number(localFilters.maxDebt)
          : undefined,

        // Tổng mua
        minRevenue: localFilters.minRevenue
          ? Number(localFilters.minRevenue)
          : undefined,
        maxRevenue: localFilters.maxRevenue
          ? Number(localFilters.maxRevenue)
          : undefined,

        // Thời gian lọc tổng mua
        dateFrom:
          localFilters.revenueDateType === "custom"
            ? localFilters.revenueDateRange.from
            : undefined,
        dateTo:
          localFilters.revenueDateType === "custom"
            ? localFilters.revenueDateRange.to
            : undefined,

        status: localFilters.status === "all" ? undefined : localFilters.status,

        page: 1, // Reset page khi filter
      };

      setFilters(apiPayload);
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);
  useEffect(() => {
    console.log(filterOptions);
  }, [filterOptions]);
  // --- Handlers ---

  const handleGroupChange = (id: string, checked: boolean) => {
    setLocalFilters((prev) => {
      const current = prev.groupNames;
      return {
        ...prev,
        groupNames: checked
          ? [...current, id]
          : current.filter((item) => item !== id),
      };
    });
  };

  const mapGroupOptions = (groups: string[]) => {
    return groups?.map((g) => ({ id: g, label: g }));
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

      {/* --- COLLAPSED VIEW --- */}
      {isCollapsed ? (
        <div className="flex flex-col items-center pt-4 gap-4 w-full">
          <div
            className="p-2 bg-blue-50 rounded-lg text-blue-600 cursor-pointer"
            title="Bộ lọc đang ẩn"
          >
            <Filter size={20} />
          </div>
        </div>
      ) : (
        /* --- EXPANDED VIEW --- */
        <div className="h-full overflow-y-auto p-4 scrollbar-thin select-none">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg whitespace-nowrap">Bộ lọc NCC</h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Nhóm Nhà cung cấp */}
          <MultiSelectSection
            title="Nhóm nhà cung cấp"
            options={mapGroupOptions(filterOptions.groups)}
            selectedIds={localFilters.groupNames}
            onChange={handleGroupChange}
          />

          {/* 2. Tổng mua (Gồm Giá trị + Thời gian) */}
          <FilterSection title="Tổng mua" isOpen>
            {/* Giá trị */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1 font-medium">
                Giá trị
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="w-8 text-xs text-gray-500 bg-gray-100 h-8 flex items-center justify-center rounded-l border border-r-0 border-gray-300">
                    Từ
                  </span>
                  <input
                    type="number"
                    value={localFilters.minRevenue}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        minRevenue: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-r h-8 px-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <span className="w-8 text-xs text-gray-500 bg-gray-100 h-8 flex items-center justify-center rounded-l border border-r-0 border-gray-300">
                    Tới
                  </span>
                  <input
                    type="number"
                    value={localFilters.maxRevenue}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        maxRevenue: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-r h-8 px-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Thời gian */}
            <div>
              <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
                <Calendar size={10} /> Thời gian
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={localFilters.revenueDateType === "all"}
                    onChange={() =>
                      setLocalFilters({
                        ...localFilters,
                        revenueDateType: "all",
                      })
                    }
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Toàn thời gian</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={localFilters.revenueDateType === "custom"}
                    onChange={() =>
                      setLocalFilters({
                        ...localFilters,
                        revenueDateType: "custom",
                      })
                    }
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Tùy chỉnh</span>
                </label>

                {localFilters.revenueDateType === "custom" && (
                  <div className="mt-1 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                    <input
                      type="date"
                      value={localFilters.revenueDateRange.from}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          revenueDateRange: {
                            ...localFilters.revenueDateRange,
                            from: e.target.value,
                          },
                        })
                      }
                      className="w-full text-[10px] p-1 border rounded focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={localFilters.revenueDateRange.to}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          revenueDateRange: {
                            ...localFilters.revenueDateRange,
                            to: e.target.value,
                          },
                        })
                      }
                      className="w-full text-[10px] p-1 border rounded focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </FilterSection>

          {/* 3. Nợ hiện tại */}
          <NumberRangeSection
            title="Nợ hiện tại"
            from={localFilters.minDebt}
            to={localFilters.maxDebt}
            onChange={(type, val) => {
              if (type === "min")
                setLocalFilters({ ...localFilters, minDebt: val });
              else setLocalFilters({ ...localFilters, maxDebt: val });
            }}
          />

          {/* 4. Trạng thái */}
          <FilterSection title="Trạng thái" isOpen>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "Tất cả" },
                { id: "active", label: "Đang hoạt động" },
                { id: "inactive", label: "Ngừng hoạt động" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() =>
                    setLocalFilters({ ...localFilters, status: st.id })
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    localFilters.status === st.id
                      ? "bg-blue-600 text-white border-blue-600 font-medium"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>
      )}
    </div>
  );
}
