import { useState } from "react";
import { useLogin, useRegister } from "../hooks/useAuth";
import {
  Car,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { UserRole } from "../types/auth";
import { ThemeSwitcher } from "../components/shared/ThemeSwitcher"; // <--- 1. Import ThemeSwitcher

export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone_number: "",
    role: UserRole.SALE,
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        role: formData.role,
      });
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData((prev) => ({ ...prev, password: "" }));
  };

  return (
    // Sửa 1: Thay bg-slate-50 bằng bg-background, thêm text-foreground
    <div className="min-h-screen w-full flex bg-background text-foreground transition-colors duration-300">
      {/* --- NÚT ĐỔI THEME (Góc trên phải) --- */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>

      {/* --- PHẦN 1: HÌNH ẢNH BRANDING (Desktop) --- */}
      {/* Sửa 2: Thay bg-slate-900 bằng bg-muted (hoặc màu tối của theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted relative justify-center items-center overflow-hidden border-r border-border">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1920&auto=format&fit=crop"
          alt="Luxury Car"
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
        {/* Lớp phủ màu primary để ảnh hòa trộn với theme */}
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />

        <div className="relative z-10 p-12 max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            {/* Sửa 3: Icon background dùng bg-primary, text dùng text-primary-foreground */}
            <div className="p-3 bg-primary text-primary-foreground rounded-lg shadow-lg">
              <Car size={32} />
            </div>
            {/* Text bên branding này nên giữ màu đậm/tương phản cao vì nền ảnh tối, hoặc dùng text-foreground nếu nền sáng */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-white drop-shadow-md">
              AutoCar Admin
            </h1>
          </div>
          <p className="text-lg text-muted-foreground lg:text-slate-200 mb-8 font-medium drop-shadow-sm">
            Hệ thống quản lý phụ tùng, kho bãi và nhân sự chuyên nghiệp hàng
            đầu.
          </p>
        </div>
      </div>

      {/* --- PHẦN 2: FORM NHẬP LIỆU --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 slide-in-from-bottom-10">
          {/* Header Mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex p-3 bg-primary text-primary-foreground rounded-lg mb-4">
              <Car size={32} />
            </div>
            <h2 className="text-2xl font-bold">AutoCar Admin</h2>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">
              {isLoginMode ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h2>
            {/* Sửa 4: Thay text-slate-600 bằng text-muted-foreground */}
            <p className="mt-2 text-muted-foreground">
              {isLoginMode
                ? "Vui lòng nhập thông tin để truy cập hệ thống."
                : "Điền thông tin bên dưới để đăng ký nhân viên mới."}
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {!isLoginMode && (
              <>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <User size={20} />
                  </div>
                  {/* Sửa 5: Input dùng bg-background, border-input, ring-ring */}
                  <input
                    name="full_name"
                    type="text"
                    required
                    placeholder="Họ và tên"
                    className="block w-full pl-10 pr-3 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all placeholder:text-muted-foreground"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Phone size={20} />
                  </div>
                  <input
                    name="phone_number"
                    type="text"
                    placeholder="Số điện thoại"
                    className="block w-full pl-10 pr-3 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all placeholder:text-muted-foreground"
                    value={formData.phone_number}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Mail size={20} />
              </div>
              <input
                name="email"
                type="email"
                required
                placeholder="Email đăng nhập"
                className="block w-full pl-10 pr-3 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all placeholder:text-muted-foreground"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Lock size={20} />
              </div>
              <input
                name="password"
                type="password"
                required
                placeholder="Mật khẩu"
                minLength={6}
                className="block w-full pl-10 pr-3 py-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all placeholder:text-muted-foreground"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* Sửa 6: Button dùng bg-primary, text-primary-foreground */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-md text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Đang xử
                  lý...
                </>
              ) : (
                <>
                  {isLoginMode ? "Đăng Nhập" : "Đăng Ký"}{" "}
                  <ArrowRight className="ml-2" size={18} />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {isLoginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              {/* Sửa 7: Link dùng text-primary */}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-primary hover:underline transition"
              >
                {isLoginMode ? "Đăng ký ngay" : "Đăng nhập tại đây"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
