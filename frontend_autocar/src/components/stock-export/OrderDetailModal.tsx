/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  X,
  Loader2,
  Printer,
  MapPin,
  User,
  Calendar,
  Phone,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "antd";
import { format } from "date-fns";
import { orderService } from "../../services/orderService";

interface Props {
  isOpen: boolean;
  orderId: string | number | null;
  onClose: () => void;
}

export default function OrderDetailModal({ isOpen, orderId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    } else {
      setData(null);
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      const res: any = await orderService.getDetail(orderId as string);
      setData(res?.data || res);
    } catch (error) {
      console.error(error);
      toast.error("Không tải được chi tiết đơn hàng");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Modal open={isOpen} footer={null} closable={false} centered width={800}>
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">
            Đang tải chi tiết hóa đơn...
          </p>
        </div>
      </Modal>
    );
  }

  if (!data) return null;

  const totalAmount = Number(data.total_amount) || 0;
  const discount = Number(data.discount) || 0;
  const finalAmount = Number(data.final_amount) || 0;
  const paidAmount = Number(data.paid_amount) || 0;
  const debt = Math.max(0, finalAmount - paidAmount);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={900}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0, borderRadius: "8px", overflow: "hidden" }}
    >
      <div className="bg-white flex flex-col max-h-[90vh]">
        {/* --- HEADER --- */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-xl font-bold m-0 flex items-center gap-2">
              <FileText size={24} /> Chi tiết đơn hàng: {data.code}
            </h2>
            <p className="text-blue-100 text-sm mt-1 mb-0">
              Trạng thái:{" "}
              <span className="font-bold text-white uppercase bg-white/20 px-2 py-0.5 rounded text-xs ml-1">
                {data.status === "completed"
                  ? "Đã thanh toán"
                  : data.status === "debt"
                    ? "Ghi nợ"
                    : "Đã hủy"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-50 transition-colors shadow-sm text-sm">
              <Printer size={16} /> In hóa đơn
            </button>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white bg-blue-700/50 hover:bg-blue-700 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {/* --- THÔNG TIN CHUNG --- */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} /> Khách hàng
              </h3>
              <p className="font-bold text-lg text-gray-800 mb-1">
                {data.partners?.name || "Khách lẻ"}
              </p>
              {data.partners?.phone && (
                <p className="text-gray-600 text-sm flex items-center gap-1.5">
                  <Phone size={14} /> {data.partners.phone}
                </p>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-2.5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Thông tin xuất kho
              </h3>
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <Calendar size={15} className="text-gray-400" />
                <span className="w-20 text-gray-500">Ngày bán:</span>
                <span className="font-medium">
                  {format(new Date(data.created_at), "dd/MM/yyyy HH:mm")}
                </span>
              </p>
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <MapPin size={15} className="text-gray-400" />
                <span className="w-20 text-gray-500">Chi nhánh:</span>
                <span className="font-medium">
                  {data.warehouses?.name || "---"}
                </span>
              </p>
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <User size={15} className="text-gray-400" />
                <span className="w-20 text-gray-500">Người bán:</span>
                <span className="font-medium">
                  {data.profiles?.full_name || "---"}
                </span>
              </p>
            </div>
          </div>

          {/* --- BẢNG SẢN PHẨM --- */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Mã hàng</th>
                  <th className="p-3">Tên sản phẩm</th>
                  <th className="p-3 text-center">ĐVT</th>
                  <th className="p-3 text-center">SL</th>
                  <th className="p-3 text-right">Đơn giá</th>
                  <th className="p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.order_items?.map((item: any, idx: number) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-medium text-blue-600">
                      {item.products?.sku || item.product_sku}
                    </td>
                    <td className="p-3 text-gray-800 font-medium">
                      {item.products?.name || item.product_name}
                    </td>
                    <td className="p-3 text-center text-gray-600">
                      {item.products?.unit || "Cái"}
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="p-3 text-right text-gray-600">
                      {Number(item.price).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">
                      {(item.quantity * item.price).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- TỔNG KẾT & GHI CHÚ --- */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Ghi chú đơn hàng
              </h3>
              <p className="text-sm text-gray-700 italic">
                {data.note || "Không có ghi chú."}
              </p>
            </div>

            <div className="w-full md:w-80 bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tổng tiền hàng:</span>
                <span className="font-bold text-gray-800">
                  {totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Giảm giá:</span>
                <span className="font-medium text-gray-800">
                  {discount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between items-center">
                <span className="text-gray-700 font-bold uppercase text-xs">
                  Khách cần trả:
                </span>
                <span className="font-black text-xl text-blue-600">
                  {finalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Đã thanh toán:</span>
                <span className="font-bold text-green-600">
                  {paidAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>

              {debt > 0 && (
                <div className="flex justify-between text-sm bg-red-50 p-2 rounded border border-red-100 mt-2">
                  <span className="text-red-600 font-bold">Còn nợ:</span>
                  <span className="font-black text-red-600">
                    {debt.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
