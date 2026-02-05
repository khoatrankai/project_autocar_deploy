/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { productService } from "../../../services/productService";
import { toast } from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Giả sử Enum WarehouseType
const WAREHOUSE_TYPES = [
  { value: "main", label: "Kho Tổng" },
  { value: "branch", label: "Chi nhánh" },
];

export default function CreateWarehouseModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({ name: "", type: "MAIN", address: "" });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.name) return toast.error("Nhập tên kho");

    setLoading(true);
    try {
      await productService.createWarehouse(form);
      toast.success("Tạo kho thành công!");
      onSuccess();
      setForm({ name: "", type: "MAIN", address: "" });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi tạo kho");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-[500px] rounded-lg shadow-xl p-6 animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Tạo Kho / Vị trí Mới</h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-500 hover:text-red-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên kho
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="VD: Kho Tổng TP.HCM"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại kho
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {WAREHOUSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="VD: 123 QL1A..."
            />
          </div>

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full mt-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
