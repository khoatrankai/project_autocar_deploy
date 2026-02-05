/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  FileSpreadsheet,
  Upload,
  Printer,
  Settings,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Modal } from "antd";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { usePurchaseOrderStore } from "../../store/usePurchaseOrderStore";
import { purchaseOrderService } from "../../services/purchaseOrderService";
import { productService } from "../../services/productService";
import { supplierService } from "../../services/supplierService";

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
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { filterOptions, fetchFilterOptions } = usePurchaseOrderStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Init Data
  useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
      fetchSuppliers();
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
  }, [isOpen]);

  const fetchSuppliers = async () => {
    try {
      const res = await supplierService.getSuppliers({ page: 1, limit: 100 });
      setSuppliers(res.data);
    } catch (error) {
      console.error(error);
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

  // --- 1. XỬ LÝ NHẬP FILE (IMPORT) ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          toast.error("File Excel không hợp lệ");
          return;
        }

        const newItems: ImportItem[] = [];
        const skuSet = new Set(items.map((i) => i.sku)); // Tránh trùng sản phẩm đã có

        const promises: Promise<void>[] = [];

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Bỏ qua dòng tiêu đề

          // ĐỌC DỮ LIỆU THEO CẤU TRÚC MỚI (Có cột STT ở đầu)
          // Cột 1: STT
          // Cột 2: Mã hàng (SKU)
          // Cột 3: Tên hàng
          // Cột 4: ĐVT
          // Cột 5: SL (Số lượng)
          // Cột 6: Đơn giá

          const sku = row.getCell(2).text?.toString().trim(); // Lấy Mã hàng ở cột 2
          const quantity = Number(row.getCell(5).value) || 1; // Lấy SL ở cột 5
          const price = Number(row.getCell(6).value) || 0; // Lấy Đơn giá ở cột 6

          if (sku && !skuSet.has(sku)) {
            // Gọi API lấy thông tin chi tiết sản phẩm từ Mã hàng (SKU)
            const p = productService
              .getProducts({ search: sku, limit: 1, page: 1 })
              .then((res) => {
                const product = res.data?.data?.find((p: any) => p.sku === sku);
                if (product) {
                  newItems.push({
                    product_id: Number(product.id),
                    sku: product.sku,
                    name: product.name,
                    quantity: quantity,
                    import_price:
                      price > 0 ? price : Number(product.cost_price), // Nếu file không có giá thì lấy giá vốn
                    unit: product.unit || "Cái",
                    image_url: product.image_url,
                  });
                  skuSet.add(sku);
                }
              })
              .catch((err) => console.error(`Lỗi lấy SKU ${sku}`, err));

            promises.push(p);
          }
        });

        toast.loading("Đang xử lý dữ liệu...");
        await Promise.all(promises);
        toast.dismiss();

        if (newItems.length > 0) {
          setItems((prev) => [...prev, ...newItems]);
          toast.success(`Đã thêm ${newItems.length} sản phẩm`);
        } else {
          toast("Không tìm thấy sản phẩm nào hợp lệ hoặc mã hàng chưa đúng.");
        }
      } catch (error) {
        console.error("Lỗi đọc excel", error);
        toast.error("Lỗi đọc file Excel");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // --- 2. TẠO FILE MẪU (EXPORT TEMPLATE) ---
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mau_Nhap_Hang");

    // Định nghĩa cột khớp với hình ảnh: STT | Mã hàng | Tên hàng | ĐVT | SL | Đơn giá | Thành tiền
    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Mã hàng (*)", key: "sku", width: 20 },
      { header: "Tên hàng", key: "name", width: 35 },
      { header: "ĐVT", key: "unit", width: 10 },
      { header: "SL (*)", key: "quantity", width: 10 },
      { header: "Đơn giá", key: "price", width: 15 },
      { header: "Thành tiền", key: "total", width: 15 },
    ];

    // Style cho Header (Màu xanh, chữ trắng đậm)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" },
    };

    // Căn giữa cho tiêu đề
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Thêm dữ liệu mẫu
    const sampleData = [
      {
        stt: 1,
        sku: "SP001",
        name: "Sản phẩm mẫu A",
        unit: "Cái",
        quantity: 10,
        price: 150000,
      },
      {
        stt: 2,
        sku: "SP002",
        name: "Sản phẩm mẫu B",
        unit: "Hộp",
        quantity: 5,
        price: 200000,
      },
    ];

    sampleData.forEach((row) => {
      const r = worksheet.addRow({
        ...row,
        total: row.quantity * row.price, // Tự tính thành tiền cho đẹp
      });
      // Căn giữa các cột ngắn
      r.getCell(1).alignment = { horizontal: "center" }; // STT
      r.getCell(4).alignment = { horizontal: "center" }; // ĐVT
      r.getCell(5).alignment = { horizontal: "center" }; // SL
    });

    // Xuất file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Mau_Nhap_Hang.xlsx");
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.import_price,
    0,
  );
  const finalAmount = Math.max(0, totalAmount - formData.discount);

  const handleSubmit = async (status: "draft" | "completed") => {
    if (!formData.supplier_id) return toast.error("Vui lòng chọn Nhà cung cấp");
    setIsLoading(true);
    try {
      const payload = {
        ...formData,
        supplier_id: Number(formData.supplier_id),
        warehouse_id: Number(formData.warehouse_id),
        staff_id: formData.staff_id || undefined,
        status,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          import_price: i.import_price,
        })),
      };

      await purchaseOrderService.create(payload);
      toast.success(
        status === "draft" ? "Đã lưu phiếu tạm" : "Đã nhập hàng thành công!",
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi xử lý");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="100%"
      style={{ padding: 0, alignItems: "center", maxWidth: "100vw" }}
      // styles={{
      //   container: {
      //     padding: 0,
      //     height: "100vh",
      //     borderRadius: 0,
      //     overflow: "hidden",
      //   },
      // }}
      maskClosable={false}
    >
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        {/* === HEADER === */}
        <div className="h-14 flex-none flex justify-between items-center px-4 border-b border-gray-200 bg-white z-20 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">Nhập hàng</h2>
          </div>

          {/* Search Bar - Center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px]">
            <div className="relative group">
              <Search
                className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500"
                size={18}
              />
              <input
                autoFocus
                type="text"
                placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all text-sm"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {isSearching ? (
                <Loader2
                  className="absolute right-2.5 top-2.5 animate-spin text-blue-600"
                  size={18}
                />
              ) : (
                <div className="absolute right-2 top-2 text-xs text-gray-400 border border-gray-200 rounded px-1.5 bg-white select-none">
                  F3
                </div>
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
                      <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] flex items-center justify-center h-full text-gray-400">
                            IMG
                          </span>
                        )}
                      </div>
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
                          SKU: {prod.sku} | Tồn:{" "}
                          {prod.inventory?.reduce(
                            (a: any, b: any) => a + b.quantity,
                            0,
                          ) || 0}
                        </div>
                      </div>
                      <Plus className="text-blue-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded">
              <Printer size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded">
              <Settings size={20} />
            </button>
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
                // --- EMPTY STATE ---
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4 bg-white">
                  <FileSpreadsheet
                    size={64}
                    className="text-gray-300"
                    strokeWidth={1}
                  />
                  <div className="text-center">
                    <p className="font-medium text-lg text-gray-700">
                      Thêm sản phẩm từ file excel
                    </p>
                    <p
                      className="text-sm text-blue-500 cursor-pointer hover:underline"
                      onClick={handleDownloadTemplate}
                    >
                      (Tải về file mẫu: Excel file)
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded hover:bg-blue-700 transition-colors shadow-sm font-medium"
                  >
                    <Upload size={18} /> Chọn file dữ liệu
                  </button>
                </div>
              ) : (
                // --- LIST ITEMS ---
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
                          className="w-full text-center border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1"
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
                          type="number"
                          min="0"
                          className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-1"
                          value={item.import_price}
                          onChange={(e) =>
                            handleUpdateItem(
                              idx,
                              "import_price",
                              Number(e.target.value),
                            )
                          }
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
              {/* ... (User info, supplier, warehouse, info fields, money calculation - same as before) */}
              {/* User Info */}
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                    NV
                  </div>
                  <span className="font-medium text-gray-700">Admin</span>
                </div>
                <span>
                  {new Date().toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Supplier */}
              <div className="relative group">
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm outline-none appearance-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                  value={formData.supplier_id}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier_id: e.target.value })
                  }
                >
                  <option value="">Tìm nhà cung cấp</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                />
              </div>

              {/* Info Fields */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Mã phiếu nhập</span>
                  <input
                    className="w-40 text-right border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 text-gray-500 placeholder-gray-400 bg-gray-50"
                    placeholder="Mã tự động"
                    readOnly
                    value={formData.code}
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Trạng thái</span>
                  <span className="font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                    Phiếu tạm
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Người nhập</span>
                  <div className="relative w-40">
                    <select
                      className="w-full text-right border-b border-gray-200 outline-none focus:border-blue-500 bg-transparent py-1 appearance-none pr-4 cursor-pointer"
                      value={formData.staff_id}
                      onChange={(e) =>
                        setFormData({ ...formData, staff_id: e.target.value })
                      }
                    >
                      <option value="">(Tôi)</option>
                      {filterOptions.staffs.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-0 top-1.5 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Kho nhập</span>
                  <select
                    className="w-40 text-right border-b border-gray-200 outline-none focus:border-blue-500 bg-transparent py-1 cursor-pointer"
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
                </div>
              </div>

              {/* Money */}
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
                  <div className="flex items-center w-32 border-b border-gray-200 focus-within:border-blue-500">
                    <input
                      type="number"
                      className="w-full text-right outline-none bg-transparent py-1 pr-1"
                      value={formData.discount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-2">
                  <span className="text-gray-700">Cần trả nhà cung cấp</span>
                  <span className="text-blue-600 text-lg">
                    {finalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Tiền trả NCC</span>
                  <div className="flex items-center w-32 border-b border-blue-500 focus-within:border-blue-700">
                    <input
                      type="number"
                      className="w-full text-right outline-none bg-transparent py-1 pr-1 font-medium text-gray-800"
                      value={formData.paid_amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paid_amount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-blue-500 resize-none placeholder-gray-400"
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
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded font-bold hover:bg-blue-700 transition-colors shadow-sm text-sm disabled:opacity-70 flex flex-col items-center justify-center leading-none gap-1"
              >
                <span className="text-xs font-normal opacity-80 uppercase">
                  F4
                </span>
                <span>Lưu tạm</span>
              </button>
              <button
                onClick={() => handleSubmit("completed")}
                disabled={isLoading}
                className="flex-1 bg-green-500 text-white py-2.5 rounded font-bold hover:bg-green-600 transition-colors shadow-sm text-sm disabled:opacity-70 flex flex-col items-center justify-center leading-none gap-1"
              >
                <span className="text-xs font-normal opacity-80 uppercase">
                  F9
                </span>
                <span>Hoàn thành</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
