/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react"; // Thêm useEffect, useState
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Globe,
  Bell,
  Settings,
  ChevronDown,
  Store,
  Menu,
  LogOut,
  User,
  KeyRound,
  Check, // Thêm icon Check
} from "lucide-react";
import { ThemeSwitcher } from "../components/shared/ThemeSwitcher";
import { useAuthStore } from "../store/useAuthStore";
import { useProductStore } from "../store/useProductStore"; // Import Store
import { useManagerStore } from "../store/useManager";

// --- DỮ LIỆU MENU MEGA (Giữ nguyên) ---
const PRODUCT_MENU = [
  {
    title: "Hàng hóa",
    items: [
      { label: "Danh sách hàng hóa", path: "/products" },
      { label: "Thiết lập giá", path: "/products/price-setting" },
    ],
  },
  {
    title: "Kho hàng",
    items: [
      { label: "Chuyển hàng", path: "/products/transfer" },
      { label: "Kiểm kho", path: "/products/inventory-check" },
      { label: "Xuất hủy", path: "/products/dispose" },
    ],
  },
  {
    title: "Nhập hàng",
    items: [
      { label: "Hóa đơn đầu vào", path: "/products/invoices" },
      { label: "Nhà cung cấp", path: "/suppliers" },
      { label: "Nhập hàng", path: "/products/import" },
      { label: "Trả hàng nhập", path: "/products/return" },
    ],
  },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuthStore();

  // 1. Lấy danh sách kho từ store
  const { filterOptions, fetchFilterOptions } = useProductStore();
  const { setWarehouseManager, warehouse_manager } = useManagerStore();

  // 2. State lưu chi nhánh đang chọn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  // 3. Logic khởi tạo và đồng bộ LocalStorage
  useEffect(() => {
    const locations = filterOptions?.locations || [];
    // Thử lấy từ LocalStorage
    const savedBranch = localStorage.getItem("selected_branch") as any;
    console.log("vao ch", savedBranch);
    if (savedBranch) {
      try {
        const parsed = JSON.parse(savedBranch);
        console.log("v2");
        setWarehouseManager(parsed?.id);
        console.log("oke ");
        // Kiểm tra xem branch đã lưu có còn tồn tại trong danh sách mới không (optional)
        setSelectedBranch(parsed);
      } catch (e) {
        console.error("Lỗi parse branch từ storage", e);
      }
    }

    // Nếu chưa có selectedBranch (hoặc localStorage rỗng) và data đã load xong
    if (!selectedBranch && locations.length > 0 && !savedBranch) {
      const defaultBranch = locations[0];
      setSelectedBranch(defaultBranch);
      localStorage.setItem("selected_branch", JSON.stringify(defaultBranch));
      console.log("v1");
      setWarehouseManager(defaultBranch?.id);
      console.log("oke 1");
    }
  }, [filterOptions?.locations]); // Chạy lại khi danh sách kho thay đổi

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    console.log(warehouse_manager, "day11");
  }, [warehouse_manager]);
  // 4. Hàm xử lý khi chọn chi nhánh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectBranch = (branch: any) => {
    setSelectedBranch(branch);
    localStorage.setItem("selected_branch", JSON.stringify(branch));
    console.log("v3");
    setWarehouseManager(branch?.id);
    // Có thể thêm window.location.reload() nếu cần refresh dữ liệu toàn trang theo kho
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getNavLinkClass = (path: string) => {
    const isActive =
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path);
    return `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer h-full select-none
            ${isActive ? "bg-white/20 text-white shadow-inner" : "text-primary-foreground/90 hover:bg-white/10 hover:text-white"}`;
  };

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* === TOP BAR === */}
      <header className="flex-none bg-card border-b border-border shadow-sm z-30 relative">
        <div className="flex justify-between items-center px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-xl text-primary"
            >
              <span className="bg-primary text-primary-foreground p-1 rounded text-sm">
                AC
              </span>
              <span className="hidden sm:inline">AutoCar Admin</span>
            </Link>
          </div>

          {/* Tiện ích phải */}
          <div className="flex items-center gap-4 text-sm font-medium text-foreground">
            <div className="hidden md:block">
              <ThemeSwitcher />
            </div>

            {/* --- BRANCH SELECTOR (ĐÃ CHỈNH SỬA) --- */}
            <div className="relative group h-full flex items-center">
              <div className="hidden md:flex items-center gap-1 cursor-pointer hover:text-primary transition-colors py-2">
                <Store size={18} />
                <span className="uppercase font-semibold max-w-[150px] truncate">
                  {selectedBranch?.name || "Chọn chi nhánh"}
                </span>
                <ChevronDown
                  size={14}
                  className="group-hover:rotate-180 transition-transform duration-200"
                />
              </div>

              {/* Dropdown Menu Chi Nhánh */}
              <div
                className="absolute right-0 top-full mt-0 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 overflow-hidden 
                           invisible opacity-0 translate-y-2 
                           group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 
                           transition-all duration-200 ease-in-out"
              >
                {/* Cầu nối tàng hình */}
                <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>

                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  Chuyển chi nhánh làm việc
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {filterOptions?.locations?.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    filterOptions.locations.map((branch: any) => (
                      <button
                        key={branch.id}
                        onClick={() => handleSelectBranch(branch)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between group/item hover:bg-blue-50 transition-colors
                          ${selectedBranch?.id === branch.id ? "text-primary font-bold bg-blue-50/50" : "text-gray-700"}
                        `}
                      >
                        <span className="truncate">{branch.name}</span>
                        {selectedBranch?.id === branch.id && (
                          <Check size={16} className="text-primary" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">
                      Đang tải danh sách...
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* --- END BRANCH SELECTOR --- */}

            <div className="flex items-center gap-3 text-muted-foreground border-l border-border pl-4">
              <button className="hover:text-primary transition-colors relative">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  3
                </span>
              </button>

              <button className="hover:text-primary transition-colors">
                <Settings size={20} />
              </button>

              {/* --- USER MENU (HOVER VERSION) --- */}
              <div className="relative group h-full flex items-center">
                {/* Avatar Button */}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold cursor-pointer group-hover:bg-primary group-hover:text-white transition-colors select-none">
                  {user?.full_name
                    ? user.full_name.charAt(0).toUpperCase()
                    : "A"}
                </div>

                {/* Dropdown Content */}
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 overflow-hidden 
                                invisible opacity-0 translate-y-2 
                                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 
                                transition-all duration-200 ease-in-out"
                >
                  <div className="absolute -top-4 left-0 w-full h-4 bg-transparent"></div>

                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user?.full_name || "Admin User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {user?.email || "admin@example.com"}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                      {user?.role || "Quản trị viên"}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => navigate("/profile")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User size={16} /> Hồ sơ cá nhân
                    </button>

                    <button
                      onClick={() => navigate("/change-password")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <KeyRound size={16} /> Đổi mật khẩu
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut size={16} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
              {/* --- END USER MENU --- */}
            </div>
          </div>
        </div>
      </header>

      {/* === NAV BAR (Giữ nguyên) === */}
      <nav className="flex-none bg-primary text-primary-foreground shadow-md z-20 relative">
        <div className="flex justify-between items-center px-2 h-12">
          <div className="flex items-center h-full">
            <Link to="/" className={getNavLinkClass("/")}>
              <LayoutDashboard size={18} /> Tổng quan
            </Link>

            <div className="group h-full relative flex items-center">
              <Link to="/products" className={getNavLinkClass("/products")}>
                <Package size={18} /> Hàng hóa{" "}
                <ChevronDown
                  size={14}
                  className="mt-0.5 ml-1 transition-transform group-hover:rotate-180"
                />
              </Link>
              <div className="hidden group-hover:block absolute top-full left-0 w-[600px] bg-card text-card-foreground shadow-2xl rounded-b-md border border-border/20 p-6 animate-in fade-in slide-in-from-top-1 duration-200 z-[60]">
                <div className="absolute -top-1.5 left-12 w-4 h-4 bg-card rotate-45 border-l border-t border-border/20"></div>
                <div className="grid grid-cols-3 gap-8">
                  {PRODUCT_MENU.map((section, index) => (
                    <div key={index} className="flex flex-col gap-3">
                      <h4 className="font-bold text-sm text-foreground uppercase border-b border-border/40 pb-2">
                        {section.title}
                      </h4>
                      <div className="flex flex-col gap-2">
                        {section.items.map((item, idx) => (
                          <Link
                            key={idx}
                            to={item.path}
                            className="text-sm text-muted-foreground hover:text-primary hover:translate-x-1 transition-all flex items-center gap-2"
                          >
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link to="/orders" className={getNavLinkClass("/orders")}>
              <ShoppingCart size={18} /> Đơn hàng
            </Link>
            <Link to="/customers" className={getNavLinkClass("/customers")}>
              <Users size={18} /> Khách hàng
            </Link>
            <Link to="/reports" className={getNavLinkClass("/reports")}>
              <BarChart3 size={18} /> Phân tích
            </Link>
            <Link to="/online" className={getNavLinkClass("/online")}>
              <Globe size={18} /> Bán Online
            </Link>
          </div>

          <div className="flex items-center gap-2 pr-2">
            <button className="hidden md:flex items-center gap-2 bg-background text-primary px-4 py-1.5 rounded font-bold hover:bg-secondary transition-colors shadow-sm whitespace-nowrap">
              <ShoppingCart size={18} /> Bán hàng
            </button>
            <button className="md:hidden text-primary-foreground p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* === CONTENT === */}
      <main className="flex-1 overflow-auto bg-muted/10 p-4 relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
