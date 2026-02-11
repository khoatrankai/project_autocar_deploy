/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  Folder,
  FolderOpen,
  PlusCircle,
} from "lucide-react";
import { flattenCategories } from "../../utils/categoryHelper";

interface CategorySelectorProps {
  categories: any[]; // Dữ liệu dạng Cây (Tree)
  value: string | number | null;
  onChange: (value: string | number | null) => void; // Cho phép null (nếu chọn gốc)
  placeholder?: string;
  onCreateNew?: () => void;
  className?: string;
  allowClear?: boolean; // Cho phép bỏ chọn (để chọn category gốc)
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  value,
  onChange,
  placeholder = "Chọn nhóm hàng",
  onCreateNew,
  className = "",
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // State lưu danh sách các ID đang được mở (Expanded)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Dữ liệu phẳng dùng để: Tìm tên label & Tìm kiếm
  const flatOptions = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  // 2. Lấy label hiển thị
  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const found = flatOptions.find((c: any) => String(c.id) === String(value));
    return found ? found.name : null;
  }, [flatOptions, value]);

  // 3. Toggle mở/đóng nhánh con
  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Ngăn sự kiện click chọn item
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  // 4. Hàm render đệ quy cho Tree View
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map((node) => {
      const idStr = String(node.id);
      const hasChildren =
        (node.children && node.children.length > 0) ||
        (node.other_categories && node.other_categories.length > 0);
      const children = node.children || node.other_categories;
      const isExpanded = expandedIds.has(idStr);
      const isSelected = String(value) === idStr;

      // Tính padding thụt đầu dòng
      const paddingLeft = level * 12 + 8;

      return (
        <div key={node.id}>
          <div
            onClick={() => {
              onChange(node.id);
              setIsOpen(false);
              setSearchTerm("");
            }}
            className={`
              group flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded-md transition-colors select-none
              ${
                isSelected
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {/* Nút Toggle Expand (Chỉ hiện nếu có con) */}
            <div
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 transition-colors ${
                hasChildren ? "visible" : "invisible"
              }`}
              onClick={(e) => hasChildren && toggleExpand(e, idStr)}
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>

            {/* Icon Folder */}
            <div className="text-blue-500 opacity-80">
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </div>

            {/* Tên danh mục */}
            <span className="flex-1 truncate">{node.name}</span>

            {isSelected && <Check size={14} className="text-blue-600" />}
          </div>

          {/* Render con đệ quy nếu đang mở */}
          {hasChildren && isExpanded && (
            <div className="border-l border-gray-100 ml-[18px]">
              {renderTree(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // 5. Render dạng phẳng (khi đang tìm kiếm)
  const renderSearchResults = () => {
    const filtered = flatOptions.filter((c: any) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filtered.length === 0) {
      return (
        <div className="p-4 text-center text-xs text-gray-500">
          Không tìm thấy kết quả
        </div>
      );
    }

    return filtered.map((c: any) => (
      <div
        key={c.id}
        onClick={() => {
          onChange(c.id);
          setIsOpen(false);
          setSearchTerm("");
        }}
        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between"
      >
        <span className="flex flex-col">
          <span>{c.name}</span>
          {/* Hiển thị đường dẫn cha con nhỏ bên dưới nếu cần */}
          <span className="text-[10px] text-gray-400">ID: {c.id}</span>
        </span>
        {String(value) === String(c.id) && (
          <Check size={14} className="text-blue-600" />
        )}
      </div>
    ));
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* TRIGGER BUTTON */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full border rounded px-3 py-2 text-sm bg-white cursor-pointer 
          flex justify-between items-center transition-all
          ${
            isOpen
              ? "border-blue-500 ring-1 ring-blue-500"
              : "border-gray-300 hover:border-gray-400"
          }
        `}
      >
        <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* DROPDOWN CONTENT */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-2.5 text-gray-400"
              />
              <input
                type="text"
                placeholder="Tìm danh mục..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-500 focus:bg-white transition-colors bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Option List */}
          <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
            {/* Nút chọn Root (Không có cha) */}
            {allowClear && !searchTerm && (
              <div
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`
                  px-2 py-2 text-sm cursor-pointer rounded-md mb-1 border-b border-dashed border-gray-200
                  ${
                    !value
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-500 hover:bg-gray-50"
                  }
                `}
              >
                <span className="ml-7">-- Danh mục gốc (Không có cha) --</span>
              </div>
            )}

            {/* Logic: Nếu có từ khóa tìm kiếm -> Render list phẳng. Nếu không -> Render cây */}
            {searchTerm ? renderSearchResults() : renderTree(categories)}
          </div>

          {/* Footer Create New */}
          {onCreateNew && (
            <div
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
              }}
              className="p-2 border-t border-gray-100 bg-gray-50 cursor-pointer text-blue-600 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-blue-50"
            >
              <PlusCircle size={14} />
              Tạo nhóm hàng mới
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
