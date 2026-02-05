/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react"; // Thêm useMemo
import { format, isValid } from "date-fns";
import {
  Loader2,
  User,
  MapPin,
  ArrowRight,
  Printer,
  Search,
  Save,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";
import { Table, Button, Input, Tag, message } from "antd";
import { stockTransferService } from "../../../services/stockTransferService";

interface Props {
  transferId: string;
  onClose?: () => void;
  onOpenModal?: () => void;
}

export default function StockTransferDetailPanel({
  transferId,
  onClose,
  onOpenModal,
}: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Thêm state lưu từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res: any = await stockTransferService.getOne(transferId);
        setData(res?.data?.data || res); // Fallback nếu cấu trúc response khác
      } catch (error) {
        console.error(error);
        message.error("Không tải được chi tiết phiếu");
      } finally {
        setLoading(false);
      }
    };

    if (transferId) fetchDetail();
  }, [transferId]);

  // --- LOGIC LỌC SẢN PHẨM (Client-side) ---
  const filteredItems = useMemo(() => {
    const items = data?.stock_transfer_items || [];
    if (!searchTerm.trim()) return items;

    const lowerTerm = searchTerm.toLowerCase().trim();
    return items.filter((item: any) => {
      const sku = item.products?.sku?.toLowerCase() || "";
      const name = item.products?.name?.toLowerCase() || "";
      return sku.includes(lowerTerm) || name.includes(lowerTerm);
    });
  }, [data, searchTerm]);

  const safeFormatDate = (dateStr: any) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    if (!isValid(date)) return "---";
    return format(date, "dd/MM/yyyy HH:mm");
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center text-blue-600 gap-2">
        <Loader2 className="animate-spin" /> Đang tải thông tin chi tiết...
      </div>
    );
  }

  if (!data)
    return <div className="p-4 text-red-500">Không tìm thấy dữ liệu</div>;

  const detailColumns = [
    {
      title: "Mã hàng",
      dataIndex: ["products", "sku"],
      render: (t: string) => (
        <span className="text-blue-600 font-medium">{t}</span>
      ),
    },
    { title: "Tên hàng", dataIndex: ["products", "name"], width: "40%" },
    { title: "ĐVT", dataIndex: ["products", "unit"], align: "center" as const },
    {
      title: "SL chuyển",
      dataIndex: "quantity",
      align: "center" as const,
      render: (val: number) => (
        <span className="font-bold text-gray-800">{val}</span>
      ),
    },
    {
      title: "Giá chuyển",
      dataIndex: "price",
      align: "right" as const,
      render: (val: number) => new Intl.NumberFormat("vi-VN").format(val || 0),
    },
    {
      title: "Thành tiền",
      align: "right" as const,
      render: (_: any, r: any) => (
        <span className="font-bold">
          {new Intl.NumberFormat("vi-VN").format(
            (r.quantity || 0) * (r.price || 0),
          )}
        </span>
      ),
    },
  ];

  // Tính tổng dựa trên toàn bộ dữ liệu (không bị ảnh hưởng bởi search)
  const totalQty =
    data.stock_transfer_items?.reduce(
      (acc: number, item: any) => acc + Number(item.quantity),
      0,
    ) || 0;
  const totalVal =
    data.stock_transfer_items?.reduce(
      (acc: number, item: any) =>
        acc + Number(item.quantity) * Number(item.price || 0),
      0,
    ) || 0;

  return (
    <div className="bg-gray-50 p-6 border-t border-b border-blue-100 shadow-inner relative animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
      >
        <X size={20} />
      </button>

      {/* HEADER INFO */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-xl font-bold text-gray-800 m-0">{data.code}</h3>
          <Tag
            color={
              data.status === "pending"
                ? "blue"
                : data.status === "completed"
                  ? "green"
                  : "red"
            }
          >
            {data.status === "pending"
              ? "Đang chuyển"
              : data.status === "completed"
                ? "Đã nhận"
                : "Đã hủy"}
          </Tag>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <User size={14} /> Người tạo:{" "}
            <b className="text-gray-800 uppercase">
              {data.profiles?.full_name || "---"}
            </b>
          </span>
          <span className="text-gray-400">|</span>
          <span>Ngày tạo: {safeFormatDate(data.transfer_date)}</span>
        </div>
      </div>

      {/* ROUTE INFO */}
      <div className="flex gap-8 mb-6">
        <div className="flex-1 bg-white p-4 rounded border border-gray-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="text-xs text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
            <MapPin size={12} /> Chuyển từ
          </div>
          <div className="text-lg font-bold text-gray-800 uppercase">
            {data.warehouses_stock_transfers_from_warehouse_idTowarehouses
              ?.name || "---"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {safeFormatDate(data.transfer_date)}
          </div>
        </div>

        <div className="flex items-center justify-center text-gray-300">
          <ArrowRight size={32} strokeWidth={1.5} />
        </div>

        <div className="flex-1 bg-white p-4 rounded border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <div className="text-xs text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
            <MapPin size={12} /> Chuyển đến
          </div>
          <div className="text-lg font-bold text-gray-800 uppercase">
            {data.warehouses_stock_transfers_to_warehouse_idTowarehouses
              ?.name || "---"}
          </div>
        </div>
      </div>

      {/* ITEMS TABLE & SUMMARY */}
      <div className="flex gap-6">
        {/* LEFT: TABLE */}
        <div className="flex-1">
          <div className="bg-white rounded border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3 gap-1">
              {/* 2. Binding Input với state searchTerm */}
              <Input
                prefix={<Search size={14} />}
                placeholder="Tìm hàng hóa trong phiếu..."
                className="min-w-64"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
              <span className="text-xs text-gray-500 text-nowrap">
                Tổng số mặt hàng:{" "}
                <b className="text-nowrap">
                  {/* Hiển thị số lượng sau khi lọc / tổng số */}
                  {filteredItems.length}/
                  {data.stock_transfer_items?.length || 0}
                </b>
              </span>
            </div>
            {/* 3. Truyền filteredItems vào Table */}
            <Table
              columns={detailColumns}
              dataSource={filteredItems}
              pagination={false}
              size="small"
              rowKey="id"
              className="detail-table"
              bordered
              locale={{ emptyText: "Không tìm thấy sản phẩm" }}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold text-gray-700 mb-1 block">
              Ghi chú
            </label>
            <div className="bg-white border border-gray-200 p-3 rounded text-gray-600 min-h-[60px] text-sm">
              {data.note || "Không có ghi chú"}
            </div>
          </div>
        </div>

        {/* RIGHT: TOTALS & ACTIONS */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-white rounded border border-gray-200 p-4 shadow-sm">
            <div className="flex justify-between mb-3 text-sm">
              <span className="text-gray-600">Tổng SL chuyển</span>
              <span className="font-bold text-lg">{totalQty}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-bold">Giá trị chuyển</span>
              <span className="text-xl font-bold text-blue-600">
                {new Intl.NumberFormat("vi-VN").format(totalVal)}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col gap-2">
            <Button
              block
              icon={<ExternalLink size={16} />}
              className="h-10 font-medium text-blue-600 border-blue-600"
              onClick={onOpenModal}
            >
              Mở phiếu chi tiết
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button icon={<Printer size={16} />}>In phiếu</Button>
              <Button icon={<Copy size={16} />}>Sao chép</Button>
            </div>
            {data.status === "pending" && (
              <Button
                type="primary"
                block
                className="h-10 bg-green-600 hover:bg-green-700 font-bold border-none"
                icon={<Save size={16} />}
              >
                Nhận hàng
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
