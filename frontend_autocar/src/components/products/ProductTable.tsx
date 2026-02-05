/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
// src/components/products/ProductTable.tsx
import {
  Plus,
  FileDown,
  Settings,
  Star,
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  Upload, // Thêm icon Upload
} from "lucide-react";
import ExportProductModal from "./modals/ExportProductModal"; // Import Modal mới
import { useState, useRef, useEffect } from "react";
import CreateProductModal from "./CreateProductModal";
import { useProductStore } from "../../store/useProductStore";
import { format } from "date-fns";
import { productService } from "../../services/productService";
import { toast } from "react-hot-toast";
import ProductDetailModal from "./ProductDetailModal";

const COLUMN_CONFIG = [
  { key: "image", label: "Hình ảnh", default: true },
  { key: "sku", label: "SKU", default: true },
  { key: "oem_code", label: "Mã hàng", default: true },
  { key: "name", label: "Tên hàng", default: true },
  { key: "category_name", label: "Nhóm hàng", default: true },
  { key: "cost_price", label: "Giá vốn", default: true },
  { key: "sell_price", label: "Giá bán", default: false },
  { key: "brand", label: "Thương hiệu", default: true },
  { key: "total_quantity", label: "Tồn kho", default: true },
  { key: "created_at", label: "Thời gian tạo", default: true },
  { key: "locations", label: "Vị trí", default: false },
];

export default function ProductTable() {
  const { products, total, filters, setFilters, fetchProducts, isLoading } =
    useProductStore();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // --- STATE UI ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // --- STATE SELECTION ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- STATE IMPORT (MỚI) ---
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref cho input file ẩn

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      COLUMN_CONFIG.forEach((col) => (initial[col.key] = col.default));
      return initial;
    },
  );
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [products]);

  // Click outside column selector
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setShowColumnSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters({ search: localSearch, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, setFilters]);

  // --- IMPORT LOGIC (MỚI) ---
  const handleImportClick = () => {
    // Kích hoạt click vào input file ẩn
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate đuôi file (Optional)
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Vui lòng chọn file Excel (.xlsx, .xls)");
      return;
    }

    setIsImporting(true);
    // Dùng toast.promise để hiện loading đẹp hơn
    const importPromise = productService.importProducts(file);

    toast
      .promise(importPromise, {
        loading: "Đang nhập dữ liệu...",
        success: (data) => {
          fetchProducts(); // Reload bảng sau khi import
          return `Nhập thành công! ${data.message || ""}`;
        },
        error: (err) => {
          return err.response?.data?.message || "Lỗi khi nhập file";
        },
      })
      .finally(() => {
        setIsImporting(false);
        // Reset input để có thể chọn lại cùng 1 file nếu cần
        if (event.target) event.target.value = "";
      });
  };

  // --- SELECTION LOGIC ---
  const isAllSelected =
    products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = selectedIds.filter(
        (id) => !products.find((p) => p.id === id),
      );
      setSelectedIds(newSelected);
    } else {
      const newIds = products.map((p) => p.id);
      const uniqueIds = Array.from(new Set([...selectedIds, ...newIds]));
      setSelectedIds(uniqueIds);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa ${selectedIds.length} sản phẩm đã chọn?`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await productService.deleteMany(selectedIds);
      toast.success(`Đã xóa ${selectedIds.length} sản phẩm`);
      setSelectedIds([]);
      fetchProducts();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Xóa thất bại";
      toast.error(typeof msg === "string" ? msg : "Lỗi khi xóa");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- FORMATTERS ---
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  // --- PAGINATION ---
  const totalPages = Math.ceil(total / filters.limit);
  const currentPage = filters.page;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters({ page: newPage });
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded border text-sm transition-colors ${
            currentPage === i
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer"
          }`}
        >
          {i}
        </button>,
      );
    }
    return buttons;
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
        {/* --- INPUT FILE ẨN --- */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
        />

        {/* --- ACTION BAR --- */}
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm z-10">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Theo mã, tên hàng, SKU..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>

          <div className="flex gap-2 items-center">
            {/* --- DELETE BUTTON --- */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors font-medium text-sm mr-2 animate-in fade-in zoom-in duration-200"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>Xóa ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Plus size={16} />{" "}
              <span className="hidden sm:inline">Thêm mới</span>
            </button>

            {/* --- NÚT IMPORT (ĐÃ KẾT NỐI LOGIC) --- */}
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              <span className="hidden sm:inline">
                {isImporting ? "Đang nhập..." : "Import"}
              </span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)} // Mở modal thay vì gọi API trực tiếp
              className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              <FileDown size={16} />{" "}
              <span className="hidden sm:inline">Xuất file</span>
            </button>

            {/* Column Selector Toggle */}
            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className={`p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 ${
                  showColumnSelector ? "bg-gray-100" : "bg-white"
                }`}
              >
                <LayoutGrid size={20} />
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 p-2">
                  {/* ... (Giữ nguyên phần chọn cột) */}
                  <div className="text-xs font-bold text-gray-500 mb-2 px-2">
                    HIỂN THỊ CỘT
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {COLUMN_CONFIG.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 accent-blue-600 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          {col.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 bg-white">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* --- TABLE CONTENT (Giữ nguyên) --- */}
        <div className="flex-1 overflow-auto p-4 flex flex-col">
          <div className="border border-gray-200 rounded bg-white shadow-sm flex-1 flex flex-col">
            <div className="overflow-auto flex-1 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              <table className="w-full text-sm text-left">
                {/* ... (Phần thead và tbody giữ nguyên như code cũ) */}
                <thead className="text-xs text-gray-500 uppercase bg-[#f4f6f8] border-b border-gray-200 sticky top-0 z-0">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        className="accent-blue-600 w-4 h-4 cursor-pointer"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 w-10 text-center">
                      <Star size={14} />
                    </th>
                    {visibleColumns.image && (
                      <th className="p-4 font-semibold text-gray-600 w-16">
                        Ảnh
                      </th>
                    )}
                    {visibleColumns.sku && (
                      <th className="p-4 font-semibold text-gray-600">SKU</th>
                    )}
                    {visibleColumns.oem_code && (
                      <th className="p-4 font-semibold text-gray-600">
                        Mã hàng
                      </th>
                    )}
                    {visibleColumns.name && (
                      <th className="p-4 font-semibold text-gray-600">
                        Tên hàng
                      </th>
                    )}
                    {visibleColumns.category_name && (
                      <th className="p-4 font-semibold text-gray-600">
                        Nhóm hàng
                      </th>
                    )}
                    {visibleColumns.cost_price && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Giá vốn
                      </th>
                    )}
                    {visibleColumns.sell_price && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Giá bán
                      </th>
                    )}
                    {visibleColumns.brand && (
                      <th className="p-4 font-semibold text-gray-600">
                        Thương hiệu
                      </th>
                    )}
                    {visibleColumns.total_quantity && (
                      <th className="p-4 font-semibold text-gray-600 text-center">
                        Tồn kho
                      </th>
                    )}
                    {visibleColumns.created_at && (
                      <th className="p-4 font-semibold text-gray-600 text-right">
                        Ngày tạo
                      </th>
                    )}
                    {visibleColumns.locations && (
                      <th className="p-4 font-semibold text-gray-600">
                        Vị trí
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.length > 0 ? (
                    products.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50/50 transition-colors group ${selectedIds.includes(item.id) ? "bg-blue-50" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="accent-blue-600 w-4 h-4 cursor-pointer"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelectOne(item.id)}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Star
                            size={16}
                            className="text-gray-300 hover:text-yellow-400 cursor-pointer"
                          />
                        </td>
                        {visibleColumns.image && (
                          <td className="p-4">
                            <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Img
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.sku && (
                          <td
                            onClick={() => setViewingProduct(item)} // <--- Thêm sự kiện click
                            className="p-4 font-medium text-blue-600 cursor-pointer hover:underline"
                          >
                            {item.sku}
                          </td>
                        )}
                        {visibleColumns.oem_code && (
                          <td
                            onClick={() => setViewingProduct(item)} // <--- Thêm sự kiện click
                            className="p-4 font-medium text-blue-600 cursor-pointer hover:underline"
                          >
                            {item.oem_code}
                          </td>
                        )}
                        {visibleColumns.name && (
                          <td className="p-4 font-medium text-gray-800">
                            {item.name}
                          </td>
                        )}
                        {visibleColumns.category_name && (
                          <td className="p-4 text-gray-600">
                            {item.category_name || "---"}
                          </td>
                        )}
                        {visibleColumns.cost_price && (
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatMoney(item.cost_price)}
                          </td>
                        )}
                        {visibleColumns.sell_price && (
                          <td className="p-4 text-right font-mono text-gray-700">
                            {formatMoney(item.retail_price)}
                          </td>
                        )}
                        {visibleColumns.brand && (
                          <td className="p-4 text-gray-600 uppercase text-xs">
                            {item.brand || "---"}
                          </td>
                        )}
                        {visibleColumns.total_quantity && (
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${item.total_quantity > 0 ? "text-gray-700 bg-green-100" : "text-red-500 bg-red-50"}`}
                            >
                              {item.total_quantity}
                            </span>
                          </td>
                        )}
                        {visibleColumns.created_at && (
                          <td className="p-4 text-right text-gray-500 text-xs">
                            {formatDate(item.created_at)}
                          </td>
                        )}
                        {visibleColumns.locations && (
                          <td
                            className="p-4 text-gray-500 text-xs truncate max-w-[150px]"
                            title={item.locations}
                          >
                            {item.locations}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="p-8 text-center text-gray-500"
                      >
                        {isLoading
                          ? "Đang tải dữ liệu..."
                          : "Không tìm thấy dữ liệu phù hợp"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* --- PAGINATION FOOTER (Giữ nguyên) --- */}
            {total > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="text-gray-600">
                  Hiển thị <b>{(currentPage - 1) * filters.limit + 1}</b> -{" "}
                  <b>{Math.min(currentPage * filters.limit, total)}</b> trên
                  tổng số <b>{total}</b> hàng hóa
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {renderPaginationButtons()}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchProducts()}
      />
      <ExportProductModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      {viewingProduct && (
        <ProductDetailModal
          isOpen={!!viewingProduct}
          onClose={() => setViewingProduct(null)}
          product={viewingProduct}
        />
      )}
    </>
  );
}
