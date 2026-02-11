/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { productService } from "../../../services/productService";
import { toast } from "react-hot-toast";
import { useProductStore } from "../../../store/useProductStore"; // Import Store
import CategorySelector from "../../shared/CategorySelector";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  // Lấy danh sách cây category từ store
  const { filterOptions, fetchFilterOptions } = useProductStore();

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | number | null>(null); // State lưu category cha
  const [loading, setLoading] = useState(false);

  // Đảm bảo load dữ liệu nếu store đang rỗng
  useEffect(() => {
    if (isOpen && filterOptions.categories_advance.length === 0) {
      fetchFilterOptions();
    }
  }, [isOpen, fetchFilterOptions, filterOptions.categories_advance.length]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhóm hàng");
      return;
    }

    setLoading(true);
    try {
      // Gửi payload gồm tên và parent_id
      await productService.createCategory({
        name,
        parent_id: Number(parentId), // Backend cần xử lý trường này
      });

      toast.success("Tạo nhóm hàng thành công!");
      onSuccess();

      // Reset form
      setName("");
      setParentId(null);
      onClose();

      // Reload lại store để cập nhật danh sách mới ngay lập tức
      fetchFilterOptions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo nhóm hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-96 rounded-lg shadow-xl p-6 animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Tạo Nhóm Hàng Mới</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-500 hover:text-red-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 1. Nhập Tên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên nhóm hàng <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="VD: Lọc gió"
              autoFocus
            />
          </div>

          {/* 2. Chọn Nhóm Cha (Sử dụng CategorySelector mới) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thuộc nhóm (Cha)
            </label>
            <CategorySelector
              categories={filterOptions.categories_advance} // Truyền cây dữ liệu
              value={parentId}
              onChange={(val: any) => setParentId(val)}
              placeholder="-- Là nhóm gốc --"
              allowClear={true} // Cho phép chọn lại làm nhóm gốc
              className="w-full"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Để trống nếu là nhóm hàng cấp cao nhất
            </p>
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center items-center gap-2 mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
