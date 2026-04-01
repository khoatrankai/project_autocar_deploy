/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Loader2, Plus, Trash2, Search, Check, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Modal, Select } from "antd";

// Import Stores & Services
import { useProductStore } from "../../../store/useProductStore";
import { returnService } from "../../../services/returnService";
import { productService } from "../../../services/productService";
import { orderService } from "../../../services/orderService";

interface ReturnItem {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  refund_price: number;
  unit: string;
  image_url?: string;
}

interface Props {
  isOpen: boolean;
  returnId: string | number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpdateReturnModal({
  isOpen,
  returnId,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions: productOptions, fetchFilterOptions } =
    useProductStore();

  // State lưu trạng thái GỐC từ DB để khóa form
  const [originalStatus, setOriginalStatus] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    partner_id: "",
    order_id: "",
    code: "",
    reason: "",
    status: "draft",
  });

  const [items, setItems] = useState<ReturnItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isLoadingFetch, setIsLoadingFetch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States tìm kiếm đơn gốc
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderOptions, setOrderOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  // Init Data & Lấy chi tiết phiếu
  useEffect(() => {
    if (isOpen && returnId) {
      fetchFilterOptions();
      fetchReturnDetails();
      setOrderSearchTerm("");
    } else {
      setItems([]);
      setFormData({
        partner_id: "",
        order_id: "",
        code: "",
        reason: "",
        status: "draft",
      });
      setOriginalStatus("");
    }
  }, [isOpen, returnId]);

  const fetchReturnDetails = async () => {
    setIsLoadingFetch(true);
    try {
      const res: any = await returnService.getOne(returnId as string);
      const data = res?.data?.data || res?.data || res;

      setOriginalStatus(data.status || "draft");

      setFormData({
        partner_id: data.partner_id ? data.partner_id.toString() : "",
        order_id: data.order_id ? data.order_id.toString() : "",
        code: data.code || "",
        reason: data.reason || "",
        status: data.status || "draft",
      });

      // Map lại Order ban đầu vào Select (nếu có)
      if (data.order_id) {
        setOrderOptions([
          { value: data.order_id.toString(), label: `Đơn #${data.order_id}` },
        ]);
      }

      // Lấy danh sách sản phẩm trả (items hoặc return_items tùy backend)
      const itemsList = data.items || data.return_items || [];
      if (itemsList.length > 0) {
        const mappedItems: ReturnItem[] = itemsList.map((item: any) => ({
          product_id: Number(item.product_id),
          sku: item.products?.sku || item.product_sku || "---",
          name: item.products?.name || item.product_name || "---",
          quantity: Number(item.quantity),
          refund_price: Number(item.refund_price),
          unit: item.products?.unit || "Cái",
        }));
        setItems(mappedItems);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không tải được chi tiết phiếu trả");
      onClose();
    } finally {
      setIsLoadingFetch(false);
    }
  };

  // --- EFFECT: TÌM KIẾM ĐƠN GỐC ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsFetchingOrders(true);
      try {
        const res = await orderService.getAll({ search: orderSearchTerm });
        const ordersList = res.data?.data || res.data || [];
        setOrderOptions(
          ordersList.map((o: any) => ({
            value: o.id.toString(),
            label: o.code || `Đơn #${o.id}`,
          })),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetchingOrders(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [orderSearchTerm]);

  // --- EFFECT: TÌM SẢN PHẨM MỚI ---
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
    if (items.find((i) => i.product_id === product.id)) {
      toast("Sản phẩm đã có trong phiếu", { icon: "⚠️" });
      return;
    }
    const newItem: ReturnItem = {
      product_id: Number(product.id),
      sku: product.sku,
      name: product.name,
      quantity: 1,
      refund_price:
        Number(product.retail_price) || Number(product.cost_price) || 0,
      unit: product.unit || "Cái",
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
    field: keyof ReturnItem,
    value: number,
  ) => {
    const newItems = [...items];
    if (field === "quantity" || field === "refund_price") {
      (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  };

  const totalRefund = items.reduce(
    (sum, item) => sum + item.quantity * item.refund_price,
    0,
  );

  // Khóa form nếu trạng thái gốc là hoàn thành
  const isReadOnly =
    originalStatus === "completed" || originalStatus === "cancelled";

  // --- SUBMIT ---
  const handleSubmit = async (submitStatus: string) => {
    if (isReadOnly) return toast.error("Phiếu đã khóa, không thể chỉnh sửa!");
    if (!formData.code) return toast.error("Mã trả hàng không được để trống");
    if (items.length === 0)
      return toast.error("Vui lòng chọn ít nhất 1 sản phẩm");

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code,
        partner_id: formData.partner_id
          ? Number(formData.partner_id)
          : undefined,
        order_id: formData.order_id ? Number(formData.order_id) : undefined,
        reason: formData.reason,
        status: submitStatus, // Gửi trạng thái mới xuống
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          refund_price: i.refund_price,
        })),
      };

      await returnService.update(returnId as string, payload);
      toast.success("Cập nhật phiếu trả hàng thành công!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi cập nhật phiếu");
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
            Đang tải dữ liệu phiếu trả...
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
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        {/* === HEADER === */}
        <div className="h-14 flex-none flex justify-between items-center px-4 border-b border-gray-200 bg-white z-20 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Sửa Phiếu Trả Hàng:{" "}
              <span className="text-blue-600 font-mono">{formData.code}</span>
            </h2>
          </div>

          {/* Search Bar - Chỉ hiện nếu chưa hoàn thành */}
          {!isReadOnly && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px]">
              <div className="relative group">
                <Search
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={18}
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Tìm sản phẩm khách trả lại (F3)"
                  className="w-full pl-10 pr-12 py-2 border rounded shadow-sm outline-none focus:border-blue-500 bg-gray-50 focus:bg-white text-sm"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {isSearching && (
                  <Loader2
                    className="absolute right-2.5 top-2.5 animate-spin text-blue-600"
                    size={18}
                  />
                )}

                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border rounded-b shadow-xl max-h-[400px] overflow-y-auto mt-1 z-50">
                    {searchResults.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddItem(prod)}
                        className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b"
                      >
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-800">
                              {prod.name}
                            </span>
                            <span className="font-bold text-blue-600">
                              {Number(prod.retail_price || 0).toLocaleString()}{" "}
                              ₫
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
            <div className="bg-gray-100 border-b font-semibold text-sm grid grid-cols-12 gap-2 px-4 py-3">
              <div className="col-span-1 text-center">STT</div>
              <div className="col-span-2">Mã hàng</div>
              <div className="col-span-3">Tên hàng</div>
              <div className="col-span-1 text-center">ĐVT</div>
              <div className="col-span-1 text-center">SL trả</div>
              <div className="col-span-2 text-right">Giá hoàn lại</div>
              <div className="col-span-2 text-right">Thành tiền</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Chưa có sản phẩm nào
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.product_id}_${idx}`}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm"
                    >
                      <div className="col-span-1 text-center text-gray-500">
                        {idx + 1}
                      </div>
                      <div className="col-span-2 font-medium text-blue-600">
                        {item.sku}
                      </div>
                      <div className="col-span-3 font-medium text-gray-800 truncate">
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
                          className="w-full text-center border-b outline-none py-1 font-bold text-blue-600 disabled:bg-transparent disabled:border-none"
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
                          className="w-full text-right border-b outline-none py-1 disabled:bg-transparent disabled:border-none"
                          value={
                            item.refund_price
                              ? item.refund_price.toLocaleString("vi-VN")
                              : ""
                          }
                          onChange={(e) =>
                            handleUpdateItem(
                              idx,
                              "refund_price",
                              Number(e.target.value.replace(/\D/g, "")),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2 flex justify-between items-center pl-4">
                        <span className="font-bold text-gray-800">
                          {(item.quantity * item.refund_price).toLocaleString()}
                        </span>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT: SIDEBAR INFO --- */}
          <div className="w-[340px] bg-white border-l flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-bold">Mã phiếu</span>
                  <input
                    disabled
                    className="w-44 text-right border-none outline-none py-1 font-mono text-gray-500 bg-transparent"
                    value={formData.code}
                  />
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-bold">Khách hàng</span>
                  <select
                    disabled={isReadOnly}
                    className="w-44 text-right border-b outline-none bg-transparent py-1 disabled:opacity-70 disabled:border-none cursor-pointer"
                    value={formData.partner_id}
                    onChange={(e) =>
                      setFormData({ ...formData, partner_id: e.target.value })
                    }
                  >
                    <option value="">Khách lẻ</option>
                    {productOptions?.customers?.map((cus: any) => (
                      <option key={cus.id} value={cus.id}>
                        {cus.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center text-sm border-b border-dashed border-gray-100 pb-2">
                  <span className="text-gray-600 font-bold">Mã đơn gốc</span>
                  <div className="w-44">
                    <Select
                      showSearch
                      allowClear
                      disabled={isReadOnly}
                      variant="borderless"
                      placeholder="Tìm mã đơn hàng..."
                      className="w-full text-right border-b border-gray-200 focus-within:border-blue-500"
                      value={formData.order_id || null}
                      onSearch={(value) => setOrderSearchTerm(value)}
                      onChange={(value) =>
                        setFormData({ ...formData, order_id: value || "" })
                      }
                      filterOption={false}
                      loading={isFetchingOrders}
                      options={orderOptions}
                      notFoundContent={
                        isFetchingOrders ? (
                          <div className="flex justify-center p-2">
                            <Loader2
                              className="animate-spin text-blue-500"
                              size={16}
                            />
                          </div>
                        ) : (
                          "Không tìm thấy"
                        )
                      }
                      dropdownStyle={{ minWidth: 250 }}
                    />
                  </div>
                </div>
              </div>

              {/* Money */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-700">Tiền hoàn cho khách</span>
                  <span className="text-blue-600 text-xl">
                    {totalRefund.toLocaleString()} ₫
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Lý do trả hàng
                </label>
                <textarea
                  rows={4}
                  disabled={isReadOnly}
                  className="w-full border rounded p-2 text-sm outline-none focus:border-blue-500 resize-none disabled:bg-gray-50"
                  placeholder="Ví dụ: Lỗi kỹ thuật, đổi ý..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {!isReadOnly ? (
              <div className="p-4 border-t bg-gray-50 flex gap-3">
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
            ) : (
              <div className="p-4 border-t bg-red-50 text-center">
                <p className="text-sm font-bold text-red-600">
                  Phiếu trả hàng này đã hoàn tất, không thể chỉnh sửa!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
