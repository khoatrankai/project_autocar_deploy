/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRegister } from "../hooks/useAuth";
import { UserRole } from "../types/auth";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "", // snake_case
    phone_number: "", // snake_case
    role: UserRole.SALE, // Mặc định là SALE
  });

  const { mutate, isPending } = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Đăng Ký</h2>

        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Họ và tên"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
        />
        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Số điện thoại"
          value={formData.phone_number}
          onChange={(e) =>
            setFormData({ ...formData, phone_number: e.target.value })
          }
        />
        <input
          className="w-full mb-3 p-2 border rounded"
          type="password"
          placeholder="Mật khẩu"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />

        {/* Select Role */}
        <select
          className="w-full mb-6 p-2 border rounded"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as any })
          }
        >
          <option value={UserRole.SALE}>Nhân viên Sale</option>
          <option value={UserRole.WAREHOUSE}>Thủ kho</option>
          <option value={UserRole.ADMIN}>Admin</option>
        </select>

        <button
          disabled={isPending}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? "Đang đăng ký..." : "Đăng Ký"}
        </button>
      </form>
    </div>
  );
}
