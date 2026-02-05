import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
// import "./index.css"; // Import CSS chứa Tailwind
import "./styles/globals.css";
// 1. Import React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";

// 2. Tạo Client (Bộ quản lý cache)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Tắt tự động fetch lại khi chuyển tab (đỡ tốn request)
      retry: 1, // Nếu lỗi thì thử lại 1 lần thôi
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 3. Bọc App bằng Provider */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
