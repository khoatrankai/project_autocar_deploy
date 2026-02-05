// src/pages/Dashboard.tsx
import { LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <LayoutDashboard className="text-blue-600" /> Dashboard
      </h1>
      <p className="mt-4 text-slate-600">
        Đây là trang chủ. Hãy ở đây và chờ đợi để test thử staleTime bên trang
        Sản phẩm nhé!
      </p>
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-800">Hướng dẫn Test:</h3>
        <ul className="list-disc pl-5 mt-2 space-y-2 text-blue-700">
          <li>
            <strong>Test 1 (Cache còn mới):</strong> Bấm sang "Sản phẩm", xong
            bấm về đây ngay. Bấm lại "Sản phẩm" Sẽ hiện ra NGAY LẬP TỨC (không
            loading).
          </li>
          <li>
            <strong>Test 2 (Hết hạn):</strong> Bấm về đây, chờ{" "}
            <strong>hơn 1 phút</strong>. Bấm lại "Sản phẩm" Sẽ thấy icon loading
            quay nhẹ (do nó gọi lại API ngầm).
          </li>
        </ul>
      </div>
    </div>
  );
}
