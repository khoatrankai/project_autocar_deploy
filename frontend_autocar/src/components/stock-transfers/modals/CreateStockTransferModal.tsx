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
  Check,
} from "lucide-react";
import { stockTransferService } from "../../../services/stockTransferService";
import { productService } from "../../../services/productService";
import dayjs from "dayjs";
import { useProductStore } from "../../../store/useProductStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { usePurchaseOrderStore } from "../../../store/usePurchaseOrderStore";

interface CreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CreateStockTransferModal({
  open,
  onCancel,
  onSuccess,
}: CreateModalProps) {
  const [form] = Form.useForm();

  // Stores
  const { user } = useAuthStore();
  const { filterOptions } = useProductStore(); // Lấy danh sách kho từ locations
  const { filterOptions: filterPurchase } = usePurchaseOrderStore(); // Lấy danh sách nhân viên

  // Local State
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State UI
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number | null>(
    null,
  );

  // --- 1. EFFECTS ---
  useEffect(() => {
    if (open) {
      form.resetFields();
      setItems([]);

      // Default Values
      const defaultWarehouse = filterOptions?.locations?.[0]?.id
        ? Number(filterOptions.locations[0].id)
        : null;

      setSourceWarehouseId(defaultWarehouse);

      form.setFieldsValue({
        code: `TRF${dayjs().format("YYYYMMDD")}${Math.floor(Math.random() * 1000)}`, // Auto gen mã hiển thị
        created_at: dayjs(),
        from_warehouse_id: defaultWarehouse,
        staff_id: user?.id || filterPurchase?.staffs?.[0]?.id, // Default current user
        status: "Phiếu tạm",
      });
    }
  }, [open, form, user, filterOptions, filterPurchase]);

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

  useEffect(() => {
    console.log("thay doi", form, sourceWarehouseId);
  }, [form, sourceWarehouseId]);

  // --- 2. HANDLERS ---

  // Tìm kiếm sản phẩm
  const handleSearchProduct = async (value: string) => {
    if (!value) return;
    try {
      const res: any = await productService.getProducts({
        search: value,
        limit: 10,
        page: 1,
      });
      setProducts(res.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // Chọn sản phẩm
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
      current_stock: product.total_quantity || 0, // Tạm lấy tồn tổng, đúng ra phải lấy tồn theo kho gửi
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

  // SUBMIT FORM
  const handleSubmit = async (isCompleted: boolean) => {
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

      setLoading(true);

      // Map đúng theo DTO: CreateTransferDto
      const payload = {
        code: values.code,
        from_warehouse_id: values.from_warehouse_id || sourceWarehouseId,
        to_warehouse_id: values.to_warehouse_id,
        staff_id: values.staff_id,
        status: isCompleted ? "pending" : "draft", // Pending = Đang chuyển
        note: values.note,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      };

      await stockTransferService.create(payload);
      message.success(isCompleted ? "Đã tạo phiếu chuyển!" : "Đã lưu nháp!");
      onSuccess();
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // Columns Table
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
          max={r.current_stock}
          value={r.quantity}
          onChange={(val) => handleUpdateQuantity(idx, val || 1)}
          className="w-full font-bold text-blue-700 border-blue-300"
        />
      ),
    },
    {
      title: "Giá chuyển",
      dataIndex: "price",
      align: "right" as const,
      width: 120,
      render: (val: number) => new Intl.NumberFormat("vi-VN").format(val),
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
      {/* --- 1. HEADER BLUE --- */}
      <div className="bg-[#0070f3] h-14 flex items-center justify-between px-4 text-white flex-shrink-0 shadow-md">
        <div className="flex items-center gap-4 flex-1">
          <Button
            type="text"
            icon={<ArrowLeft size={24} className="text-white" />}
            onClick={onCancel}
            className="hover:bg-white/20"
          />
          <h2 className="text-xl font-bold m-0 text-white tracking-wide">
            Chuyển hàng
          </h2>

          {/* SEARCH BAR BIG */}
          <div className="w-[500px] ml-4">
            <Select
              showSearch
              placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
              defaultActiveFirstOption={false}
              filterOption={false}
              onSearch={handleSearchProduct}
              onSelect={handleSelectProduct}
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
              listHeight={400}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {/* FROM WAREHOUSE SELECTOR IN HEADER */}
          <div className="flex items-center bg-white/10 rounded-md px-3 py-1.5 border border-white/20 backdrop-blur-sm">
            <span className="mr-2 opacity-90 font-medium">Từ kho:</span>
            <Form component={false}>
              <Form.Item name="from_warehouse_id" noStyle>
                <Select
                  variant="borderless"
                  className="text-white min-w-[140px] select-header-white font-bold"
                  dropdownStyle={{ minWidth: 200 }}
                  popupMatchSelectWidth={false}
                  // Map locations -> warehouse options
                  options={filterOptions?.locations?.map((l: any) => ({
                    value: Number(l.id),
                    label: l.name,
                  }))}
                  value={sourceWarehouseId}
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

      {/* --- 2. BODY --- */}
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
                <p className="text-lg font-medium">Chưa có sản phẩm nào</p>
                <p className="text-sm opacity-70">
                  Vui lòng tìm kiếm và thêm sản phẩm vào phiếu chuyển
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
                  {dayjs().format("DD/MM/YYYY HH:mm")}
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
                      className="bg-blue-50 text-blue-600 font-bold border-blue-200 text-center"
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
                  // Map locations -> warehouse options
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
            <Row gutter={12}>
              <Col span={10}>
                <Button
                  block
                  size="large"
                  icon={<Save size={18} />}
                  className="bg-white text-blue-600 border-blue-600 hover:bg-blue-50 font-medium h-12"
                  onClick={() => handleSubmit(false)} // Draft
                  loading={loading}
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
                  className="bg-green-600 hover:bg-green-700 border-none font-bold h-12 shadow-md shadow-green-200"
                  onClick={() => handleSubmit(true)} // Complete
                  loading={loading}
                >
                  Hoàn thành
                </Button>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      {/* CSS Override cho Select trong Header */}
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
