/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Loader2,
  X,
  User,
  Calendar,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Import service của bạn
import { returnService } from "../../../services/returnService";

interface Props {
  returnId: string | number;
  onClose: () => void;
}

export default function ReturnDetailPanel({ returnId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (returnId) {
      fetchDetail();
    }
  }, [returnId]);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      // Giả sử service của bạn có hàm getDetail
      const res: any = await returnService.getOne(returnId as string);
      setData(res?.data?.data || res?.data || res);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải chi tiết phiếu trả");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center text-blue-600 gap-2 bg-blue-50/30">
        <Loader2 className="animate-spin" /> Đang tải thông tin chi tiết...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500">
        Không tìm thấy dữ liệu
      </div>
    );
  }

  // Xử lý mảng items tùy theo Backend trả về (có thể là items hoặc return_items)
  const itemsList = data.items || data.return_items || [];

  return (
    <div className="bg-blue-50/30 p-6 border-t border-b border-blue-100 relative animate-in fade-in slide-in-from-top-2 duration-200 shadow-inner">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full p-1 transition-colors"
      >
        <X size={20} />
      </button>

      {/* HEADER INFO */}
      <div className="flex flex-wrap gap-x-8 gap-y-4 mb-6 pb-4 border-b border-dashed border-blue-200">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
            <FileText size={14} /> Mã phiếu
          </span>
          <span className="font-bold text-blue-700 text-lg">{data.code}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
            <User size={14} /> Khách hàng
          </span>
          <span className="font-semibold text-gray-800">
            {data.partners?.name || "Khách lẻ"}
          </span>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
            <Calendar size={14} /> Ngày tạo
          </span>
          <span className="font-medium text-gray-700">
            {data.created_at
              ? format(new Date(data.created_at), "dd/MM/yyyy HH:mm")
              : "---"}
          </span>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-1">
            <CheckCircle2 size={14} /> Trạng thái
          </span>
          <span className="font-bold text-green-600">
            {data.status === "completed" ? "Đã hoàn tất" : data.status}
          </span>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3">Mã hàng (SKU)</th>
              <th className="p-3">Tên sản phẩm</th>
              <th className="p-3 text-center">Số lượng</th>
              <th className="p-3 text-right">Giá hoàn lại</th>
              <th className="p-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itemsList.length > 0 ? (
              itemsList.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                  <td className="p-3 font-medium text-blue-600">
                    {item.products?.sku || item.product_sku || "---"}
                  </td>
                  <td className="p-3 text-gray-800 font-medium">
                    {item.products?.name || item.product_name || "---"}
                  </td>
                  <td className="p-3 text-center font-bold text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {Number(item.refund_price).toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">
                    {(
                      Number(item.quantity) * Number(item.refund_price)
                    ).toLocaleString("vi-VN")}{" "}
                    ₫
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  Không có sản phẩm nào trong phiếu này
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="mt-4 flex justify-between items-start">
        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm max-w-sm w-full">
          <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
            Lý do trả hàng
          </span>
          <p className="text-sm text-gray-700 italic">
            {data.reason || "Không có lý do."}
          </p>
        </div>

        <div className="bg-white p-4 rounded border border-gray-200 shadow-sm min-w-[250px]">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-gray-600">Tổng tiền hoàn cho khách:</span>
            <span className="text-xl text-red-600">
              {Number(data.total_refund || 0).toLocaleString("vi-VN")} ₫
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
