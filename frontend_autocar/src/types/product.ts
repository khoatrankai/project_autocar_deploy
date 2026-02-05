// src/types/product.ts
export interface Product {
  id: string;
  code: string; // Mã hàng (VD: 4056A191)
  name: string; // Tên hàng
  cost_price: number; // Giá vốn
  brand: string; // Thương hiệu (Attrage, Mirage...)
  stock: number; // Tồn kho
  created_at: string; // Thời gian tạo
  is_favorite: boolean; // Dấu sao
}

export interface ProductAdvance {
  // --- CÁC TRƯỜNG ID (Backend đã .toString()) ---
  id: string;
  category_id?: string;
  supplier_id?: string;

  // --- THÔNG TIN CƠ BẢN (Mapping từ DB) ---
  sku: string; // Mã SKU
  name: string; // Tên sản phẩm

  // --- CÁC TRƯỜNG MỚI BỔ SUNG TỪ ẢNH DB ---
  oem_code?: string; // Mã OEM (Phụ tùng gốc)
  brand?: string; // Thương hiệu (Quan trọng cho bộ lọc)
  unit?: string; // Đơn vị tính (Cái, Bộ, Hộp...)

  image_url?: string;
  description?: string;
  status?: string; // (Optional - Có thể không có trong DB nhưng Frontend hay dùng)

  // --- CÁC TRƯỜNG GIÁ & SỐ (Backend đã convert sang Number) ---
  cost_price: number; // Giá vốn
  retail_price: number; // Giá bán lẻ

  // --- CÁC TRƯỜNG SỐ MỚI BỔ SUNG TỪ ẢNH DB ---
  last_import_price?: number; // Giá nhập gần nhất
  min_stock_alert?: number; // Định mức tồn kho tối thiểu (Cảnh báo khi thấp hơn mức này)

  // --- CÁC TRƯỜNG TÍNH TOÁN (Analytics) ---
  average_daily_sales: number; // Tốc độ bán trung bình/ngày
  estimated_stockout_days: number; // Dự kiến số ngày còn hàng

  // --- CÁC TRƯỜNG ĐÃ LÀM PHẲNG (Flattened - Từ Relation) ---
  category_name?: string; // Lấy từ bảng categories
  supplier_name?: string; // Lấy từ bảng suppliers

  // --- CÁC TRƯỜNG TỔNG HỢP (Calculated via Group By/Reduce) ---
  total_quantity: number; // Tổng tồn kho tất cả các kho
  locations: string; // Chuỗi danh sách vị trí
  compatibility: string; // Chuỗi các xe tương thích

  // --- THỜI GIAN ---
  created_at: string;
  updated_at?: string;
}

// Dữ liệu giả lập để test giao diện
export const MOCK_PRODUCTS: Product[] = [
  // --- Dữ liệu cũ ---
  {
    id: "1",
    code: "4056A191",
    name: "RÔ TUYN CÂN BẰNG TRƯỚC (CÁI)",
    cost_price: 367686,
    brand: "ATTRAGE, MIRAGE",
    stock: 0,
    created_at: "29/12/2025",
    is_favorite: true,
  },
  {
    id: "2",
    code: "SP005302",
    name: "NẮP ĐỔ DẦU MÁY (CÁI)",
    cost_price: 350000,
    brand: "SUZUKI ERTIGA",
    stock: 5,
    created_at: "29/12/2025",
    is_favorite: false,
  },
  {
    id: "3",
    code: "891700DC10",
    name: "HỘP ĐIỀU KHIỂN TÚI KHÍ TRUNG TÂM",
    cost_price: 3500000,
    brand: "VIOS, YARIS",
    stock: 0,
    created_at: "29/12/2025",
    is_favorite: false,
  },
  {
    id: "4",
    code: "U3768",
    name: "GIẢM SÓC TRƯỚC",
    cost_price: 630000,
    brand: "FORTUNER",
    stock: 12,
    created_at: "29/12/2025",
    is_favorite: true,
  },
  // --- Dữ liệu bổ sung ---
  {
    id: "5",
    code: "MZ-BP001",
    name: "MÁ PHANH TRƯỚC MAZDA 3",
    cost_price: 850000,
    brand: "MAZDA 3, MAZDA 6",
    stock: 24,
    created_at: "28/12/2025",
    is_favorite: true,
  },
  {
    id: "6",
    code: "FR-HL99",
    name: "ĐÈN PHA LED RANGER (TRÁI)",
    cost_price: 4500000,
    brand: "FORD RANGER",
    stock: 2,
    created_at: "28/12/2025",
    is_favorite: false,
  },
  {
    id: "7",
    code: "HD-AF111",
    name: "LỌC GIÓ ĐỘNG CƠ CITY",
    cost_price: 150000,
    brand: "HONDA CITY",
    stock: 100,
    created_at: "28/12/2025",
    is_favorite: false,
  },
  {
    id: "8",
    code: "TOY-SPK",
    name: "BUGI DENSO IRIDIUM",
    cost_price: 220000,
    brand: "TOYOTA, LEXUS",
    stock: 200,
    created_at: "27/12/2025",
    is_favorite: true,
  },
  {
    id: "9",
    code: "KIA-BM02",
    name: "CẢN TRƯỚC MORNING 2022",
    cost_price: 1200000,
    brand: "KIA MORNING",
    stock: 0,
    created_at: "27/12/2025",
    is_favorite: false,
  },
  {
    id: "10",
    code: "BS-WIPER",
    name: "GẠT MƯA BOSCH AEROTWIN",
    cost_price: 350000,
    brand: "ĐA DỤNG",
    stock: 50,
    created_at: "27/12/2025",
    is_favorite: false,
  },
  {
    id: "11",
    code: "HYU-AC",
    name: "LỐC ĐIỀU HÒA ACCENT",
    cost_price: 3800000,
    brand: "HYUNDAI ACCENT",
    stock: 3,
    created_at: "26/12/2025",
    is_favorite: true,
  },
  {
    id: "12",
    code: "MIC-TIRE",
    name: "LỐP MICHELIN 225/55R19",
    cost_price: 3200000,
    brand: "CX5, CRV",
    stock: 40,
    created_at: "26/12/2025",
    is_favorite: false,
  },
  {
    id: "13",
    code: "GS-BAT45",
    name: "BÌNH ẮC QUY GS 45AH",
    cost_price: 1100000,
    brand: "ĐA DỤNG",
    stock: 15,
    created_at: "26/12/2025",
    is_favorite: false,
  },
  {
    id: "14",
    code: "TOY-OIL",
    name: "LỌC DẦU CAMRY 2.5",
    cost_price: 180000,
    brand: "TOYOTA CAMRY",
    stock: 80,
    created_at: "25/12/2025",
    is_favorite: false,
  },
  {
    id: "15",
    code: "MZ-MIR",
    name: "GƯƠNG CHIẾU HẬU (PHẢI)",
    cost_price: 2500000,
    brand: "MAZDA CX5",
    stock: 4,
    created_at: "25/12/2025",
    is_favorite: true,
  },
  {
    id: "16",
    code: "IN-CLUTCH",
    name: "BỘ LY HỢP INNOVA",
    cost_price: 2800000,
    brand: "TOYOTA INNOVA",
    stock: 6,
    created_at: "25/12/2025",
    is_favorite: false,
  },
  {
    id: "17",
    code: "FD-TIMING",
    name: "DÂY CUROA CAM",
    cost_price: 950000,
    brand: "FORD EVEREST",
    stock: 12,
    created_at: "24/12/2025",
    is_favorite: false,
  },
  {
    id: "18",
    code: "DS-FPUMP",
    name: "BƠM XĂNG DENSO",
    cost_price: 1650000,
    brand: "TOYOTA VIOS",
    stock: 0,
    created_at: "24/12/2025",
    is_favorite: true,
  },
  {
    id: "19",
    code: "HD-SHOCK",
    name: "GIẢM SÓC SAU CRV",
    cost_price: 1400000,
    brand: "HONDA CRV",
    stock: 8,
    created_at: "24/12/2025",
    is_favorite: false,
  },
  {
    id: "20",
    code: "MZ-O2",
    name: "CẢM BIẾN OXY",
    cost_price: 1900000,
    brand: "MAZDA 3",
    stock: 5,
    created_at: "23/12/2025",
    is_favorite: false,
  },
  {
    id: "21",
    code: "KIA-FOG",
    name: "ĐÈN GẦM SELTOS",
    cost_price: 800000,
    brand: "KIA SELTOS",
    stock: 15,
    created_at: "23/12/2025",
    is_favorite: false,
  },
  {
    id: "22",
    code: "HYU-RAD",
    name: "KÉT NƯỚC SANTAFE",
    cost_price: 2800000,
    brand: "HYUNDAI SANTAFE",
    stock: 3,
    created_at: "23/12/2025",
    is_favorite: true,
  },
  {
    id: "23",
    code: "TOY-ALT",
    name: "MÁY PHÁT ĐIỆN FORTUNER",
    cost_price: 5200000,
    brand: "TOYOTA FORTUNER",
    stock: 1,
    created_at: "22/12/2025",
    is_favorite: true,
  },
  {
    id: "24",
    code: "MIT-EXP",
    name: "DÀN LẠNH XPANDER",
    cost_price: 3100000,
    brand: "MITSUBISHI XPANDER",
    stock: 0,
    created_at: "22/12/2025",
    is_favorite: false,
  },
  {
    id: "25",
    code: "CH-OIL",
    name: "DẦU NHỚT CASTROL 5W-30",
    cost_price: 950000,
    brand: "ĐA DỤNG",
    stock: 60,
    created_at: "22/12/2025",
    is_favorite: false,
  },
  {
    id: "26",
    code: "VINF-FAD",
    name: "GƯƠNG CHIẾU HẬU TRÁI",
    cost_price: 1800000,
    brand: "VINFAST FADIL",
    stock: 10,
    created_at: "21/12/2025",
    is_favorite: false,
  },
  {
    id: "27",
    code: "VINF-LUX",
    name: "MÁ PHANH SAU LUX A",
    cost_price: 2100000,
    brand: "VINFAST LUX A",
    stock: 7,
    created_at: "21/12/2025",
    is_favorite: true,
  },
  {
    id: "28",
    code: "MER-SW",
    name: "CÔNG TẮC LÊN KÍNH",
    cost_price: 4500000,
    brand: "MERCEDES C200",
    stock: 2,
    created_at: "21/12/2025",
    is_favorite: false,
  },
  {
    id: "29",
    code: "BMW-320",
    name: "LỌC GIÓ ĐIỀU HÒA BMW",
    cost_price: 1200000,
    brand: "BMW 320i",
    stock: 8,
    created_at: "20/12/2025",
    is_favorite: false,
  },
  {
    id: "30",
    code: "AUD-Q5",
    name: "BƠM NƯỚC AUDI Q5",
    cost_price: 6800000,
    brand: "AUDI Q5",
    stock: 1,
    created_at: "20/12/2025",
    is_favorite: true,
  },
  {
    id: "31",
    code: "CHE-COL",
    name: "DÂY CUROA TỔNG",
    cost_price: 700000,
    brand: "CHEVROLET COLORADO",
    stock: 14,
    created_at: "20/12/2025",
    is_favorite: false,
  },
  {
    id: "32",
    code: "NIS-NAV",
    name: "GIẢM SÓC SAU NAVARA",
    cost_price: 1900000,
    brand: "NISSAN NAVARA",
    stock: 9,
    created_at: "19/12/2025",
    is_favorite: false,
  },
  {
    id: "33",
    code: "ISU-DMX",
    name: "LỌC NHIÊN LIỆU DMAX",
    cost_price: 350000,
    brand: "ISUZU DMAX",
    stock: 30,
    created_at: "19/12/2025",
    is_favorite: false,
  },
  {
    id: "34",
    code: "PEU-3008",
    name: "GẠT MƯA SAU PEUGEOT",
    cost_price: 450000,
    brand: "PEUGEOT 3008",
    stock: 12,
    created_at: "19/12/2025",
    is_favorite: false,
  },
  {
    id: "35",
    code: "SUB-FOR",
    name: "MÁ PHANH TRƯỚC SUBARU",
    cost_price: 2400000,
    brand: "SUBARU FORESTER",
    stock: 5,
    created_at: "18/12/2025",
    is_favorite: true,
  },
];

export type StockStatus =
  | "all"
  | "in_stock"
  | "out_of_stock"
  | "low_stock"
  | "over_stock";
export type DateRangeType = "all" | "custom";

export interface ProductFilterParams {
  page: number;
  limit: number;
  search?: string;

  // Các mảng ID (Backend nhận string[])
  categoryIds?: string[];
  supplierIds?: string[];
  brandIds?: string[];
  locationIds?: string[];

  stockStatus?: StockStatus;

  // Ngày dự kiến hết hàng (Phẳng hóa - Flatten)
  stockoutDateType?: DateRangeType;
  stockoutFrom?: string; // YYYY-MM-DD
  stockoutTo?: string; // YYYY-MM-DD

  // Ngày tạo (Phẳng hóa - Flatten)
  createdDateType?: DateRangeType;
  createdFrom?: string;
  createdTo?: string;
}

export interface FilterOption {
  id: string | number;
  label: string; // Hoặc 'name' tùy API trả về
}
