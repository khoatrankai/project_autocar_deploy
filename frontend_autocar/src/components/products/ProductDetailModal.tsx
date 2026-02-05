/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Modal,
  Tabs,
  Table,
  Tag,
  Typography,
  Image,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Package,
  Info,
  Warehouse,
  Edit,
  Printer,
  MoreHorizontal,
  Save,
  XCircle,
} from "lucide-react";
import { useSupplierStore } from "../../store/useSupplierStore";
import { productService } from "../../services/productService";
import { useProductStore } from "../../store/useProductStore";

// --- IMPORT STORE ---
// Lưu ý: Kiểm tra lại đường dẫn import cho đúng với thư mục dự án của bạn

// --- TYPES ---
interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onUpdateSuccess?: () => void;
}

interface StockCardRecord {
  id: string;
  chung_tu: string;
  thoi_gian: string;
  doi_tac: string;
  gia_gd: number;
  gia_von: number;
  so_luong: number;
  ton_cuoi: number;
}

interface InventoryRecord {
  warehouse_name: string;
  quantity: number;
  on_order: number;
  forecast_days: number;
  status: string;
}

const translateType = (type: string) => {
  const map: Record<string, any> = {
    purchase: { text: "Nhập hàng", color: "blue" },
    sale: { text: "Xuất bán", color: "green" }, // Sale thường là màu xanh (hoàn thành) hoặc đỏ (xuất tiền) tùy quy ước
    return: { text: "Khách trả", color: "orange" },
    transfer_in: { text: "Nhập chuyển kho", color: "cyan" },
    transfer_out: { text: "Xuất chuyển kho", color: "magenta" },
    adjustment: { text: "Kiểm kê", color: "purple" },
  };
  return map[type] || { text: type, color: "default" };
};
// --- COMPONENT CHÍNH ---
export default function ProductDetailModal({
  isOpen,
  onClose,
  product,
  onUpdateSuccess,
}: ProductDetailModalProps) {
  const [form] = Form.useForm();

  // 1. LẤY DATA TỪ STORE (Thay thế cho state local cũ)
  // Giả sử store trả về { suppliers, fetchSuppliers, isLoading }
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const { fetchProducts } = useProductStore();
  // Lưu ý: Nếu tên hàm trong store là 'fetchSuppliers' hay 'fetchAll' thì bạn sửa lại cho khớp nhé.

  // States UI
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States Data (Riêng thẻ kho và tồn kho vẫn fetch theo ID sản phẩm nên giữ state local)
  const [stockCardData, setStockCardData] = useState<StockCardRecord[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryRecord[]>([]);

  // --- 1. EFFECTS ---

  useEffect(() => {
    if (isOpen) {
      // Gọi store lấy danh sách NCC ngay khi mở modal (nếu chưa có data)
      fetchSuppliers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && product?.id) {
      setIsEditing(false);

      // Fill dữ liệu vào Form
      form.setFieldsValue({
        sku: product.sku,
        oem_code: product.oem_code,
        name: product.name,
        category_name: product.category_name,
        brand: product.brand,
        cost_price: Number(product.cost_price),
        retail_price: Number(product.retail_price),
        image_url: product.image_url,
        description: product.description,
        supplier_id: product.supplier_id ? Number(product.supplier_id) : null,
      });

      // Gọi các API dữ liệu chi tiết SP
      fetchStockCard();
      fetchInventoryDetail();
    }
  }, [isOpen, product, form]);

  // --- 2. API CALLS (Chỉ còn các API phụ thuộc Product ID) ---

  const fetchStockCard = async () => {
    setLoading(true);
    try {
      const response = await productService.getStocks(product.id);
      if (Array.isArray(response)) {
        setStockCardData(response);
      } else {
        setStockCardData([]);
      }
    } catch (error) {
      console.error("Lỗi tải thẻ kho", error);
      setStockCardData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryDetail = async () => {
    // Mock data tồn kho (giữ nguyên logic cũ)
    const res = await productService.getInventoryDetails(product.id);
    // const mockData: InventoryRecord[] = [
    //   {
    //     warehouse_name: "BÌNH THẠNH",
    //     quantity: product?.total_quantity > 50 ? 50 : product?.total_quantity,
    //     on_order: 0,
    //     forecast_days: 0,
    //     status: "",
    //   },
    //   {
    //     warehouse_name: "THỦ ĐỨC",
    //     quantity:
    //       product?.total_quantity > 50 ? product?.total_quantity - 50 : 0,
    //     on_order: 2,
    //     forecast_days: 365,
    //     status: "Đang kinh doanh",
    //   },
    // ];
    setInventoryData(res);
  };

  // --- 3. ACTIONS ---

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // API: Update sản phẩm
      await productService.update(product.id, values);

      message.success("Cập nhật thành công!");
      fetchProducts();
      onClose();
      setIsEditing(false);

      if (onUpdateSuccess) onUpdateSuccess();
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  // --- 4. FORMATTERS ---
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  // --- 5. RENDER CONTENT ---

  // -> TAB 1: THÔNG TIN
  const renderInfoTab = () => (
    <Form form={form} layout="vertical" component={false}>
      <div className="flex flex-col h-full overflow-y-auto pr-2 pb-4">
        <div className="flex gap-6 mb-6">
          {/* CỘT TRÁI: ẢNH */}
          <div className="w-1/4">
            <div className="border border-gray-200 rounded-lg p-2 bg-white text-center">
              {isEditing ? (
                <Form.Item
                  name="image_url"
                  label="Link ảnh"
                  className="mb-0 text-left"
                >
                  <Input.TextArea rows={4} placeholder="https://..." />
                </Form.Item>
              ) : (
                <Image
                  src={
                    product?.image_url ||
                    "https://placehold.co/300x300?text=No+Image"
                  }
                  alt={product?.name}
                  className="rounded object-cover w-full aspect-square"
                  fallback="https://placehold.co/300x300?text=Error"
                />
              )}
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN CHÍNH */}
          <div className="w-3/4 flex flex-col gap-4">
            <div>
              {isEditing ? (
                <Form.Item
                  name="name"
                  rules={[{ required: true, message: "Tên không được trống" }]}
                  className="mb-1"
                >
                  <Input
                    size="large"
                    className="font-bold text-lg"
                    placeholder="Tên sản phẩm"
                  />
                </Form.Item>
              ) : (
                <Typography.Title
                  level={3}
                  style={{ margin: 0, color: "#1f2937" }}
                >
                  {product?.name}
                </Typography.Title>
              )}

              <div className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                <span>Nhóm hàng:</span>
                <span className="text-blue-600 font-medium">
                  PHỤ TÙNG &gt;&gt; {product?.category_name}
                </span>
              </div>

              {!isEditing && (
                <div className="flex gap-2 mt-2">
                  <Tag color="blue">Bán trực tiếp</Tag>
                  <Tag color="orange">Không tích điểm</Tag>
                </div>
              )}
            </div>

            <Divider style={{ margin: "4px 0" }} />

            {/* GRID FIELDS */}
            <div className="grid grid-cols-4 gap-y-5 gap-x-4">
              {/* SKU */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Mã hàng</div>
                {isEditing ? (
                  <Form.Item name="sku" className="mb-0">
                    <Input />
                  </Form.Item>
                ) : (
                  <div className="font-medium text-gray-800 break-all">
                    {product?.sku}
                  </div>
                )}
              </div>

              {/* Tồn kho (Read-only) */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Tồn kho</div>
                <div className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded inline-block">
                  {product?.total_quantity || 0}
                </div>
              </div>

              {/* Định mức (Static) */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Định mức tồn</div>
                <div className="font-medium text-gray-800">0 - 1,000</div>
              </div>

              {/* Giá vốn */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Giá vốn</div>
                {isEditing ? (
                  <Form.Item name="cost_price" className="mb-0">
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                    />
                  </Form.Item>
                ) : (
                  <div className="font-medium text-gray-800">
                    {formatMoney(product?.cost_price || 0)}
                  </div>
                )}
              </div>

              {/* Giá bán */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Giá bán</div>
                {isEditing ? (
                  <Form.Item name="retail_price" className="mb-0">
                    <InputNumber
                      style={{ width: "100%" }}
                      className="text-blue-600 font-bold"
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                    />
                  </Form.Item>
                ) : (
                  <div className="font-bold text-blue-600">
                    {formatMoney(product?.retail_price || 0)}
                  </div>
                )}
              </div>

              {/* Thương hiệu */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Thương hiệu</div>
                {isEditing ? (
                  <Form.Item name="brand" className="mb-0">
                    <Input />
                  </Form.Item>
                ) : (
                  <div className="font-medium text-gray-800 uppercase">
                    {product?.brand || "---"}
                  </div>
                )}
              </div>

              {/* Mã OEM */}
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">Mã OEM</div>
                {isEditing ? (
                  <Form.Item name="oem_code" className="mb-0">
                    <Input />
                  </Form.Item>
                ) : (
                  <div className="font-medium text-gray-800">
                    {product?.oem_code || "---"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NHÀ CUNG CẤP (DÙNG DATA TỪ STORE) */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Nhà cung cấp</h4>
          {isEditing ? (
            <Form.Item name="supplier_id" className="mb-0">
              <Select
                showSearch
                placeholder="Chọn nhà cung cấp"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  ((option?.label ?? "") as string)
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                // Map dữ liệu từ Store vào Select Options
                options={suppliers.map((s: any) => ({
                  value: Number(s.id),
                  label: s.name,
                }))}
                className="w-full max-w-md"
              />
            </Form.Item>
          ) : (
            <div className="text-sm text-gray-600 font-medium">
              {product?.supplier ? (
                <>
                  <span className="font-bold text-gray-800 mr-2">
                    {product.supplier.name}
                  </span>
                  {product.supplier.code && (
                    <span className="text-xs bg-gray-200 px-1 rounded">
                      {product.supplier.code}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-400 italic">
                  Chưa cập nhật nhà cung cấp
                </span>
              )}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-100">
          <div className="flex gap-4 text-gray-500 text-sm cursor-pointer ">
            {!isEditing && (
              <>
                <span className="flex items-center gap-1 hover:underline">
                  <span className="text-lg">🗑</span> Xóa
                </span>
                <span className="flex items-center gap-1 hover:underline">
                  <span className="text-lg">❐</span> Sao chép
                </span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  icon={<XCircle size={16} />}
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="primary"
                  icon={<Save size={16} />}
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSave}
                  loading={saving}
                >
                  Lưu
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<Edit size={16} />}
                  className="bg-blue-600"
                  onClick={() => setIsEditing(true)}
                >
                  Chỉnh sửa
                </Button>
                <Button icon={<Printer size={16} />}>In tem mã</Button>
                <Button icon={<MoreHorizontal size={16} />} />
              </>
            )}
          </div>
        </div>
      </div>
    </Form>
  );

  // -> TAB 2: THẺ KHO
  const stockCardColumns: ColumnsType<StockCardRecord> = [
    {
      title: "Thời gian",
      dataIndex: "thoi_gian",
      width: 140,
      render: (text) => (
        <span className="text-gray-500 text-xs">{formatDate(text)}</span>
      ),
    },
    {
      title: "Chứng từ",
      dataIndex: "chung_tu",
      render: (text) => (
        <span className="font-medium text-blue-600 cursor-pointer hover:underline">
          <FileText size={14} className="inline mr-1" />
          {text}
        </span>
      ),
    },
    {
      title: "Loại GD",
      dataIndex: "loai_gd",
      render: (type) => {
        const info = translateType(type);
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: "Kho",
      dataIndex: "kho", // Hiển thị tên kho xảy ra biến động
      render: (text) => <span className="text-gray-600 text-xs">{text}</span>,
    },
    {
      title: "Số lượng",
      dataIndex: "so_luong",
      align: "center",
      render: (val) => (
        // Nếu số dương (Nhập/Trả lại) -> Xanh, Số âm (Bán/Xuất) -> Đỏ
        <span
          className={`font-bold ${val > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {val > 0 ? `+${val}` : val}
        </span>
      ),
    },
    {
      title: "Tồn cuối",
      dataIndex: "ton_cuoi",
      align: "right",
      render: (val) => <strong className="text-gray-800">{val}</strong>,
    },
  ];

  // -> TAB 3: TỒN KHO
  const inventoryColumns: ColumnsType<InventoryRecord> = [
    {
      title: "Chi nhánh",
      dataIndex: "warehouse_name",
      key: "name",
      render: (text) => (
        <span className="font-medium uppercase text-gray-700">{text}</span>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "quantity",
      align: "center",
      render: (val) => (
        <span className="font-bold text-gray-800 text-lg">{val}</span>
      ),
    },
    {
      title: "KH đặt",
      dataIndex: "on_order",
      align: "center",
      render: (val) => <span className="text-gray-500">{val}</span>,
    },
    {
      title: "Dự kiến hết hàng",
      dataIndex: "forecast_days",
      render: (val) => (val > 0 ? `${val} ngày` : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "right",
      render: (text) => text && <Tag>{text}</Tag>,
    },
  ];

  // --- 6. TAB CONFIG ---
  const tabItems = [
    {
      key: "info",
      label: (
        <span className="flex items-center gap-2">
          <Info size={16} /> Thông tin
        </span>
      ),
      children: renderInfoTab(),
    },
    {
      key: "stock_card",
      label: (
        <span className="flex items-center gap-2">
          <Package size={16} /> Thẻ kho
        </span>
      ),
      children: (
        <Table
          columns={stockCardColumns}
          dataSource={stockCardData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8, size: "small" }}
          scroll={{ y: 400 }}
          size="small"
          bordered
        />
      ),
    },
    {
      key: "inventory",
      label: (
        <span className="flex items-center gap-2">
          <Warehouse size={16} /> Tồn kho
        </span>
      ),
      children: (
        <div>
          <Input placeholder="Tìm tên chi nhánh..." className="mb-3 max-w-sm" />
          <Table
            columns={inventoryColumns}
            dataSource={inventoryData}
            rowKey="warehouse_name"
            pagination={false}
            size="middle"
            className="border border-gray-200 rounded"
          />
        </div>
      ),
    },
  ];

  if (!product) return null;

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      width={1000}
      footer={null}
      centered
      destroyOnHidden={true}
      maskClosable={!isEditing}
    >
      {/* HEADER NHỎ */}
      <div className="flex justify-between items-center mb-1 px-1 border-b border-dashed border-gray-200 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">{product.name}</span>
            <Tag color="blue">{product.sku}</Tag>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Ngày tạo: {formatDate(product.created_at)}
        </div>
      </div>

      <Tabs defaultActiveKey="info" items={tabItems} className="mt-2" />
    </Modal>
  );
}
