import axios from "axios";
import queryString from "query-string";

const baseURL =
  import.meta.env.VITE_API_URL ||
  "https://quotes-integration-closer-adjusted.trycloudflare.com";
const axiosClient = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  paramsSerializer: (params) => {
    // arrayFormat: 'none' sẽ chuyển {ids: [1, 2]} thành "ids=1&ids=2" (Không có ngoặc [])
    return queryString.stringify(params, {
      arrayFormat: "none",
      skipNull: true,
    });
  },
});

// --- 1. INTERCEPTOR REQUEST (QUAN TRỌNG NHẤT) ---
// Phải có đoạn này thì Token mới được gửi đi
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage
    const token = localStorage.getItem("access_token");

    // Nếu có token thì gán vào Header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- 2. INTERCEPTOR RESPONSE ---
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về response thành công
    console.log("oke");
    return response;
  },
  (error) => {
    // Xử lý lỗi
    if (error.response && error.response.status === 401) {
      console.warn("Lỗi 401: Token hết hạn hoặc không hợp lệ.");

      // Tùy chọn: Tự động xóa token và đá ra trang login nếu cần thiết
      // localStorage.removeItem("access_token");
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
