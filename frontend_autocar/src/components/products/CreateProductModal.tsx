/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/products/CreateProductModal.tsx

import {
  X,
  ChevronDown,
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useProductStore } from "../../store/useProductStore";
import { productService } from "../../services/productService";
import { toast } from "react-hot-toast";

// Import Modal
import CreateCategoryModal from "./modals/CreateCategoryModal";
import CreateWarehouseModal from "./modals/CreateWarehouseModal";
import CategorySelector from "../shared/CategorySelector";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const initialFormState = {
  sku: "",
  name: "",
  category_id: "",
  brand: "",
  cost_price: 0,
  retail_price: 0,
  stock_quantity: 0,
  min_stock_alert: 0,
  max_stock: 999999,
  warehouse_id: "",
  unit: "Cái",
  image_url: "",
};

// Hàm đệ quy tìm tên danh mục từ cây (Dành cho chức năng Sửa)
const findCategoryName = (categories: any[], id: string): string => {
  for (const cat of categories) {
    if (String(cat.id) === String(id)) return cat.name;
    if (cat.children) {
      const found = findCategoryName(cat.children, id);
      if (found) return found;
    }
  }
  return "";
};

export default function CreateProductModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions, fetchFilterOptions } = useProductStore();

  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATES QUẢN LÝ TẠO MỚI (GIỮ NGUYÊN) ---
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  // --- STATES QUẢN LÝ INLINE SỬA NHÓM HÀNG ---
  const [categoryMode, setCategoryMode] = useState<"select" | "edit">("select");
  const [tempCategoryName, setTempCategoryName] = useState("");
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  // --- STATES QUẢN LÝ INLINE SỬA THƯƠNG HIỆU ---
  const [brandMode, setBrandMode] = useState<"select" | "edit">("select");
  const [tempBrandName, setTempBrandName] = useState("");
  const [isBrandSaving, setIsBrandSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      setCategoryMode("select");
      setBrandMode("select");
      fetchFilterOptions();
    }
  }, [isOpen, fetchFilterOptions]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // ==========================================
  // XỬ LÝ NHÓM HÀNG (INLINE SỬA/XÓA)
  // ==========================================
  const handleOpenEditCategory = () => {
    const name = findCategoryName(
      filterOptions.categories_advance || [],
      formData.category_id,
    );
    setTempCategoryName(name);
    setCategoryMode("edit");
  };

  const handleSaveCategory = async () => {
    if (!tempCategoryName.trim()) {
      toast.error("Vui lòng nhập tên nhóm hàng");
      return;
    }
    setIsCategorySaving(true);
    try {
      // TODO: Gọi API cập nhật nhóm hàng ở đây
      await productService.updateCategory(formData.category_id, {
        name: tempCategoryName,
      });
      toast.success("Cập nhật nhóm hàng thành công!");
      await fetchFilterOptions();
      setCategoryMode("select");
    } catch (error) {
      toast.error("Lỗi khi lưu nhóm hàng");
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!formData.category_id) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa nhóm hàng này không?")) {
      try {
        // TODO: Gọi API xóa nhóm hàng ở đây
        await productService.deleteCategory(formData.category_id);
        toast.success("Xóa nhóm hàng thành công!");
        setFormData((prev) => ({ ...prev, category_id: "" }));
        fetchFilterOptions();
      } catch (error) {
        toast.error("Lỗi khi xóa nhóm hàng");
      }
    }
  };

  // ==========================================
  // XỬ LÝ THƯƠNG HIỆU (INLINE SỬA/XÓA)
  // ==========================================
  const selectedBrandObj = filterOptions.brands?.find(
    (b: any) => (typeof b === "string" ? b : b.name) === formData.brand,
  );
  const isExistingBrand = !!selectedBrandObj;

  const handleOpenEditBrand = () => {
    setTempBrandName(formData.brand);
    setBrandMode("edit");
  };

  const handleSaveBrand = async () => {
    if (!tempBrandName.trim()) {
      toast.error("Vui lòng nhập tên thương hiệu");
      return;
    }
    setIsBrandSaving(true);
    try {
      console.log(selectedBrandObj, tempBrandName);
      // const brandId =
      //   typeof selectedBrandObj === "string"
      //     ? selectedBrandObj
      //     : selectedBrandObj.id;
      // TODO: Gọi API cập nhật thương hiệu ở đây
      await productService.updateBrand(selectedBrandObj, tempBrandName);
      toast.success("Cập nhật thương hiệu thành công!");
      setFormData((prev) => ({ ...prev, brand: tempBrandName }));
      await fetchFilterOptions();
      setBrandMode("select");
    } catch (error) {
      toast.error("Lỗi khi lưu thương hiệu");
    } finally {
      setIsBrandSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!isExistingBrand) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa thương hiệu này không?")) {
      try {
        // const brandId = typeof selectedBrandObj === "string" ? selectedBrandObj : selectedBrandObj.id;
        // TODO: Gọi API xóa thương hiệu ở đây
        // await brandService.delete(brandId);
        toast.success("Xóa thương hiệu thành công!");
        setFormData((prev) => ({ ...prev, brand: "" }));
        fetchFilterOptions();
      } catch (error) {
        toast.error("Lỗi khi xóa thương hiệu");
      }
    }
  };

  // ==========================================
  // LƯU SẢN PHẨM (SUBMIT FORM)
  // ==========================================
  const handleSubmit = async () => {
    if (!formData.name || !formData.sku) {
      toast.error("Vui lòng nhập Mã hàng và Tên hàng");
      return;
    }
    setIsLoading(true);
    try {
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
        inventory:
          formData.stock_quantity > 0 || formData.warehouse_id
            ? [
                {
                  quantity: formData.stock_quantity,
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
      if (onSuccess) onSuccess();
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
          {/* HEADER */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Tạo hàng hóa</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* TABS (Giao diện tĩnh) */}
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

          {/* BODY */}
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
                    {/* NHÓM HÀNG */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Nhóm hàng
                        </label>
                        <div className="flex items-center gap-3">
                          {/* Sửa/Xóa Inline khi đã chọn mục */}
                          {formData.category_id &&
                            categoryMode === "select" && (
                              <>
                                <button
                                  onClick={handleOpenEditCategory}
                                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                  title="Sửa"
                                >
                                  <Edit size={12} /> Sửa
                                </button>
                                <button
                                  onClick={handleDeleteCategory}
                                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                  title="Xóa"
                                >
                                  <Trash2 size={12} /> Xóa
                                </button>
                              </>
                            )}
                          {/* Tạo mới bằng Modal (Giữ nguyên gốc) */}
                          <button
                            onClick={() => setShowCategoryModal(true)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <PlusCircle size={12} /> Tạo mới
                          </button>
                        </div>
                      </div>

                      {categoryMode === "select" ? (
                        <CategorySelector
                          categories={filterOptions.categories_advance || []}
                          value={formData.category_id}
                          onChange={(newId) =>
                            setFormData({
                              ...formData,
                              category_id: String(newId),
                            })
                          }
                          placeholder="Tìm hoặc chọn nhóm hàng..."
                          onCreateNew={() => setShowCategoryModal(true)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <input
                            autoFocus
                            value={tempCategoryName}
                            onChange={(e) =>
                              setTempCategoryName(e.target.value)
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSaveCategory()
                            }
                            className="flex-1 border border-blue-400 rounded px-3 py-2 text-sm outline-none ring-2 ring-blue-100"
                            placeholder="Tên nhóm..."
                          />
                          <button
                            onClick={handleSaveCategory}
                            disabled={isCategorySaving}
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {isCategorySaving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => setCategoryMode("select")}
                            className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* THƯƠNG HIỆU */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Thương hiệu
                        </label>
                        <div className="flex items-center gap-3">
                          {/* Sửa/Xóa Inline khi thương hiệu nhập vào đã tồn tại */}
                          {isExistingBrand && brandMode === "select" && (
                            <>
                              <button
                                onClick={handleOpenEditBrand}
                                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                title="Sửa"
                              >
                                <Edit size={12} /> Sửa
                              </button>
                              <button
                                onClick={handleDeleteBrand}
                                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                title="Xóa"
                              >
                                <Trash2 size={12} /> Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {brandMode === "select" ? (
                        <>
                          <input
                            name="brand"
                            value={formData.brand}
                            onChange={handleChange}
                            list="brand-suggestions"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Nhập hoặc chọn..."
                          />
                          <datalist id="brand-suggestions">
                            {filterOptions.brands?.map((b: any, i: number) => (
                              <option
                                key={i}
                                value={typeof b === "string" ? b : b.name}
                              />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <input
                            autoFocus
                            value={tempBrandName}
                            onChange={(e) => setTempBrandName(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSaveBrand()
                            }
                            className="flex-1 border border-blue-400 rounded px-3 py-2 text-sm outline-none ring-2 ring-blue-100"
                            placeholder="Tên thương hiệu..."
                          />
                          <button
                            onClick={handleSaveBrand}
                            disabled={isBrandSaving}
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {isBrandSaving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => setBrandMode("select")}
                            className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
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
                  <div className="grid grid-cols-3 gap-4 mt-3">
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
                    <div>
                      <div className="flex justify-between items-center mb-1">
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
                          {filterOptions.locations?.map((loc: any) => (
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

          {/* FOOTER */}
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
              <button
                disabled={isLoading}
                onClick={handleSubmit}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm flex items-center gap-2 transition-colors"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Lưu sản phẩm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- RENDER MODALS CON --- */}
      <CreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={() => fetchFilterOptions()}
      />

      <CreateWarehouseModal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        onSuccess={() => fetchFilterOptions()}
      />
    </>
  );
}
