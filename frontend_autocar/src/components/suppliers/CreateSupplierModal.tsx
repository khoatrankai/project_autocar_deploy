/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Loader2, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSupplierStore } from "../../store/useSupplierStore";
import { supplierService } from "../../services/supplierService";
import { toast } from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const initialFormState = {
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  group_name: "", // Input + Datalist
  status: "active",
  current_debt: 0, // Nợ đầu kỳ
  notes: "",
};

export default function CreateSupplierModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions, fetchFilterOptions } = useSupplierStore();

  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);

  // Load danh sách nhóm khi mở modal để gợi ý
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      fetchFilterOptions();
    }
  }, [isOpen, fetchFilterOptions]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.name) {
      toast.error("Vui lòng nhập tên nhà cung cấp");
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API tạo mới
      await supplierService.create(formData);

      toast.success("Thêm nhà cung cấp thành công!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg[0] : msg || "Lỗi khi tạo nhà cung cấp",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Thêm nhà cung cấp</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-4">
            {/* Block 1: Thông tin chung */}
            <div className="bg-white p-4 rounded shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2 mb-2">
                Thông tin chung
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã NCC
                  </label>
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Mã tự động"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên NCC <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="VD: Công ty TNHH A"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* NHÓM NHÀ CUNG CẤP (INPUT + DATALIST) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Nhóm NCC
                    </label>
                    {/* Nút giả lập tạo mới (thực tế nhập vào input là tạo rồi) */}
                    <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-default">
                      <PlusCircle size={12} /> Nhập mới để tạo
                    </button>
                  </div>
                  <input
                    name="group_name"
                    value={formData.group_name}
                    onChange={handleChange}
                    list="group-suggestions"
                    placeholder="Chọn hoặc nhập nhóm mới"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <datalist id="group-suggestions">
                    {filterOptions.groups.map((g, idx) => (
                      <option key={idx} value={g} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white outline-none"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ
                </label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Block 2: Thông tin tài chính */}
            <div className="bg-white p-4 rounded shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-800 border-b pb-2 mb-2">
                Tài chính & Ghi chú
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nợ đầu kỳ
                  </label>
                  <input
                    name="current_debt"
                    type="number"
                    value={formData.current_debt}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-medium text-sm hover:bg-gray-50"
          >
            Bỏ qua
          </button>
          <button
            disabled={isLoading}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm flex items-center gap-2 disabled:opacity-70"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
