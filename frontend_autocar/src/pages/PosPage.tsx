/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  User,
  Settings,
  X,
  FileText,
  ChevronDown,
  AlertCircle,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

// Store & Services
import { usePosStore } from "../store/usePosStore";
import { productService } from "../services/productService";
import { customerService } from "../services/customerService";
import { usePurchaseOrderStore } from "../store/usePurchaseOrderStore";
import CreateCustomerModal from "../components/customers/modals/CreateCustomerModal";
import { orderService } from "../services/orderService";
import { useManagerStore } from "../store/useManager";

export default function PosPage() {
  const {
    invoices,
    activeInvoiceId,
    addInvoice,
    removeInvoice,
    setActiveInvoice,
    getActiveInvoice,
    calculateTotals,
    addToCart,
    updateCartItem,
    removeFromCart,
    setPartner,
    setStaff,
    setDiscount,
    setVatRate,
    setNote,
    resetActiveInvoice,
  } = usePosStore();

  const {
    filterOptions: { staffs },
    fetchFilterOptions,
  } = usePurchaseOrderStore();
  const { warehouse_manager } = useManagerStore();
  // 1. Lấy dữ liệu của hóa đơn đang active
  const activeData = getActiveInvoice();
  const cart = activeData?.cart || [];
  const selectedPartner = activeData?.selectedPartner || null;
  const selectedStaff = activeData?.selectedStaff || null;
  const discount = activeData?.discount || 0;
  const vatRate = activeData?.vatRate || 0;
  const note = activeData?.note || "";

  const { totalMerchandise, totalTax, totalPayment } = calculateTotals();

  // 2. Logic Check Lỗi (Để chặn thanh toán)
  const hasError = cart.some((item) => {
    const isLowStock = item.stock <= 0; // Hết hàng
    const isLowPrice = item.price < item.cost_price; // Giá bán < Giá vốn
    return isLowStock || isLowPrice;
  });

  // UI States Local
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);

  // --- INIT ---
  useEffect(() => {
    fetchFilterOptions(); // Lấy list nhân viên
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Nếu chưa có tab nào (trường hợp hiếm), tạo tab đầu tiên
    if (!activeInvoiceId && invoices.length > 0)
      setActiveInvoice(invoices[0].id);

    return () => clearInterval(timer);
  }, []);

  // Sync tiền khách trả mặc định = tổng tiền
  useEffect(() => {
    setAmountPaid(totalPayment);
  }, [totalPayment, activeInvoiceId]);

  // --- HANDLERS ---
  const handleSearchProduct = async (keyword: string) => {
    setProductSearch(keyword);
    console.log(warehouse_manager, "vao day");
    if (keyword.trim().length > 1) {
      try {
        const res = await productService.getProducts({
          search: keyword,
          limit: 10,
          page: 1,
          locationIds: warehouse_manager ? [warehouse_manager] : undefined,
        });
        setProductResults(res.data?.data || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setProductResults([]);
    }
  };

  const handleSearchCustomer = async (keyword: string) => {
    setCustomerSearch(keyword);
    if (keyword.trim().length > 1) {
      try {
        const res = await customerService.getCustomers({
          search: keyword,
          limit: 5,
        });
        setCustomerResults(res.data || []);
        setShowCustomerDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectProduct = (product: any) => {
    addToCart(product);
    setProductSearch("");
    setProductResults([]);
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(val);

  // Xử lý nhập tiền: Xóa ký tự lạ để lưu số nguyên, format lại khi render
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setAmountPaid(rawValue ? parseInt(rawValue, 10) : 0);
  };

  const handlePayment = async () => {
    // 1. VALIDATION CƠ BẢN
    if (cart.length === 0) {
      return toast.error("Giỏ hàng đang trống!");
    }

    // Nếu có lỗi "báo đỏ" (hết hàng, lỗ vốn) -> Chặn luôn (như yêu cầu trước)
    if (hasError) {
      return toast.error(
        "Đơn hàng có lỗi (Hết hàng hoặc Lỗ vốn), vui lòng kiểm tra lại!",
      );
    }

    // Bắt buộc chọn khách hàng (nếu backend yêu cầu partner_id not null)
    if (!selectedPartner) {
      return toast.error("Vui lòng chọn khách hàng để thanh toán!");
    }

    setIsProcessing(true);

    try {
      // 2. CHUẨN BỊ PAYLOAD (Dữ liệu gửi đi)
      // Map dữ liệu từ Store (Zustand) sang cấu trúc DTO của Backend
      const payload = {
        code: `DH${Date.now()}`, // Hoặc để null để Backend tự sinh
        partner_id: Number(selectedPartner.id), // Backend nhận Int/BigInt
        staff_id: selectedStaff?.id || undefined, // Nếu không chọn thì để Backend tự lấy user login
        warehouse_id: 1, // ID kho hiện tại (Thường lấy từ cấu hình shop hoặc user session)

        // Tiền nong
        discount: discount,
        paid_amount: amountPaid, // Số tiền khách đưa
        payment_method: paymentMethod, // 'cash', 'transfer', 'card'
        note: note, // Ghi chú đơn

        // Danh sách sản phẩm
        items: cart.map((item) => ({
          product_id: Number(item.product_id),
          quantity: item.quantity,
          price: item.price, // Giá bán thực tế (đã sửa trên UI)
        })),
      };

      // 3. GỌI API
      const response = await orderService.create(payload);

      // 4. XỬ LÝ THÀNH CÔNG
      toast.success(`Thanh toán thành công! Mã đơn: ${response.code}`);

      // (Optional) Mở tab mới để in hóa đơn
      // window.open(`/print/invoice/${response.id}`, '_blank');

      // 5. RESET TAB HIỆN TẠI
      resetActiveInvoice();
    } catch (error: any) {
      // 6. XỬ LÝ LỖI TỪ BACKEND
      // Backend trả về: { message: "Vượt hạn mức nợ...", error: "Bad Request", ... }
      const errorMessage =
        error.response?.data?.message || "Lỗi khi tạo đơn hàng";

      // Nếu message là mảng (class-validator) thì lấy cái đầu tiên
      const displayMsg = Array.isArray(errorMessage)
        ? errorMessage[0]
        : errorMessage;

      toast.error(displayMsg);
      console.error("Payment Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    console.log(warehouse_manager, "day");
  }, [warehouse_manager]);

  return (
    <div className="flex h-full w-full bg-gray-100 overflow-hidden text-sm font-sans">
      {/* ================= LEFT SIDE: CART & PRODUCTS ================= */}
      <div className="flex-1 flex flex-col h-full pr-0 border-r border-gray-300">
        {/* HEADER & TABS */}
        <div className="h-12 bg-[#0070f3] flex items-center px-3 justify-between shrink-0 shadow-md z-20">
          <div className="flex items-end gap-1 w-3/4 h-full pt-1">
            {/* 1. Product Search Input */}
            <div className="relative w-72 mb-1.5 mr-2">
              <Search
                className="absolute left-2 top-1.5 text-gray-400"
                size={16}
              />
              <input
                className="w-full pl-8 pr-2 py-1 rounded-sm outline-none text-sm placeholder-gray-400 focus:bg-white bg-white/95"
                placeholder="Tìm hàng (F3)..."
                value={productSearch}
                onChange={(e) => handleSearchProduct(e.target.value)}
                autoFocus
              />
              {/* Product Dropdown */}
              {productResults.length > 0 && (
                <div className="absolute top-full left-0 w-[400px] bg-white shadow-xl border rounded-b mt-1 max-h-[70vh] overflow-y-auto z-50">
                  {productResults.map((prod) => {
                    const stock =
                      prod.inventory?.reduce(
                        (a: any, b: any) => a + b.quantity,
                        0,
                      ) || 0;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center group"
                      >
                        <div>
                          <div className="font-bold text-gray-700 group-hover:text-blue-600">
                            {prod.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU: {prod.sku} | ĐVT: {prod.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {formatMoney(Number(prod.retail_price))}
                          </div>
                          <div
                            className={`text-xs ${stock <= 0 ? "text-red-500 font-bold" : "text-gray-400"}`}
                          >
                            Tồn: {stock}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. TABS LIST (Multi-invoices) */}
            <div className="flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar pb-0">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setActiveInvoice(inv.id)}
                  className={`
                     group relative p-[9px] rounded-t-md font-bold cursor-pointer text-xs min-w-[100px] text-center flex items-center justify-between select-none transition-all
                     ${
                       inv.id === activeInvoiceId
                         ? "bg-white text-[#0070f3] shadow-sm translate-y-0 z-10"
                         : "bg-blue-500 text-white/80 hover:bg-blue-400 translate-y-1 hover:translate-y-0.5"
                     }
                   `}
                >
                  <span className="truncate max-w-[80px]">{inv.label}</span>
                  <X
                    size={12}
                    className={`ml-2 rounded-full p-0.5 hover:bg-red-500 hover:text-white transition-colors ${inv.id === activeInvoiceId ? "text-gray-400" : "text-white/50"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeInvoice(inv.id);
                    }}
                  />
                </div>
              ))}
              <button
                onClick={addInvoice}
                className="mb-1 text-white/70 hover:text-white hover:bg-white/20 p-1 rounded transition-colors"
                title="Thêm hóa đơn mới"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="text-white flex items-center gap-2">
            <button className="hover:bg-white/10 p-1.5 rounded">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* CART TABLE */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col relative">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f4f7] text-gray-600 sticky top-0 z-10 text-xs font-bold uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 w-10"></th>
                  <th className="p-3 w-32">Mã hàng</th>
                  <th className="p-3">Tên hàng</th>
                  <th className="p-3 w-16 text-center">ĐVT</th>
                  <th className="p-3 w-20 text-center">SL</th>
                  <th className="p-3 w-32 text-right">Giá bán</th>
                  <th className="p-3 w-32 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center p-20 text-gray-400 select-none"
                    >
                      <FileText size={48} className="mb-2 opacity-20 mx-auto" />
                      <p>Giỏ hàng trống</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => {
                    const isLowStock = item.stock <= 0;
                    const isLowPrice = item.price < item.cost_price;

                    return (
                      <tr
                        key={item.product_id}
                        className={`hover:bg-[#f8fbff] group transition-colors ${isLowStock || isLowPrice ? "bg-red-50/50" : ""}`}
                      >
                        <td className="p-2 text-center text-gray-500">
                          {index + 1}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                        <td className="p-2 text-gray-600 font-medium">
                          {item.sku}
                        </td>
                        <td className="p-2 font-medium text-gray-800">
                          {item.name}
                          {/* CẢNH BÁO TỒN KHO */}
                          {isLowStock && (
                            <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold mt-0.5 animate-pulse">
                              <AlertCircle size={10} /> Hết hàng (Tồn:{" "}
                              {item.stock})
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-center text-gray-500 text-xs">
                          {item.unit}
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-16 text-center border border-gray-300 rounded focus:border-blue-500 outline-none py-1 font-bold text-gray-700 hover:border-gray-400"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItem(
                                item.product_id,
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                          />
                        </td>
                        <td className="p-2 text-right">
                          <div className="relative">
                            <input
                              type="number"
                              className={`w-28 text-right border-b border-dashed border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1 font-medium ${isLowPrice ? "text-red-600 font-bold" : ""}`}
                              value={item.price}
                              onChange={(e) =>
                                updateCartItem(
                                  item.product_id,
                                  "price",
                                  Number(e.target.value),
                                )
                              }
                            />
                            {/* CẢNH BÁO GIÁ VỐN */}
                            {isLowPrice && (
                              <div className="flex items-center justify-end gap-1 text-[9px] text-red-600 font-bold absolute right-0 -bottom-3 whitespace-nowrap">
                                <AlertTriangle size={8} /> Thấp hơn giá vốn
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          {formatMoney(item.quantity * item.price)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-white border-t border-gray-200 p-2 shrink-0">
          <div className="relative">
            <FileText
              className="absolute top-2.5 left-3 text-gray-400"
              size={16}
            />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-blue-500 text-sm"
              placeholder={`Ghi chú cho ${activeData?.label}...`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: PAYMENT PANEL ================= */}
      <div className="w-[350px] bg-white flex flex-col h-full shadow-lg z-30 border-l border-gray-200">
        {/* 1. HEADER: STAFF + TIME */}
        <div className="flex border-b border-gray-200 bg-gray-50 p-2 gap-2 h-12 items-center">
          <div className="flex-1 relative bg-white border border-gray-300 rounded px-2 py-1 flex items-center hover:border-blue-400 transition-colors">
            <User size={14} className="text-gray-500 mr-2" />
            <select
              className="w-full bg-transparent outline-none text-sm font-medium text-gray-700 appearance-none cursor-pointer"
              value={selectedStaff?.id || ""}
              onChange={(e) =>
                setStaff(staffs.find((s: any) => s.id === e.target.value))
              }
            >
              <option value="">Chọn nhân viên</option>
              {staffs.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="text-gray-400 ml-1 pointer-events-none"
            />
          </div>
          <div className="flex flex-col items-end justify-center px-1">
            <div className="text-xs font-medium text-gray-700">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="text-[10px] text-gray-500">
              {format(currentTime, "dd/MM/yyyy")}
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER INFO */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="relative mb-2">
            {selectedPartner ? (
              <div className="flex justify-between items-start bg-[#f0f9ff] p-2 rounded border border-blue-200 shadow-sm relative">
                <div className="flex items-start gap-2 overflow-hidden w-full pr-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 mt-1">
                    KH
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-bold text-blue-800 text-sm truncate">
                      {selectedPartner.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedPartner.phone}
                    </div>

                    {/* HIỂN THỊ NỢ CŨ */}
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded border border-red-100">
                        Nợ cũ:{" "}
                        {formatMoney(Number(selectedPartner.current_debt))}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPartner(null)}
                  className="absolute top-1 right-1 text-gray-400 hover:text-red-500 p-1 hover:bg-white rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <input
                    className="w-full pl-2 pr-8 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none text-sm"
                    placeholder="Tìm khách (F4)..."
                    value={customerSearch}
                    onChange={(e) => handleSearchCustomer(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                  <Search
                    className="absolute right-2 top-2.5 text-gray-400"
                    size={16}
                  />
                </div>
                <button
                  onClick={() => setIsCreateCustomerOpen(true)}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                  title="Thêm khách mới"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
            {/* Customer Dropdown */}
            {showCustomerDropdown &&
              customerResults.length > 0 &&
              !selectedPartner && (
                <div className="absolute top-full left-0 w-full bg-white shadow-xl border rounded mt-1 z-50 max-h-64 overflow-y-auto">
                  {customerResults.map((cus) => (
                    <div
                      key={cus.id}
                      onClick={() => {
                        setPartner(cus);
                        setShowCustomerDropdown(false);
                        setCustomerSearch("");
                      }}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b"
                    >
                      <div className="font-bold text-sm text-gray-800">
                        {cus.name}
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">{cus.phone}</span>
                        <span
                          className={
                            Number(cus.current_debt) > 0
                              ? "text-red-500"
                              : "text-green-600"
                          }
                        >
                          Nợ: {formatMoney(Number(cus.current_debt))}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div
                    className="p-2 text-center text-blue-600 font-bold cursor-pointer hover:bg-blue-50 border-t flex items-center justify-center gap-2"
                    onClick={() => {
                      setIsCreateCustomerOpen(true);
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <PlusCircle size={16} /> Thêm khách hàng mới
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* 3. CALCULATION & PAYMENT */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-medium">Tổng tiền hàng</span>
            <span className="text-sm bg-gray-200 px-1.5 rounded text-gray-600 font-bold">
              {cart.length}
            </span>
            <span className="font-bold text-gray-900 text-base">
              {formatMoney(totalMerchandise)}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Giảm giá</span>
            <div className="flex items-center bg-white border border-gray-300 rounded w-32 h-8 px-2 focus-within:border-blue-500">
              <input
                type="number"
                className="w-full text-right outline-none bg-transparent font-medium text-gray-800 text-sm"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <span>Thu khác (VAT)</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-white border border-gray-300 rounded px-1 h-8 text-xs outline-none cursor-pointer"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
              >
                <option value={0}>0%</option>
                <option value={8}>8%</option>
                <option value={10}>10%</option>
              </select>
              <div className="w-32 text-right font-medium text-gray-800 border-b border-dashed border-gray-300 py-1">
                {formatMoney(totalTax)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-300 my-1"></div>

          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800 text-base">
              Khách cần trả
            </span>
            <span className="font-bold text-xl text-blue-600">
              {formatMoney(totalPayment)}
            </span>
          </div>

          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-blue-800 font-bold">Khách thanh toán</span>
            </div>
            <div className="relative w-full">
              <input
                type="text"
                className="w-full text-right border border-blue-300 rounded py-2 pl-2 pr-12 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm"
                value={amountPaid ? amountPaid.toLocaleString("vi-VN") : ""}
                onChange={handleAmountChange}
                onFocus={(e) => e.target.select()}
                placeholder="0"
              />
              <span className="absolute right-3 top-3 text-gray-500 text-xs font-bold pointer-events-none">
                VNĐ
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              {["cash", "transfer", "card"].map((method) => (
                <label
                  key={method}
                  className={`flex-1 cursor-pointer flex items-center justify-center gap-1 px-1 py-1.5 rounded text-xs border transition-all ${paymentMethod === method ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    className="hidden"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  {method === "cash"
                    ? "Tiền mặt"
                    : method === "transfer"
                      ? "CK"
                      : "Thẻ"}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2">
            {amountPaid >= totalPayment ? (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tiền thừa trả khách</span>
                <span className="font-bold text-gray-800 text-base">
                  {formatMoney(amountPaid - totalPayment)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">
                  Tính vào công nợ
                </span>
                <span className="font-bold text-red-500 text-base">
                  {formatMoney(totalPayment - amountPaid)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4. FOOTER BUTTON (DISABLED IF ERROR) */}
        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={handlePayment}
            disabled={isProcessing || hasError || cart.length === 0}
            className={`
                w-full font-bold text-lg py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all 
                ${
                  hasError || cart.length === 0
                    ? "bg-gray-400 cursor-not-allowed text-gray-200"
                    : "bg-[#0070f3] hover:bg-blue-600 text-white hover:shadow-lg active:scale-[0.99]"
                }
              `}
          >
            {isProcessing
              ? "Đang xử lý..."
              : hasError
                ? "Lỗi (Xem lại giỏ hàng)"
                : "THANH TOÁN (F9)"}
          </button>
        </div>
      </div>
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
