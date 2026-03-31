/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Save,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "antd";
import { productService } from "../../../services/productService";
import { supplierService } from "../../../services/supplierService";
import { usePurchaseOrderStore } from "../../../store/usePurchaseOrderStore";
import { purchaseOrderService } from "../../../services/purchaseOrderService";
interface ImportItem {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  import_price: number;
  unit: string;
  image_url?: string;
}

interface Props {
  isOpen: boolean;
  orderId: string | number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpdatePurchaseOrderModal({
  isOpen,
  orderId,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions, fetchFilterOptions } = usePurchaseOrderStore();

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: "",
    warehouse_id: "",
    staff_id: "",
    code: "",
    status: "draft",
    discount: 0,
    paid_amount: 0,
    note: "",
  });

  const [items, setItems] = useState<ImportItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isLoadingFetch, setIsLoadingFetch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Init Data & Fetch Order Details
  useEffect(() => {
    if (isOpen && orderId) {
      fetchFilterOptions();
      fetchSuppliers();
      fetchOrderDetails();
    } else {
      setItems([]);
      setFormData({
        supplier_id: "",
        warehouse_id: "",
        staff_id: "",
        code: "",
        status: "draft",
        discount: 0,
        paid_amount: 0,
        note: "",
      });
    }
  }, [isOpen, orderId]);

  const fetchSuppliers = async () => {
    try {
      const res = await supplierService.getSuppliers({ page: 1, limit: 100 });
      setSuppliers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrderDetails = async () => {
    setIsLoadingFetch(true);
    try {
      const res: any = await purchaseOrderService.getOne(orderId!);
      const data = res?.data?.data || res?.data || res;

      setFormData({
        supplier_id: data.supplier_id ? data.supplier_id.toString() : "",
        warehouse_id: data.warehouse_id ? data.warehouse_id.toString() : "",
        staff_id: data.staff_id ? data.staff_id.toString() : "",
        code: data.code || "",
        status: data.status || "draft",
        discount: Number(data.discount) || 0,
        paid_amount: Number(data.paid_amount) || 0,
        note: data.note || "",
      });

      if (data.purchase_order_items && data.purchase_order_items.length > 0) {
        const mappedItems: ImportItem[] = data.purchase_order_items.map(
          (item: any) => ({
            product_id: Number(item.product_id),
            sku: item.products?.sku || "---",
            name: item.products?.name || "---",
            quantity: Number(item.quantity),
            import_price: Number(item.import_price),
            unit: item.products?.unit || "Cái",
            image_url: item.products?.image_url,
          }),
        );
        setItems(mappedItems);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không tải được chi tiết phiếu nhập");
      onClose();
    } finally {
      setIsLoadingFetch(false);
    }
  };

  // Search Products
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (productSearch.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await productService.getProducts({
            search: productSearch,
            limit: 10,
            page: 1,
          });
          setSearchResults(res.data?.data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleAddItem = (product: any) => {
    if (items.find((i) => i.product_id === product.id)) {
      toast("Sản phẩm đã có trong phiếu", { icon: "⚠️" });
      return;
    }
    const newItem: ImportItem = {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      quantity: 1,
      import_price: Number(product.cost_price) || 0,
      unit: product.unit || "Cái",
      image_url: product.image_url,
    };
    setItems([...items, newItem]);
    setProductSearch("");
    setSearchResults([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ImportItem,
    value: number,
  ) => {
    const newItems = [...items];
    if (field === "quantity" || field === "import_price") {
      (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.import_price,
    0,
  );
  const finalAmount = Math.max(0, totalAmount - formData.discount);

  // Submit Update
  const handleSubmit = async (statusSubmit: "draft" | "completed") => {
    if (formData.status === "completed" || formData.status === "cancelled") {
      const isConfirm = window.confirm(
        "Phiếu này đã Hoàn thành/Hủy. Bạn có chắc chắn muốn thay đổi thông tin không?",
      );
      if (!isConfirm) return;
    }

    if (!formData.supplier_id) return toast.error("Vui lòng chọn Nhà cung cấp");
    if (!formData.warehouse_id) return toast.error("Vui lòng chọn Kho nhập");
    if (items.length === 0)
      return toast.error("Vui lòng thêm ít nhất 1 sản phẩm vào phiếu");

    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: Number(formData.supplier_id),
        warehouse_id: Number(formData.warehouse_id),
        status: statusSubmit,
        discount: formData.discount,
        paid_amount: formData.paid_amount,
        note: formData.note,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          import_price: i.import_price,
        })),
      };

      await purchaseOrderService.update(orderId!, payload);
      toast.success("Cập nhật phiếu nhập thành công!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi xử lý");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingFetch) {
    return (
      <Modal
        open={isOpen}
        footer={null}
        closable={false}
        className="full-screen-modal p-0"
        width="100vw"
      >
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 flex-col gap-3">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">
            Đang tải dữ liệu phiếu nhập...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="100%"
      style={{ padding: 0, alignItems: "center", maxWidth: "100vw" }}
      maskClosable={false}
    >
      <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
        {/* === HEADER === */}
        <div className="h-14 flex-none flex justify-between items-center px-4 border-b border-gray-200 bg-white z-20 relative shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Sửa phiếu nhập:{" "}
              <span className="text-blue-600 font-mono">{formData.code}</span>
            </h2>
          </div>

          {/* Search Bar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px]">
            <div className="relative group">
              <Search
                className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm thêm hàng hóa vào phiếu..."
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all text-sm"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {isSearching && (
                <Loader2
                  className="absolute right-3 top-2.5 animate-spin text-blue-600"
                  size={18}
                />
              )}

              {/* Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-b shadow-xl max-h-[400px] overflow-y-auto mt-1 z-50">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => handleAddItem(prod)}
                      className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-800">
                            {prod.name}
                          </span>
                          <span className="font-bold text-blue-600">
                            {Number(prod.cost_price).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          SKU: {prod.sku}
                        </div>
                      </div>
                      <Plus className="text-blue-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === BODY === */}
        <div className="flex-1 flex overflow-hidden bg-gray-100">
          {/* --- LEFT: TABLE ITEMS --- */}
          <div className="flex-1 flex flex-col m-3 bg-white rounded shadow-sm overflow-hidden relative">
            <div className="bg-gray-100 border-b border-gray-200 text-gray-600 font-semibold text-sm grid grid-cols-12 gap-2 px-4 py-3 select-none">
              <div className="col-span-1 text-center">STT</div>
              <div className="col-span-2">Mã hàng</div>
              <div className="col-span-3">Tên hàng</div>
              <div className="col-span-1 text-center">ĐVT</div>
              <div className="col-span-1 text-center">SL</div>
              <div className="col-span-2 text-right">Đơn giá</div>
              <div className="col-span-2 text-right">Thành tiền</div>
            </div>

            <div className="flex-1 overflow-y-auto relative">
              {items.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Phiếu chưa có sản phẩm nào
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.product_id}_${idx}`}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-blue-50/50 text-sm"
                    >
                      <div className="col-span-1 text-center text-gray-500">
                        {idx + 1}
                      </div>
                      <div className="col-span-2 font-medium text-blue-600">
                        {item.sku}
                      </div>
                      <div
                        className="col-span-3 font-medium text-gray-800 line-clamp-1"
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      <div className="col-span-1 text-center text-gray-600">
                        {item.unit}
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          className="w-full text-center border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1 font-bold"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <input
                          type="text"
                          className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1 font-medium"
                          value={
                            item.import_price
                              ? item.import_price.toLocaleString("vi-VN")
                              : ""
                          }
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\D/g, "");
                            handleUpdateItem(
                              idx,
                              "import_price",
                              Number(rawValue),
                            );
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex justify-between items-center pl-4">
                        <span className="font-bold text-gray-800">
                          {(item.quantity * item.import_price).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT: SIDEBAR INFO --- */}
          <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col h-full z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
            <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
              <div className="relative group">
                <span className="text-xs font-semibold text-gray-500 mb-1 block">
                  Nhà cung cấp
                </span>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none bg-white focus:border-blue-500 font-medium"
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-8 text-gray-400 pointer-events-none"
                />
              </div>

              <div className="relative group">
                <span className="text-xs font-semibold text-gray-500 mb-1 block">
                  Kho nhập hàng
                </span>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none bg-white focus:border-blue-500 font-medium"
                  value={formData.warehouse_id}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouse_id: e.target.value })
                  }
                >
                  <option value="">Chọn kho</option>
                  {filterOptions.warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-8 text-gray-400 pointer-events-none"
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">
                    Tổng tiền hàng
                  </span>
                  <span className="font-bold text-gray-900">
                    {totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Giảm giá</span>
                  <input
                    type="text"
                    className="w-32 text-right border-b border-gray-300 outline-none focus:border-blue-500 py-1"
                    value={
                      formData.discount
                        ? formData.discount.toLocaleString("vi-VN")
                        : ""
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, discount: Number(rawValue) });
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-2">
                  <span className="text-gray-700">Cần trả NCC</span>
                  <span className="text-blue-600 text-lg">
                    {finalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Đã trả NCC</span>
                  <input
                    type="text"
                    className="w-32 text-right border-b border-gray-300 outline-none focus:border-blue-500 py-1 font-medium"
                    value={
                      formData.paid_amount
                        ? formData.paid_amount.toLocaleString("vi-VN")
                        : ""
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        paid_amount: Number(rawValue),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500 resize-none"
                  placeholder="Ghi chú..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => handleSubmit("draft")}
                disabled={isSubmitting}
                className="flex-1 bg-white border border-blue-600 text-blue-600 py-2.5 rounded font-bold hover:bg-blue-50 transition-colors shadow-sm text-sm disabled:opacity-70 flex justify-center items-center"
              >
                <Save size={16} className="mr-2" /> Lưu tạm
              </button>
              <button
                onClick={() => handleSubmit("completed")}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm disabled:opacity-70 flex justify-center items-center"
              >
                <Check size={16} className="mr-2" /> Hoàn thành
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
