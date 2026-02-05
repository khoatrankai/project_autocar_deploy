/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { productService } from "../../../services/productService";
import { toast } from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Để reload lại list danh mục bên ngoài
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhóm hàng");
      return;
    }

    setLoading(true);
    try {
      await productService.createCategory({ name });
      toast.success("Tạo nhóm hàng thành công!");
      onSuccess(); // Refresh list
      setName("");
      onClose();
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên nhóm hàng
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="VD: Hệ thống gầm"
              autoFocus
            />
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
