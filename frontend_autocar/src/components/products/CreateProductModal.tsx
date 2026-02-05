/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/products/CreateProductModal.tsx

import { X, ChevronDown, Loader2, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useProductStore } from "../../store/useProductStore";
import { productService } from "../../services/productService";
import { toast } from "react-hot-toast";

// Import 2 Modal con
import CreateCategoryModal from "./modals/CreateCategoryModal";
import CreateWarehouseModal from "./modals/CreateWarehouseModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback khi tạo xong để reload bảng
}

// State mặc định
const initialFormState = {
  sku: "",
  name: "",
  category_id: "", // Select trả về string, parse sang number khi submit
  brand: "", // Input text (kết hợp datalist)
  cost_price: 0,
  retail_price: 0,

  // Tồn kho
  stock_quantity: 0,
  min_stock_alert: 0,
  max_stock: 999999, // Chỉ để hiển thị UI

  // Vị trí (Kho)
  warehouse_id: "", // Select trả về string, parse sang number

  unit: "Cái",
  image_url: "",
};

export default function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  // 1. Lấy dữ liệu Store
  const { filterOptions, fetchFilterOptions } = useProductStore();

  // 2. State Form
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);

  // 3. State điều khiển Modal con
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  // Reset form & Load options mới nhất khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      fetchFilterOptions(); // Đảm bảo danh sách danh mục/kho là mới nhất
    }
  }, [isOpen, fetchFilterOptions]);

  if (!isOpen) return null;

  // Xử lý thay đổi Input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // Xử lý Submit
  const handleSubmit = async () => {
    // Validate cơ bản
    if (!formData.name || !formData.sku) {
      toast.error("Vui lòng nhập Mã hàng và Tên hàng");
      return;
    }

    setIsLoading(true);
    try {
      // Chuẩn bị Payload gửi lên Backend
      const payload = {
        sku: formData.sku,
        name: formData.name,
        oem_code: "",
        brand: formData.brand || undefined,
        category_id: formData.category_id
          ? Number(formData.category_id)
          : undefined,
        unit: formData.unit,
        cost_price: formData.cost_price,
        retail_price: formData.retail_price,
        min_stock_alert: formData.min_stock_alert,
        image_url: formData.image_url,

        // Map Inventory: Nếu có nhập số lượng hoặc chọn kho thì tạo inventory
        inventory:
          formData.stock_quantity > 0 || formData.warehouse_id
            ? [
                {
                  quantity: formData.stock_quantity,
                  // Nếu không chọn kho, mặc định ID=1 (hoặc phải bắt buộc chọn)
                  warehouse_id: formData.warehouse_id
                    ? Number(formData.warehouse_id)
                    : 1,
                },
              ]
            : [],

        compatibility: [],
      };

      await productService.create(payload);

      toast.success("Tạo hàng hóa thành công!");
      if (onSuccess) onSuccess(); // Reload bảng ở trang cha
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || "Lỗi khi tạo sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* --- HEADER --- */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Tạo hàng hóa</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* --- TABS --- */}
          <div className="flex gap-6 px-6 border-b border-gray-200 text-sm font-medium">
            <button className="py-3 text-blue-600 border-b-2 border-blue-600">
              Thông tin
            </button>
            <button className="py-3 text-gray-500 hover:text-blue-600">
              Mô tả
            </button>
            <button className="py-3 text-gray-500 hover:text-blue-600">
              Chi nhánh kinh doanh
            </button>
          </div>

          {/* --- BODY --- */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="grid grid-cols-12 gap-6">
              {/* LEFT COLUMN */}
              <div className="col-span-12 md:col-span-9 space-y-4">
                {/* 1. THÔNG TIN CƠ BẢN */}
                <div className="bg-white p-4 rounded shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mã hàng <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Nhập mã SKU"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên hàng <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Tên sản phẩm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* NHÓM HÀNG (Có nút tạo mới) */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Nhóm hàng
                        </label>
                        <button
                          onClick={() => setShowCategoryModal(true)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <PlusCircle size={12} /> Tạo mới
                        </button>
                      </div>
                      <div className="relative">
                        <select
                          name="category_id"
                          value={formData.category_id}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Chọn nhóm hàng</option>
                          {filterOptions.categories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* THƯƠNG HIỆU (Input + Datalist) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thương hiệu
                      </label>
                      <input
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        list="brand-suggestions" // Link tới datalist bên dưới
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Nhập hoặc chọn..."
                      />
                      <datalist id="brand-suggestions">
                        {filterOptions.brands.map((b: any, i: number) => (
                          // Nếu API trả về object {id, name} thì dùng b.name, nếu string[] thì dùng b
                          <option
                            key={i}
                            value={typeof b === "string" ? b : b.name}
                          />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* 2. GIÁ CẢ */}
                <div className="bg-white p-4 rounded shadow-sm">
                  <h3 className="font-bold text-sm text-gray-800 mb-3">
                    Giá vốn, giá bán
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá vốn
                      </label>
                      <input
                        name="cost_price"
                        type="number"
                        value={formData.cost_price}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá bán
                      </label>
                      <input
                        name="retail_price"
                        type="number"
                        value={formData.retail_price}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. TỒN KHO */}
                <div className="bg-white p-4 rounded shadow-sm">
                  <h3 className="font-bold text-sm text-gray-800 mb-1">
                    Tồn kho
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Thiết lập tồn kho và định mức cảnh báo.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tồn ban đầu
                      </label>
                      <input
                        name="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Định mức thấp nhất
                      </label>
                      <input
                        name="min_stock_alert"
                        type="number"
                        value={formData.min_stock_alert}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Định mức cao nhất
                      </label>
                      <input
                        name="max_stock"
                        type="number"
                        value={formData.max_stock}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. VỊ TRÍ & ĐƠN VỊ */}
                <div className="bg-white p-4 rounded shadow-sm">
                  <h3 className="font-bold text-sm text-gray-800 mb-1">
                    Vị trí, trọng lượng
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {/* VỊ TRÍ KHO (Có nút tạo mới) */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Vị trí / Kho
                        </label>
                        <button
                          onClick={() => setShowWarehouseModal(true)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <PlusCircle size={12} /> Tạo kho
                        </button>
                      </div>
                      <div className="relative">
                        <select
                          name="warehouse_id"
                          value={formData.warehouse_id}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm appearance-none outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Chọn kho</option>
                          {filterOptions.locations.map((loc: any) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* ĐƠN VỊ TÍNH */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Đơn vị tính
                      </label>
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white outline-none"
                      >
                        <option value="Cái">Cái</option>
                        <option value="Bộ">Bộ</option>
                        <option value="Hộp">Hộp</option>
                        <option value="Lít">Lít</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (IMAGE) */}
              <div className="col-span-12 md:col-span-3">
                <div className="bg-white p-4 rounded shadow-sm h-full">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-sm">Ảnh hàng hóa</span>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500">
                      Link ảnh (URL)
                    </label>
                    <input
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-2 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6 text-gray-400 h-40 mb-2 hover:bg-gray-50 overflow-hidden">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-center">Preview ảnh</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- FOOTER --- */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sell-direct"
                className="accent-blue-600 w-4 h-4"
                defaultChecked
              />
              <label
                htmlFor="sell-direct"
                className="text-sm font-medium text-gray-700 select-none"
              >
                Bán trực tiếp
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-medium text-sm hover:bg-gray-50"
              >
                Bỏ qua
              </button>
              <div className="flex rounded border border-blue-600 overflow-hidden">
                <button
                  disabled={isLoading}
                  onClick={handleSubmit}
                  className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RENDER MODALS CON --- */}
      {/* Modal Tạo Nhóm Hàng */}
      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={() => fetchFilterOptions()} // Reload list ở select box
      />

      {/* Modal Tạo Kho/Vị trí */}
      <CreateWarehouseModal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        onSuccess={() => fetchFilterOptions()} // Reload list ở select box
      />
    </>
  );
}
