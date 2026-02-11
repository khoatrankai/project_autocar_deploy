/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface ProductState {
  warehouse_manager: string | null;

  setWarehouseManager: (id: string) => void;
}

export const useManagerStore = create<ProductState>((set) => ({
  warehouse_manager: "1",
  setWarehouseManager: (id: string) => {
    set(() => ({
      warehouse_manager: id,
    }));
  },
}));
