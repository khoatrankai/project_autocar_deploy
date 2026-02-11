/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

// --- TYPES ---
export interface CartItem {
  product_id: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  price: number; // Giá bán thực tế
  cost_price: number; // Giá vốn (để cảnh báo lỗ)
  stock: number; // Tồn kho hiện tại (để cảnh báo hết hàng)
}

// Cấu trúc một hóa đơn (Tab)
export interface Invoice {
  id: string; // ID định danh tab
  label: string; // Tên hiển thị (Hóa đơn 1, 2...)
  cart: CartItem[];
  selectedPartner: any | null; // Khách hàng
  selectedStaff: any | null; // Nhân viên bán
  discount: number; // Giảm giá (VNĐ)
  vatRate: number; // Thuế (%)
  note: string; // Ghi chú
}

interface PosState {
  // State quản lý danh sách hóa đơn
  invoices: Invoice[];
  activeInvoiceId: string;

  // Actions quản lý Tab
  addInvoice: () => void;
  removeInvoice: (id: string) => void;
  setActiveInvoice: (id: string) => void;

  // Actions tác động lên hóa đơn ĐANG CHỌN (Active)
  addToCart: (product: any) => void;
  updateCartItem: (
    productId: number,
    field: keyof CartItem,
    value: number,
  ) => void;
  removeFromCart: (productId: number) => void;

  setPartner: (partner: any) => void;
  setStaff: (staff: any) => void;
  setDiscount: (amount: number) => void;
  setVatRate: (rate: number) => void;
  setNote: (note: string) => void;

  resetActiveInvoice: () => void;

  // Helpers & Computed
  getActiveInvoice: () => Invoice | undefined;
  calculateTotals: () => {
    totalMerchandise: number;
    totalTax: number;
    totalPayment: number;
  };
}

// Helper tạo hóa đơn mới mặc định
const createNewInvoice = (index: number): Invoice => ({
  id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  label: `Hóa đơn ${index + 1}`,
  cart: [],
  selectedPartner: null,
  selectedStaff: null,
  discount: 0,
  vatRate: 0,
  note: "",
});

export const usePosStore = create<PosState>((set, get) => ({
  // Khởi tạo với 1 hóa đơn đầu tiên
  invoices: [createNewInvoice(0)],
  activeInvoiceId: "",

  // --- TAB LOGIC ---
  addInvoice: () => {
    set((state) => {
      const newInv = createNewInvoice(state.invoices.length);
      return {
        invoices: [...state.invoices, newInv],
        activeInvoiceId: newInv.id, // Tự động chuyển sang tab mới tạo
      };
    });
  },

  removeInvoice: (id) => {
    set((state) => {
      // Nếu chỉ còn 1 tab -> Reset về trắng chứ không xóa
      if (state.invoices.length === 1) {
        const resetInv = createNewInvoice(0);
        resetInv.id = state.invoices[0].id; // Giữ ID cũ để không bị flicker UI
        return { invoices: [resetInv] };
      }

      const newInvoices = state.invoices.filter((i) => i.id !== id);

      // Nếu xóa tab đang active -> Chuyển active về tab cuối cùng còn lại
      let newActive = state.activeInvoiceId;
      if (id === state.activeInvoiceId) {
        newActive = newInvoices[newInvoices.length - 1].id;
      }

      // Đánh lại số thứ tự tên (Hóa đơn 1, 2...) cho đẹp
      const reordered = newInvoices.map((inv, idx) => ({
        ...inv,
        label: `Hóa đơn ${idx + 1}`,
      }));

      return { invoices: reordered, activeInvoiceId: newActive };
    });
  },

  setActiveInvoice: (id) => set({ activeInvoiceId: id }),

  getActiveInvoice: () => {
    const { invoices, activeInvoiceId } = get();
    if (!activeInvoiceId && invoices.length > 0) return invoices[0];
    return invoices.find((i) => i.id === activeInvoiceId);
  },

  calculateTotals: () => {
    const inv = get().getActiveInvoice();
    if (!inv) return { totalMerchandise: 0, totalTax: 0, totalPayment: 0 };

    const totalMerchandise = inv.cart.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    // Tổng sau giảm giá
    const subTotal = totalMerchandise - inv.discount;

    // Thuế (tính trên subTotal)
    const totalTax =
      subTotal > 0 ? Math.round(subTotal * (inv.vatRate / 100)) : 0;

    // Khách cần trả = (Tiền hàng - Giảm giá) + Thuế
    // QUAN TRỌNG: Không cộng nợ cũ vào đây
    const totalPayment = Math.max(0, subTotal + totalTax);

    return { totalMerchandise, totalTax, totalPayment };
  },

  // --- CART ACTIONS (Update vào Active Invoice) ---
  addToCart: (product) => {
    set((state) => {
      const activeId = state.activeInvoiceId || state.invoices[0].id;
      return {
        invoices: state.invoices.map((inv) => {
          if (inv.id !== activeId) return inv;

          const existItem = inv.cart.find(
            (i) => i.product_id === Number(product.id),
          );
          let newCart;

          if (existItem) {
            newCart = inv.cart.map((i) =>
              i.product_id === Number(product.id)
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            );
          } else {
            // Lấy tổng tồn kho từ mảng inventory
            const totalStock =
              product.inventory?.reduce(
                (sum: number, item: any) => sum + (item.quantity || 0),
                0,
              ) || 0;

            newCart = [
              ...inv.cart,
              {
                product_id: Number(product.id),
                sku: product.sku,
                name: product.name,
                unit: product.unit || "Cái",
                quantity: 1,
                price: Number(product.cost_price) || 0,
                cost_price: Number(product.cost_price) || 0, // Lưu giá vốn để so sánh
                stock: totalStock, // Lưu tồn kho để cảnh báo
              },
            ];
          }
          return { ...inv, cart: newCart };
        }),
      };
    });
  },

  updateCartItem: (productId, field, value) => {
    set((state) => {
      const activeId = state.activeInvoiceId || state.invoices[0].id;
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === activeId
            ? {
                ...inv,
                cart: inv.cart.map((item) =>
                  item.product_id === productId
                    ? { ...item, [field]: value }
                    : item,
                ),
              }
            : inv,
        ),
      };
    });
  },

  removeFromCart: (productId) => {
    set((state) => {
      const activeId = state.activeInvoiceId || state.invoices[0].id;
      return {
        invoices: state.invoices.map((inv) =>
          inv.id === activeId
            ? {
                ...inv,
                cart: inv.cart.filter((i) => i.product_id !== productId),
              }
            : inv,
        ),
      };
    });
  },

  // --- SETTERS (Update vào Active Invoice) ---
  setPartner: (partner) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === (state.activeInvoiceId || state.invoices[0].id)
          ? { ...inv, selectedPartner: partner }
          : inv,
      ),
    }));
  },

  setStaff: (staff) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === (state.activeInvoiceId || state.invoices[0].id)
          ? { ...inv, selectedStaff: staff }
          : inv,
      ),
    }));
  },

  setDiscount: (val) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === (state.activeInvoiceId || state.invoices[0].id)
          ? { ...inv, discount: val }
          : inv,
      ),
    }));
  },

  setVatRate: (val) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === (state.activeInvoiceId || state.invoices[0].id)
          ? { ...inv, vatRate: val }
          : inv,
      ),
    }));
  },

  setNote: (val) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === (state.activeInvoiceId || state.invoices[0].id)
          ? { ...inv, note: val }
          : inv,
      ),
    }));
  },

  resetActiveInvoice: () => {
    set((state) => {
      const activeId = state.activeInvoiceId || state.invoices[0].id;
      const index = state.invoices.findIndex((i) => i.id === activeId);
      const resetInv = createNewInvoice(index !== -1 ? index : 0);
      resetInv.id = activeId; // Giữ ID để không mất focus tab

      return {
        invoices: state.invoices.map((inv) =>
          inv.id === activeId ? resetInv : inv,
        ),
      };
    });
  },
}));
