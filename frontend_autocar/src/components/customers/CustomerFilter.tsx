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
// Import Store
import { useCustomerStore } from "../../store/useCustomerStore";
// Import Store khác để lấy danh sách nhân viên (Người tạo)
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";

// --- TYPES ---
interface CustomerUIState {
  groupNames: string[];
  creatorIds: string[];
  dateType: "all" | "custom";
  dateRange: { from: string; to: string };
  customerType: "all" | "individual" | "company"; // Loại khách
}

// --- SUB COMPONENTS (Tái sử dụng) ---
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

function MultiSelectSection({
  title,
  options,
  selectedIds,
  onChange,
  placeholder,
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
          placeholder={placeholder || `Tìm ${title.toLowerCase()}...`}
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
interface CustomerFilterProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function CustomerFilter({
  isCollapsed,
  onToggle,
}: CustomerFilterProps) {
  const { filterOptions, setFilters } = useCustomerStore();
  // Lấy danh sách nhân viên từ PurchaseStore để làm filter Người tạo
  const { filterOptions: purchaseOptions, fetchFilterOptions: fetchStaffs } =
    usePurchaseOrderStore();

  // Load danh sách nhân viên khi mount
  useEffect(() => {
    fetchStaffs();
  }, []);

  // State nội bộ
  const [localFilters, setLocalFilters] = useState<CustomerUIState>({
    groupNames: [],
    creatorIds: [],
    dateType: "all",
    dateRange: { from: "", to: "" },
    customerType: "all",
  });

  // Debounce & Submit Params
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        groupName:
          localFilters.groupNames.length > 0
            ? localFilters.groupNames[0]
            : undefined, // API demo đang support 1 group, nếu multi thì sửa service
        creatorId:
          localFilters.creatorIds.length > 0
            ? localFilters.creatorIds[0]
            : undefined,
        startDate:
          localFilters.dateType === "custom"
            ? localFilters.dateRange.from
            : undefined,
        endDate:
          localFilters.dateType === "custom"
            ? localFilters.dateRange.to
            : undefined,
        // customerType: localFilters.customerType === 'all' ? undefined : localFilters.customerType, // Nếu backend hỗ trợ filter type
        page: 1,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localFilters, setFilters]);

  // --- Handlers ---
  const handleGroupChange = (id: string, checked: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      groupNames: checked
        ? [...prev.groupNames, id]
        : prev.groupNames.filter((i) => i !== id),
    }));
  };

  const handleCreatorChange = (id: string, checked: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      creatorIds: checked
        ? [...prev.creatorIds, id]
        : prev.creatorIds.filter((i) => i !== id),
    }));
  };

  const mapOptions = (arr: string[]) =>
    arr?.map((g) => ({ id: g, label: g })) || [];
  const mapStaffOptions = (arr: any[]) =>
    arr?.map((s) => ({ id: s.id, label: s.full_name })) || [];

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
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-gray-800 pb-2 border-b border-gray-100">
            <Filter size={18} className="text-blue-600" />
            <h3 className="font-bold text-lg whitespace-nowrap">Bộ lọc KH</h3>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
            >
              Đặt lại
            </button>
          </div>

          {/* 1. Nhóm Khách hàng */}
          <MultiSelectSection
            title="Nhóm khách hàng"
            placeholder="Tìm nhóm..."
            options={mapOptions(filterOptions.groups)}
            selectedIds={localFilters.groupNames}
            onChange={handleGroupChange}
          />

          {/* 2. Ngày tạo */}
          <FilterSection title="Ngày tạo" isOpen>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.dateType === "all"}
                  onChange={() =>
                    setLocalFilters({ ...localFilters, dateType: "all" })
                  }
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Toàn thời gian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={localFilters.dateType === "custom"}
                  onChange={() =>
                    setLocalFilters({ ...localFilters, dateType: "custom" })
                  }
                  className="w-3.5 h-3.5 text-blue-600"
                />
                <span className="text-sm text-gray-700">Tùy chỉnh</span>
              </label>
              {localFilters.dateType === "custom" && (
                <div className="mt-1 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="date"
                    value={localFilters.dateRange.from}
                    onChange={(e) =>
                      setLocalFilters((p) => ({
                        ...p,
                        dateRange: { ...p.dateRange, from: e.target.value },
                      }))
                    }
                    className="w-full text-[10px] p-1 border rounded focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={localFilters.dateRange.to}
                    onChange={(e) =>
                      setLocalFilters((p) => ({
                        ...p,
                        dateRange: { ...p.dateRange, to: e.target.value },
                      }))
                    }
                    className="w-full text-[10px] p-1 border rounded focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </FilterSection>

          {/* 3. Người tạo (Nhân viên) */}
          <MultiSelectSection
            title="Người tạo"
            placeholder="Chọn người tạo..."
            options={mapStaffOptions(purchaseOptions.staffs)}
            selectedIds={localFilters.creatorIds}
            onChange={handleCreatorChange}
          />

          {/* 4. Loại khách hàng (Theo hình ảnh) */}
          <FilterSection title="Loại khách hàng" isOpen>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setLocalFilters({ ...localFilters, customerType: "all" })
                }
                className={`flex-1 py-1 text-xs border rounded ${localFilters.customerType === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
              >
                Tất cả
              </button>
              <button
                onClick={() =>
                  setLocalFilters({
                    ...localFilters,
                    customerType: "individual",
                  })
                }
                className={`flex-1 py-1 text-xs border rounded ${localFilters.customerType === "individual" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
              >
                Cá nhân
              </button>
              <button
                onClick={() =>
                  setLocalFilters({ ...localFilters, customerType: "company" })
                }
                className={`flex-1 py-1 text-xs border rounded ${localFilters.customerType === "company" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600"}`}
              >
                Công ty
              </button>
            </div>
          </FilterSection>

          {/* 5. Giới tính & Sinh nhật (Ẩn hoặc làm mờ vì DB chưa hỗ trợ) */}
          <div className="opacity-50 pointer-events-none grayscale">
            <FilterSection title="Giới tính (Sắp có)">
              <div className="flex gap-2">
                <span className="text-xs">Chưa hỗ trợ</span>
              </div>
            </FilterSection>
            <FilterSection title="Sinh nhật (Sắp có)">
              <div className="flex gap-2">
                <span className="text-xs">Chưa hỗ trợ</span>
              </div>
            </FilterSection>
          </div>
        </div>
      )}
    </div>
  );
}
