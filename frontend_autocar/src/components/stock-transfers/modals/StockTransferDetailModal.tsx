/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Modal,
  Button,
  Table,
  Tag,
  message,
  InputNumber,
  Row,
  Col,
} from "antd";
import { useEffect, useState, useMemo } from "react";
import { Check, Printer, ArrowLeft, Save } from "lucide-react";
import { format, isValid } from "date-fns";
import { stockTransferService } from "../../../services/stockTransferService";

interface DetailModalProps {
  id: string;
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function StockTransferDetailModal({
  id,
  open,
  onCancel,
  onSuccess,
}: DetailModalProps) {
  const [data, setData] = useState<any>(null);
  // const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State lưu SL nhận đang nhập
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});

  useEffect(() => {
    if (id && open) fetchDetail();
  }, [id, open]);

  const fetchDetail = async () => {
    // setLoading(true);
    try {
      const res: any = await stockTransferService.getOne(id);
      const transferData = res?.data?.data || res;
      setData(transferData);

      // Init state SL nhận = 0 hoặc bằng SL chuyển (tuỳ logic, ở đây để 0 để bắt nhập)
      const initialReceive: Record<string, number> = {};
      transferData.stock_transfer_items?.forEach((item: any) => {
        // Nếu đã có received_qty thì lấy, ko thì để 0 hoặc item.quantity (gợi ý)
        initialReceive[item.id] = item.received_qty || item.quantity;
      });
      setReceiveItems(initialReceive);
    } catch (error) {
      console.error(error);
      message.error("Lỗi tải chi tiết phiếu");
    } finally {
      // setLoading(false);
    }
  };

  // Check xem đã nhập đủ hàng chưa
  const isFullyReceived = useMemo(() => {
    if (!data?.stock_transfer_items) return false;
    // Kiểm tra từng dòng: SL nhận >= SL chuyển
    return data.stock_transfer_items.every((item: any) => {
      const received = receiveItems[item.id] || 0;
      return received >= item.quantity;
    });
  }, [data, receiveItems]);

  // Handle thay đổi số lượng nhận
  const handleQuantityChange = (itemId: string, val: number | null) => {
    setReceiveItems((prev) => ({ ...prev, [itemId]: val || 0 }));
  };

  const handleSaveDraft = async () => {
    // Logic lưu tạm (nếu API hỗ trợ update received_qty mà chưa complete)
    // await stockTransferService.updateReceivedQty(id, receiveItems);
    message.success("Đã lưu tạm số lượng nhận!");
  };

  const handleReceive = async () => {
    if (!isFullyReceived) {
      return message.warning("Chưa nhập đủ số lượng nhận!");
    }

    setActionLoading(true);
    try {
      // Gửi kèm receiveItems nếu backend cần validate thực tế
      await stockTransferService.receive(id);
      message.success("Đã nhận hàng thành công!");
      onSuccess();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Lỗi khi nhận hàng");
    } finally {
      setActionLoading(false);
    }
  };

  const safeFormatDate = (dateStr: any) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    if (!isValid(date)) return "---";
    return format(date, "dd/MM/yyyy HH:mm");
  };

  if (!data) return null;

  const items = data.stock_transfer_items || [];
  const isPending = data.status === "pending";

  const columns = [
    {
      title: "STT",
      align: "center" as const,
      render: (_: any, __: any, idx: number) => idx + 1,
      width: 50,
    },
    {
      title: "Mã hàng",
      dataIndex: ["products", "sku"],
      render: (t: string) => (
        <span className="text-blue-600 font-medium">{t}</span>
      ),
    },
    { title: "Tên hàng", dataIndex: ["products", "name"] },
    { title: "ĐVT", dataIndex: ["products", "unit"], align: "center" as const },
    {
      title: "Tồn kho",
      align: "center" as const,
      render: () => <span className="text-gray-400">-</span>,
    },
    {
      title: "SL chuyển",
      dataIndex: "quantity",
      align: "center" as const,
      render: (v: number) => <b>{v}</b>,
    },
    {
      title: "SL nhận",
      align: "center" as const,
      width: 120,
      render: (_: any, r: any) =>
        isPending ? (
          <InputNumber
            min={0}
            max={r.quantity} // Chặn không cho nhận quá (tuỳ logic)
            value={receiveItems[r.id]}
            onChange={(val) => handleQuantityChange(r.id, val)}
            className={`w-20 font-bold text-center ${receiveItems[r.id] < r.quantity ? "border-red-400 text-red-600" : "border-green-400 text-green-600"}`}
          />
        ) : (
          <span className="font-bold text-green-600">
            {r.received_qty ?? r.quantity}
          </span>
        ),
    },
    {
      title: "Giá chuyển",
      dataIndex: "price",
      align: "right" as const,
      render: (v: number) => new Intl.NumberFormat("vi-VN").format(v || 0),
    },
    {
      title: "Thành tiền",
      align: "right" as const,
      render: (_: any, r: any) =>
        new Intl.NumberFormat("vi-VN").format(r.quantity * (r.price || 0)),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width="100vw"
      style={{ top: 0, padding: 0, maxWidth: "100vw", height: "100vh" }}
      footer={null}
      closable={false}
      bodyStyle={{
        height: "100vh",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#f0f2f5",
      }}
    >
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeft size={20} />}
            type="text"
            onClick={onCancel}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold m-0">{data.code}</h2>
              <Tag
                color={
                  isPending
                    ? "blue"
                    : data.status === "completed"
                      ? "green"
                      : "red"
                }
              >
                {isPending
                  ? "Đang chuyển"
                  : data.status === "completed"
                    ? "Đã nhận"
                    : "Đã hủy"}
              </Tag>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<Printer size={16} />}>In phiếu</Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* LEFT CONTENT */}
        <div className="flex-1 bg-white rounded shadow-sm border border-gray-200 overflow-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">Kiểm hàng</h3>
            <div className="text-sm">
              <span className="mr-4">
                Tổng SL:{" "}
                <b>{items.reduce((s: any, i: any) => s + i.quantity, 0)}</b>
              </span>
              <span
                className={`${isFullyReceived ? "text-green-600" : "text-red-500"}`}
              >
                Đã nhận:{" "}
                <b>{Object.values(receiveItems).reduce((a, b) => a + b, 0)}</b>
              </span>
            </div>
          </div>
          <Table
            columns={columns}
            dataSource={items}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
          />
        </div>

        {/* RIGHT SIDEBAR INFO */}
        <div className="w-[320px] bg-white rounded shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
            {/* Info Blocks */}
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Người tạo</span>
              <span className="font-medium">{data.profiles?.full_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Ngày chuyển</span>
              <span className="font-medium">
                {safeFormatDate(data.transfer_date)}
              </span>
            </div>

            <div className="py-2">
              <div className="text-gray-500 mb-1">Chi nhánh gửi</div>
              <div className="font-bold uppercase text-red-600 bg-red-50 p-2 rounded text-center border border-red-100">
                {
                  data.warehouses_stock_transfers_from_warehouse_idTowarehouses
                    ?.name
                }
              </div>
            </div>

            <div className="py-2">
              <div className="text-gray-500 mb-1">Chi nhánh nhận</div>
              <div className="font-bold uppercase text-green-600 bg-green-50 p-2 rounded text-center border border-green-100">
                {
                  data.warehouses_stock_transfers_to_warehouse_idTowarehouses
                    ?.name
                }
              </div>
            </div>

            <div className="mt-4">
              <span className="text-gray-500 block mb-1">Ghi chú</span>
              <div className="bg-gray-50 p-2 rounded border text-gray-600 italic min-h-[60px]">
                {data.note || "Không có ghi chú"}
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS (Giống hình mẫu) */}
          {isPending && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <Row gutter={10}>
                <Col span={10}>
                  <Button
                    block
                    size="large"
                    icon={<Save size={18} />}
                    className="bg-blue-600 text-white hover:bg-blue-700 border-none h-12 font-medium"
                    onClick={handleSaveDraft}
                  >
                    Lưu tạm
                  </Button>
                </Col>
                <Col span={14}>
                  <Button
                    block
                    type="primary"
                    size="large"
                    icon={<Check size={18} />}
                    className={`h-12 font-bold border-none shadow-md transition-all ${
                      isFullyReceived
                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!isFullyReceived} // Disable nếu chưa đủ
                    loading={actionLoading}
                    onClick={handleReceive}
                  >
                    Nhận hàng
                  </Button>
                </Col>
              </Row>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
