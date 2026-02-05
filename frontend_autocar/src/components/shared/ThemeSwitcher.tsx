// src/components/shared/ThemeSwitcher.tsx
import { useEffect, useState } from "react";
import { Moon, Sun, Shield } from "lucide-react"; // Import icon cho đẹp

export function ThemeSwitcher() {
  // 1. Khởi tạo state: Ưu tiên lấy từ LocalStorage trước, nếu không có thì mặc định 'light'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // 2. Set attribute cho HTML
    root.setAttribute("data-theme", theme);

    // 3. Lưu vào LocalStorage để lần sau vào lại vẫn nhớ
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Hàm tiện ích để xác định class active
  const getButtonClass = (activeName: string) => {
    const baseClass =
      "flex items-center gap-2 px-3 py-2 rounded-md border transition-all text-sm font-medium";
    const activeClass =
      "bg-primary text-primary-foreground border-primary shadow-sm";
    const inactiveClass =
      "bg-card text-foreground border-border hover:bg-accent hover:text-accent-foreground";

    return `${baseClass} ${theme === activeName ? activeClass : inactiveClass}`;
  };

  return (
    <div className="flex flex-wrap gap-2 p-1">
      {/* Nút Light */}
      <button
        onClick={() => setTheme("light")}
        className={getButtonClass("light")}
        title="Giao diện Sáng"
      >
        <Sun size={16} /> Light
      </button>

      {/* Nút Dark */}
      <button
        onClick={() => setTheme("dark")}
        className={getButtonClass("dark")}
        title="Giao diện Tối"
      >
        <Moon size={16} /> Dark
      </button>

      {/* Nút Military */}
      <button
        onClick={() => setTheme("military")}
        className={getButtonClass("military")}
        title="Giao diện xanh"
      >
        <Shield size={16} /> Military
      </button>
    </div>
  );
}
