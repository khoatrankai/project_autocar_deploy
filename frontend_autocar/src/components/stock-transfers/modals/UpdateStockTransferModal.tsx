/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Button,
  Table,
  message,
  Input,
  Row,
  Col,
} from "antd";
import { useEffect, useState, useMemo } from "react";
import {
  Trash2,
  Search,
  ArrowLeft,
  User,
  Calendar,
  Save,
  Loader2,
} from "lucide-react";
import { stockTransferService } from "../../../services/stockTransferService";
import { productService } from "../../../services/productService";
import dayjs from "dayjs";
import { useProductStore } from "../../../store/useProductStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { usePurchaseOrderStore } from "../../../store/usePurchaseOrderStore";
import { useManagerStore } from "../../../store/useManager";

interface UpdateModalProps {
  open: boolean;
  transferId: number | string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function UpdateStockTransferModal({
  open,
  transferId,
  onCancel,
  onSuccess,
}: UpdateModalProps) {
  const [form] = Form.useForm();

  // Stores
  const { user } = useAuthStore();
  const { filterOptions } = useProductStore();
  const { filterOptions: filterPurchase } = usePurchaseOrderStore();
  const { warehouse_manager } = useManagerStore();

  // Local State
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [valueSearch, setValueSearch] = useState("");
  const [status, setStatus] = useState<string>("pending"); // Lưu trạng thái phiếu

  // State UI
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | null>(
    null,
  );

  // --- 1. FETCH DỮ LIỆU CŨ ---
  useEffect(() => {
    if (open && transferId) {
      fetchTransferDetail();
    } else {
      form.resetFields();
      setItems([]);
    }
  }, [open, transferId]);

  const fetchTransferDetail = async () => {
    setLoadingFetch(true);
    try {
      const res: any = await stockTransferService.getOne(transferId as string);
      const data = res?.data?.data || res;

      setStatus(data.status);

      // Đẩy dữ liệu vào form
      form.setFieldsValue({
        code: data.code,
        created_at: dayjs(data.transfer_date),
        from_warehouse_id: Number(data.from_warehouse_id),
        to_warehouse_id: Number(data.to_warehouse_id),
        staff_id: data.staff_id,
        status:
          data.status === "pending"
            ? "Đang chuyển"
            : data.status === "draft"
              ? "Lưu nháp"
              : data.status,
        note: data.note,
      });

      setSourceWarehouseId(Number(data.from_warehouse_id));

      // Map lại mảng items từ backend sang định dạng của bảng UI
      if (data.stock_transfer_items && data.stock_transfer_items.length > 0) {
        const mappedItems = data.stock_transfer_items.map((item: any) => ({
          product_id: item.product_id,
          sku: item.products?.sku,
          name: item.products?.name,
          unit: item.products?.unit || "Cái",
          // Mẹo: Cần tồn kho để validate InputNumber max. Ở đây tạm lấy từ product.
          current_stock: (item.products?.total_quantity || 0) + item.quantity,
          quantity: item.quantity,
          price: Number(item.price || item.products?.cost_price || 0),
        }));
        setItems(mappedItems);
      }
    } catch (error) {
      console.error(error);
      message.error("Không thể tải chi tiết phiếu chuyển");
      onCancel();
    } finally {
      setLoadingFetch(false);
    }
  };

  // Tính tổng
  const { totalQuantity, totalAmount } = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        totalQuantity: acc.totalQuantity + (item.quantity || 0),
        totalAmount: acc.totalAmount + (item.quantity || 0) * (item.price || 0),
      }),
      { totalQuantity: 0, totalAmount: 0 },
    );
  }, [items]);

  // --- 2. HANDLERS SẢN PHẨM ---
  const handleSearchProduct = async (value: string) => {
    if (!value) return;
    try {
      const locId =
        form.getFieldValue("from_warehouse_id") || warehouse_manager;
      const res: any = await productService.getProducts({
        search: value,
        limit: 10,
        page: 1,
        locationIds: locId ? [locId] : undefined,
      });
      setValueSearch(value);
      setProducts(res.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existItem = items.find((i) => i.product_id === productId);
    if (existItem) {
      handleUpdateQuantity(items.indexOf(existItem), existItem.quantity + 1);
      message.success("Đã tăng số lượng");
      return;
    }

    const newItem = {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit || "Cái",
      current_stock: product.total_quantity || 0,
      quantity: 1,
      price: Number(product.cost_price || 0),
    };

    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateQuantity = (index: number, val: number) => {
    const newItems = [...items];
    newItems[index].quantity = val;
    setItems(newItems);
  };

  // --- 3. SUBMIT FORM ---
  const handleSubmit = async () => {
    if (status !== "pending" && status !== "draft") {
      message.error(
        "Chỉ có thể sửa phiếu ở trạng thái Đang chuyển hoặc Lưu nháp",
      );
      return;
    }

    if (items.length === 0) {
      message.error("Vui lòng chọn ít nhất 1 sản phẩm!");
      return;
    }

    try {
      const values = await form.validateFields();

      if (values.from_warehouse_id === values.to_warehouse_id) {
        message.error("Kho nhận phải khác kho gửi!");
        return;
      }

      setSubmitting(true);

      // Map đúng DTO: UpdateTransferDto (Bao gồm danh sách items mới)
      const payload = {
        from_warehouse_id: values.from_warehouse_id || sourceWarehouseId,
        to_warehouse_id: values.to_warehouse_id,
        staff_id: values.staff_id,
        note: values.note,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      };

      // Gọi API Update (Service bạn vừa tạo có nhận thêm tham số userId)
      await stockTransferService.update(
        transferId as string,
        payload,
        user?.id as string,
      );

      message.success("Cập nhật phiếu chuyển thành công!");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      message.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Nếu from_warehouse đổi, bạn có thể trigger load lại search nếu cần
  useEffect(() => {
    if (form.getFieldValue("from_warehouse_id") && valueSearch) {
      handleSearchProduct(valueSearch);
    }
  }, [form.getFieldValue("from_warehouse_id")]);

  // --- COLUMNS ---
  const columns = [
    {
      title: "#",
      width: 50,
      align: "center" as const,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: "Mã hàng",
      dataIndex: "sku",
      render: (t: string) => (
        <span className="text-blue-600 font-medium">{t}</span>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "name",
      render: (t: string) => (
        <span className="font-medium text-gray-800">{t}</span>
      ),
    },
    { title: "ĐVT", dataIndex: "unit", align: "center" as const, width: 80 },
    {
      title: "Tồn kho",
      dataIndex: "current_stock",
      align: "center" as const,
      width: 100,
      render: (val: number) => (
        <span className="font-bold text-gray-600">{val}</span>
      ),
    },
    {
      title: "SL chuyển",
      width: 120,
      render: (_: any, r: any, idx: number) => (
        <InputNumber
          min={1}
          max={r.current_stock > 0 ? r.current_stock : undefined}
          value={r.quantity}
          onChange={(val) => handleUpdateQuantity(idx, val || 1)}
          className="w-full font-bold text-blue-700 border-blue-300"
        />
      ),
    },
    {
      title: "Thành tiền",
      align: "right" as const,
      width: 120,
      render: (_: any, r: any) => (
        <span className="font-bold text-gray-800">
          {new Intl.NumberFormat("vi-VN").format(r.quantity * r.price)}
        </span>
      ),
    },
    {
      width: 50,
      align: "center" as const,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          danger
          icon={<Trash2 size={18} />}
          onClick={() => handleRemoveItem(idx)}
        />
      ),
    },
  ];

  if (loadingFetch) {
    return (
      <Modal
        open={open}
        footer={null}
        closable={false}
        className="full-screen-modal p-0"
        width="100vw"
      >
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 flex-col gap-3">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">
            Đang tải dữ liệu phiếu chuyển...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width="100vw"
      style={{ top: 0, padding: 0, maxWidth: "100vw", height: "100vh" }}
      footer={null}
      closable={false}
      className="full-screen-modal p-0"
      bodyStyle={{
        height: "100vh",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER BLUE */}
      <div className="bg-[#0070f3] h-14 flex items-center justify-between px-4 text-white flex-shrink-0 shadow-md">
        <div className="flex items-center gap-4 flex-1">
          <Button
            type="text"
            icon={<ArrowLeft size={24} className="text-white" />}
            onClick={onCancel}
            className="hover:bg-white/20"
          />
          <h2 className="text-xl font-bold m-0 text-white tracking-wide">
            Cập nhật phiếu chuyển
          </h2>

          {/* SEARCH BAR BIG */}
          <div className="w-[500px] ml-4">
            <Select
              showSearch
              value={null}
              searchValue={valueSearch}
              onSearch={handleSearchProduct}
              onSelect={handleSelectProduct as any}
              placeholder="Tìm thêm hàng hóa vào phiếu..."
              defaultActiveFirstOption={false}
              filterOption={false}
              notFoundContent={null}
              options={products.map((p) => ({
                value: p.id,
                label: (
                  <div className="flex justify-between items-center py-1">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-400 text-xs ml-2 bg-gray-100 px-1 rounded">
                      {p.sku}
                    </span>
                  </div>
                ),
              }))}
              className="w-full"
              size="large"
              suffixIcon={<Search size={18} className="text-gray-400" />}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {/* TỪ KHO */}
          <div className="flex items-center bg-white/10 rounded-md px-3 py-1.5 border border-white/20 backdrop-blur-sm">
            <span className="mr-2 opacity-90 font-medium">Từ kho:</span>
            <Form component={false} form={form}>
              <Form.Item name="from_warehouse_id" noStyle>
                <Select
                  variant="borderless"
                  className="text-white min-w-[140px] select-header-white font-bold"
                  dropdownStyle={{ minWidth: 200 }}
                  popupMatchSelectWidth={false}
                  options={filterOptions?.locations?.map((l: any) => ({
                    value: Number(l.id),
                    label: l.name,
                  }))}
                  onChange={(val) => {
                    setSourceWarehouseId(val);
                    form.setFieldsValue({ from_warehouse_id: val });
                  }}
                />
              </Form.Item>
            </Form>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
            <User size={16} />
            <span className="font-medium uppercase">
              {user?.full_name || "Admin"}
            </span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden bg-[#f0f2f5]">
        {/* LEFT: TABLE */}
        <div className="flex-1 p-3 flex flex-col overflow-hidden">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-auto">
            <Table
              columns={columns}
              dataSource={items}
              rowKey="product_id"
              pagination={false}
              size="middle"
              className="no-border-table"
              sticky
            />
            {items.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Search size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">
                  Phiếu chưa có sản phẩm nào
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: SIDEBAR INFO */}
        <div className="w-[350px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          <div className="p-5 flex-1 overflow-y-auto">
            <Form form={form} layout="vertical" className="stock-transfer-form">
              {/* Header Info */}
              <div className="flex justify-between items-center mb-6 text-gray-500 text-xs font-medium border-b border-dashed pb-3">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-500" />
                  <Form.Item name="staff_id" noStyle>
                    <Select
                      variant="borderless"
                      size="small"
                      className="min-w-[100px]"
                      options={filterPurchase?.staffs?.map((s: any) => ({
                        value: s.id,
                        label: s.full_name,
                      }))}
                    />
                  </Form.Item>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                  <Calendar size={14} className="text-blue-500" />
                  {dayjs().format("DD/MM/YYYY")}
                </div>
              </div>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Mã phiếu" name="code">
                    <Input
                      disabled
                      className="bg-gray-50 text-gray-600 font-mono"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Trạng thái" name="status">
                    <Input
                      disabled
                      className="bg-orange-50 text-orange-600 font-bold border-orange-200 text-center"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Số lượng:</span>
                  <span className="font-bold text-lg text-blue-700">
                    {totalQuantity}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-blue-200 pt-2 mt-2">
                  <span className="text-gray-600 font-medium">
                    Tổng giá trị:
                  </span>
                  <span className="font-bold text-xl text-red-600">
                    {new Intl.NumberFormat("vi-VN").format(totalAmount)}
                  </span>
                </div>
              </div>

              <Form.Item
                label={
                  <span className="font-bold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-4 bg-orange-500 rounded-sm"></div>{" "}
                    Chuyển tới kho
                  </span>
                }
                name="to_warehouse_id"
                rules={[{ required: true, message: "Vui lòng chọn kho nhận" }]}
              >
                <Select
                  placeholder="Chọn chi nhánh nhận"
                  size="large"
                  className="w-full"
                  options={filterOptions?.locations?.map((l: any) => ({
                    value: Number(l.id),
                    label: l.name,
                  }))}
                />
              </Form.Item>

              <Form.Item label="Ghi chú" name="note">
                <Input.TextArea
                  rows={4}
                  placeholder="Nhập ghi chú cho phiếu chuyển..."
                  className="bg-gray-50"
                />
              </Form.Item>
            </Form>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Button
              block
              type="primary"
              size="large"
              icon={<Save size={18} />}
              className="bg-blue-600 hover:bg-blue-700 border-none font-bold h-12 shadow-md"
              onClick={handleSubmit}
              loading={submitting}
              disabled={status !== "pending" && status !== "draft"}
            >
              Lưu thay đổi phiếu
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .select-header-white .ant-select-selector {
            color: white !important;
            font-weight: 600;
        }
        .select-header-white .ant-select-arrow {
            color: rgba(255,255,255,0.7) !important;
        }
      `}</style>
    </Modal>
  );
}
