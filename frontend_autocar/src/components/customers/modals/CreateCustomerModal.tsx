/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Loader2, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

// Import Service & Store
import { customerService } from "../../../services/customerService";
import { useCustomerStore } from "../../../store/useCustomerStore";

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
  group_name: "",
  type: "customer",
  status: "active",
  //   current_debt: 0,
  notes: "",
  //   gender: "male",
  //   birthday: "",
};

export default function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  // 1. Lấy dữ liệu từ Store
  const { filterOptions, fetchFilterOptions } = useCustomerStore();

  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);

  // 2. Load danh sách nhóm khi mở modal
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormState);
      fetchFilterOptions(); // Gọi API lấy danh sách nhóm khách hàng
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
    if (!formData.name) return toast.error("Vui lòng nhập tên khách hàng");
    if (!formData.phone) return toast.error("Vui lòng nhập số điện thoại");

    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        notes: `${formData.notes}`.trim(),
      };

      await customerService.create(payload);

      toast.success("Thêm khách hàng thành công!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg[0] : msg || "Lỗi khi tạo khách hàng",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold text-gray-800">Thêm khách hàng</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex gap-6">
            {/* LEFT COLUMN */}
            <div className="w-1/3 space-y-4">
              {/* <div className="bg-white p-4 rounded shadow-sm text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-gray-400">
                  IMG
                </div>
                <button className="text-sm text-blue-600 font-medium hover:underline">
                  Chọn ảnh
                </button>
              </div> */}

              <div className="bg-white p-4 rounded shadow-sm space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Mã khách hàng
                  </label>
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Mã mặc định"
                    className="w-full border-b border-gray-200 py-1.5 text-sm outline-none focus:border-blue-500 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                    Loại khách
                  </label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="customer"
                        checked={formData.type === "customer"}
                        onChange={handleChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Cá nhân</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="company"
                        checked={formData.type === "company"}
                        onChange={handleChange}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Công ty</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex-1 space-y-4">
              <div className="bg-white p-5 rounded shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên khách hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      autoFocus
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Điện thoại <span className="text-red-500">*</span>
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Số nhà, đường, phường/xã..."
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Nhóm khách hàng
                      </label>
                      <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-default">
                        <PlusCircle size={12} /> Tạo mới
                      </button>
                    </div>
                    <input
                      name="group_name"
                      value={formData.group_name}
                      onChange={handleChange}
                      list="group-suggestions"
                      placeholder="Chọn hoặc nhập nhóm"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    {/* 3. Render danh sách nhóm từ Store */}
                    <datalist id="group-suggestions">
                      {filterOptions.groups?.map((group, idx) => (
                        <option key={idx} value={group} />
                      ))}
                    </datalist>
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày sinh
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        name="birthday"
                        value={formData.birthday}
                        onChange={handleChange}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center gap-2 border border-gray-300 rounded px-2 bg-gray-50">
                        <label className="cursor-pointer text-sm flex items-center gap-1">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === "male"}
                            onChange={handleChange}
                          />{" "}
                          Nam
                        </label>
                        <label className="cursor-pointer text-sm flex items-center gap-1">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={formData.gender === "female"}
                            onChange={handleChange}
                          />{" "}
                          Nữ
                        </label>
                      </div>
                    </div>
                  </div> */}

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nợ hiện tại
                    </label>
                    <input
                      name="current_debt"
                      type="number"
                      value={formData.current_debt}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div> */}
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
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm flex items-center gap-2 disabled:opacity-70 shadow-sm"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
