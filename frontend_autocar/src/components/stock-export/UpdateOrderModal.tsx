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
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "antd";
import { customerService } from "../../services/customerService";
import { orderService } from "../../services/orderService";
import { productService } from "../../services/productService";
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";

interface OrderItem {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  image_url?: string;
}

interface Props {
  isOpen: boolean;
  orderId: string | number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpdateOrderModal({
  isOpen,
  orderId,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions, fetchFilterOptions } = usePurchaseOrderStore();

  // State lưu trạng thái GỐC từ DB để khóa form
  const [originalStatus, setOriginalStatus] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    partner_id: "",
    warehouse_id: "",
    staff_id: "",
    code: "",
    status: "debt",
    discount: 0,
    paid_amount: 0,
    note: "",
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Search State
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Loading State
  const [isLoadingFetch, setIsLoadingFetch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Init Data & Lấy chi tiết đơn
  useEffect(() => {
    if (isOpen && orderId) {
      fetchFilterOptions();
      fetchCustomers();
      fetchOrderDetails();
    } else {
      setItems([]);
      setFormData({
        partner_id: "",
        warehouse_id: "",
        staff_id: "",
        code: "",
        status: "debt",
        discount: 0,
        paid_amount: 0,
        note: "",
      });
      setOriginalStatus("");
    }
  }, [isOpen, orderId]);

  const fetchCustomers = async () => {
    try {
      const res = await customerService.getCustomers({ limit: 100 });
      setCustomers(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrderDetails = async () => {
    setIsLoadingFetch(true);
    try {
      const res: any = await orderService.getDetail(orderId as string);
      const data = res?.data || res;

      // Lưu trạng thái gốc
      setOriginalStatus(data.status || "debt");

      setFormData({
        partner_id: data.partner_id ? data.partner_id.toString() : "",
        warehouse_id: data.warehouse_id ? data.warehouse_id.toString() : "",
        staff_id: data.staff_id ? data.staff_id.toString() : "",
        code: data.code || "",
        status: data.status || "debt",
        discount: Number(data.discount) || 0,
        paid_amount: Number(data.paid_amount) || 0,
        note: data.note || "",
      });

      if (data.order_items && data.order_items.length > 0) {
        const mappedItems: OrderItem[] = data.order_items.map((item: any) => ({
          product_id: Number(item.product_id),
          sku: item.products?.sku || item.product_sku || "---",
          name: item.products?.name || item.product_name || "---",
          quantity: Number(item.quantity),
          price: Number(item.price),
          unit: item.products?.unit || "Cái",
        }));
        setItems(mappedItems);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không tải được chi tiết đơn bán hàng");
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
          setSearchResults(res.data?.data || []);
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
    const existItem = items.find((i) => i.product_id === product.id);
    if (existItem) {
      const newItems = [...items];
      const idx = newItems.indexOf(existItem);
      newItems[idx].quantity += 1;
      setItems(newItems);
      toast.success("Đã tăng số lượng");
    } else {
      const newItem: OrderItem = {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        price: Number(product.retail_price) || 0,
        unit: product.unit || "Cái",
      };
      setItems([...items, newItem]);
    }
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
    field: keyof OrderItem,
    value: number,
  ) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const finalAmount = Math.max(0, totalAmount - formData.discount);

  // Submit Update
  const handleSubmit = async () => {
    // Ràng buộc: Nếu trạng thái GỐC đã hoàn thành thì không cho chạy hàm Save
    if (originalStatus === "completed") {
      return toast.error("Đơn hàng đã hoàn thành, không thể chỉnh sửa!");
    }

    if (items.length === 0)
      return toast.error("Đơn hàng phải có ít nhất 1 sản phẩm");

    setIsSubmitting(true);
    try {
      const payload = {
        partner_id: formData.partner_id
          ? Number(formData.partner_id)
          : undefined,
        warehouse_id: formData.warehouse_id
          ? Number(formData.warehouse_id)
          : undefined,
        note: formData.note,
        discount: formData.discount,
        paid_amount: formData.paid_amount,
        status: formData.status, // Cập nhật trạng thái mới
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
      };

      await orderService.update(orderId!, payload);
      toast.success("Cập nhật đơn hàng thành công!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi cập nhật đơn hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  // NẾU TRẠNG THÁI GỐC LÀ COMPLETED HOẶC CANCELLED -> KHÓA ĐỌC
  const isReadOnly =
    originalStatus === "completed" || originalStatus === "cancelled";

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
            Đang tải dữ liệu đơn hàng...
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
              Cập nhật đơn bán hàng:{" "}
              <span className="text-blue-600 font-mono">{formData.code}</span>
            </h2>
          </div>

          {/* Search Bar - Chỉ hiện nếu Form không bị khóa */}
          {!isReadOnly && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px]">
              <div className="relative group">
                <Search
                  className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Tìm thêm hàng hóa vào đơn (F3)..."
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded shadow-sm outline-none focus:border-blue-500 bg-gray-50 focus:bg-white text-sm"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {isSearching && (
                  <Loader2
                    className="absolute right-3 top-2.5 animate-spin text-blue-600"
                    size={18}
                  />
                )}

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
                              {Number(prod.retail_price).toLocaleString()}
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
          )}
        </div>

        {/* === BODY === */}
        <div className="flex-1 flex overflow-hidden bg-gray-100">
          {/* --- LEFT: TABLE ITEMS --- */}
          <div className="flex-1 flex flex-col m-3 bg-white rounded shadow-sm overflow-hidden relative">
            <div className="bg-gray-100 border-b border-gray-200 text-gray-600 font-semibold text-sm grid grid-cols-12 gap-2 px-4 py-3 select-none">
              <div className="col-span-1 text-center">STT</div>
              <div className="col-span-2">Mã hàng</div>
              <div className="col-span-4">Tên hàng</div>
              <div className="col-span-1 text-center">ĐVT</div>
              <div className="col-span-1 text-center">SL</div>
              <div className="col-span-2 text-right">Đơn giá</div>
              <div className="col-span-1 text-right">Thành tiền</div>
            </div>

            <div className="flex-1 overflow-y-auto relative">
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
                      className="col-span-4 font-medium text-gray-800 line-clamp-1"
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
                        disabled={isReadOnly}
                        className="w-full text-center border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1 font-bold disabled:bg-transparent disabled:border-none"
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
                        disabled={isReadOnly}
                        className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1 font-medium disabled:bg-transparent disabled:border-none"
                        value={
                          item.price ? item.price.toLocaleString("vi-VN") : ""
                        }
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "");
                          handleUpdateItem(idx, "price", Number(rawValue));
                        }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end items-center gap-2">
                      <span className="font-bold text-gray-800">
                        {(item.quantity * item.price).toLocaleString()}
                      </span>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- RIGHT: SIDEBAR INFO --- */}
          <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col h-full z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
            <div className="p-5 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
              <div className="relative group">
                <span className="text-xs font-semibold text-gray-500 mb-1 block">
                  Khách hàng
                </span>
                <select
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none bg-white disabled:bg-gray-50"
                  value={formData.partner_id}
                  onChange={(e) =>
                    setFormData({ ...formData, partner_id: e.target.value })
                  }
                >
                  <option value="">Khách lẻ</option>
                  {customers.map((cus) => (
                    <option key={cus.id} value={cus.id}>
                      {cus.name} - {cus.phone}
                    </option>
                  ))}
                </select>
                {!isReadOnly && (
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-8 text-gray-400 pointer-events-none"
                  />
                )}
              </div>

              <div className="relative group">
                <span className="text-xs font-semibold text-gray-500 mb-1 block">
                  Kho xuất hàng
                </span>
                <select
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none bg-white disabled:bg-gray-50"
                  value={formData.warehouse_id}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouse_id: e.target.value })
                  }
                >
                  <option value="">Chọn kho</option>
                  {filterOptions.warehouses?.map((wh: any) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                {!isReadOnly && (
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-8 text-gray-400 pointer-events-none"
                  />
                )}
              </div>

              {/* CHỌN TRẠNG THÁI */}
              <div className="relative group">
                <span className="text-xs font-semibold text-gray-500 mb-1 block">
                  Trạng thái phiếu
                </span>
                <select
                  disabled={isReadOnly}
                  className={`w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none disabled:bg-gray-50 font-bold ${
                    formData.status === "completed"
                      ? "text-green-600 bg-green-50"
                      : formData.status === "debt"
                        ? "text-orange-600 bg-orange-50"
                        : "text-red-600 bg-red-50"
                  }`}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="debt">Ghi nợ / Chưa xong</option>
                  <option value="completed">Hoàn thành (Trừ kho)</option>
                  <option value="cancelled">Hủy đơn</option>
                </select>
                {!isReadOnly && (
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-8 text-gray-400 pointer-events-none"
                  />
                )}
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
                    disabled={isReadOnly}
                    className="w-32 text-right border-b border-gray-300 outline-none focus:border-blue-500 py-1 disabled:bg-transparent disabled:border-none"
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
                  <span className="text-gray-700">Khách cần trả</span>
                  <span className="text-blue-600 text-lg">
                    {finalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Đã thanh toán</span>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    className="w-32 text-right border-b border-gray-300 outline-none focus:border-blue-500 py-1 font-medium disabled:bg-transparent disabled:border-none"
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
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500 resize-none disabled:bg-gray-50"
                  placeholder="Ghi chú đơn hàng..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {!isReadOnly && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors shadow-md text-sm disabled:opacity-70 flex justify-center items-center"
                >
                  <Save size={18} className="mr-2" /> Lưu thay đổi
                </button>
              </div>
            )}

            {isReadOnly && (
              <div className="p-4 border-t border-gray-200 bg-red-50 text-center">
                <p className="text-sm font-bold text-red-600">
                  Đơn hàng này đã đóng, không thể sửa đổi!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
