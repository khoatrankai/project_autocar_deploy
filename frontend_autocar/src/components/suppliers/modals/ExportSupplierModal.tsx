import { useState } from "react";
import { X, FileDown, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import { supplierService } from "../../../services/supplierService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Các cột cho phép lựa chọn (Key phải khớp với Backend COLUMN_DEFINITIONS)
const EXPORT_OPTIONS = [
  { id: "code", label: "Mã NCC" },
  { id: "name", label: "Tên nhà cung cấp" },
  { id: "group_name", label: "Nhóm NCC" },
  { id: "phone", label: "Điện thoại" },
  { id: "email", label: "Email" },
  { id: "address", label: "Địa chỉ" },
  { id: "current_debt", label: "Nợ hiện tại" },
  { id: "total_revenue", label: "Tổng mua" },
  { id: "status", label: "Trạng thái" },
  { id: "notes", label: "Ghi chú" },
  { id: "created_at", label: "Ngày tạo" },
];

export default function ExportSupplierModal({ isOpen, onClose }: Props) {
  // Mặc định chọn tất cả
  const [selectedCols, setSelectedCols] = useState<string[]>(
    EXPORT_OPTIONS.map((o) => o.id),
  );
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const toggleCol = (id: string) => {
    setSelectedCols((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedCols.length === EXPORT_OPTIONS.length) {
      setSelectedCols([]);
    } else {
      setSelectedCols(EXPORT_OPTIONS.map((o) => o.id));
    }
  };

  const handleExport = async () => {
    if (selectedCols.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 cột");
      return;
    }

    setIsLoading(true);
    try {
      const blob = await supplierService.exportData(selectedCols);

      // Tạo link tải xuống
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `suppliers_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success("Xuất file thành công!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi xuất file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-lg shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <FileDown className="text-blue-600" size={20} />
            Xuất Excel Nhà Cung Cấp
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              Chọn các cột cần xuất:
            </span>
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {selectedCols.length === EXPORT_OPTIONS.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {EXPORT_OPTIONS.map((option) => {
              const isChecked = selectedCols.includes(option.id);
              return (
                <div
                  key={option.id}
                  onClick={() => toggleCol(option.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded border cursor-pointer transition-all select-none
                    ${isChecked ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}
                  `}
                >
                  {isChecked ? (
                    <CheckSquare size={20} className="text-blue-600" />
                  ) : (
                    <Square size={20} className="text-gray-400" />
                  )}
                  <span
                    className={`text-sm ${isChecked ? "font-medium text-gray-900" : "text-gray-600"}`}
                  >
                    {option.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-medium text-sm hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Xuất file
          </button>
        </div>
      </div>
    </div>
  );
}
