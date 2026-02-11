import axiosClient from "./axiosClient";

export interface DashboardFilter {
  from_date?: string;
  to_date?: string;
  warehouse_id?: number;
}

export const dashboardService = {
  getSummary: (params?: DashboardFilter) => {
    return axiosClient.get("/dashboard/summary", { params });
  },
  getChart: (params?: DashboardFilter) => {
    return axiosClient.get("/dashboard/chart", { params });
  },
  getTopProducts: (params?: DashboardFilter) => {
    return axiosClient.get("/dashboard/top-products", { params });
  },
  getTopCustomers: (params?: DashboardFilter) => {
    return axiosClient.get("/dashboard/top-customers", { params });
  },
  getActivities: () => {
    return axiosClient.get("/dashboard/activities");
  },
};
