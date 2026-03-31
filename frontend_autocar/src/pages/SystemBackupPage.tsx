/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  DatabaseBackup,
  History,
  RotateCcw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PackageSearch,
} from "lucide-react";
import { Table, Button, Tag, Popconfirm } from "antd";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { systemBackupService } from "../services/systemBackupService";
import { productService } from "../services/productService";

export default function SystemBackupPage() {
  const [activeTab, setActiveTab] = useState<"general" | "products">(
    "products",
  );
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      let res;
      if (activeTab === "products") {
        res = await systemBackupService.getProductHistory();
      } else {
        res = await systemBackupService.getHistory();
      }
      setHistoryData(res || []);
    } catch (error) {
      toast.error("Lỗi khi tải lịch sử sao lưu");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleClearAllProducts = async () => {
    const reason = window.prompt(
      "⚠️ CẢNH BÁO: Thao tác này sẽ xóa TOÀN BỘ danh mục sản phẩm!\n\nVui lòng nhập lý do xóa để hệ thống lưu lại lịch sử:",
    );

    // Nếu người dùng bấm Cancel hoặc không nhập gì thì dừng lại
    if (!reason || reason.trim() === "") {
      return toast.error("Bắt buộc phải nhập lý do để sao lưu!");
    }

    setIsProcessing(true);
    const toastId = toast.loading(
      "Đang tiến hành sao lưu và xóa toàn bộ sản phẩm...",
    );
    try {
      const res = await productService.clearAllProducts(reason);
      toast.success(res.message || "Đã xóa sạch sản phẩm thành công!");

      // Tải lại bảng lịch sử để hiển thị bản backup mới nhất vừa tạo
      if (activeTab === "products") fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Lỗi khi xóa toàn bộ sản phẩm",
      );
    } finally {
      setIsProcessing(false);
      toast.dismiss(toastId);
    }
  };

  // --- HANDLERS ---
  const handleRestoreBatch = async (batchCode: string) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Đang khôi phục bản ghi [${batchCode}]...`);
    try {
      let res;
      if (activeTab === "products") {
        res = await systemBackupService.restoreProducts(batchCode);
      } else {
        res = await systemBackupService.restoreBatch(batchCode);
      }
      toast.success(res.message || "Khôi phục thành công!");
      fetchData(); // Tải lại danh sách sau khi khôi phục
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khôi phục dữ liệu");
    } finally {
      setIsProcessing(false);
      toast.dismiss(toastId);
    }
  };

  const handleRestoreAllLastMonth = async () => {
    setIsProcessing(true);
    const toastId = toast.loading(
      "Đang khôi phục sản phẩm trong 30 ngày qua...",
    );
    try {
      const res = await systemBackupService.restoreAllLastMonth();
      toast.success(
        res.message || `Khôi phục thành công ${res.count} sản phẩm!`,
      );
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khôi phục hàng loạt");
    } finally {
      setIsProcessing(false);
      toast.dismiss(toastId);
    }
  };

  const handleClearInventory = async () => {
    const reason = window.prompt("Vui lòng nhập lý do xóa toàn bộ tồn kho:");
    if (!reason) return toast.error("Bắt buộc phải nhập lý do!");

    setIsProcessing(true);
    const toastId = toast.loading("Đang sao lưu và dọn dẹp tồn kho...");
    try {
      const res = await systemBackupService.clearInventory(reason);
      toast.success(`Đã xóa ${res.count} bản ghi. Mã backup: ${res.batchCode}`);
      if (activeTab === "general") fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi dọn dẹp tồn kho");
    } finally {
      setIsProcessing(false);
      toast.dismiss(toastId);
    }
  };

  // --- CỘT BẢNG ---
  const columns = [
    {
      title: "Mã đợt (Batch Code)",
      dataIndex: "batch_code",
      key: "batch_code",
      render: (text: string) => (
        <span className="font-mono text-blue-600 font-medium">{text}</span>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "timestamp", // Backend của bạn trả về created_at trong history chung và timestamp trong product history
      key: "timestamp",
      render: (_: any, record: any) => {
        const time = record.timestamp || record.created_at;
        return time ? format(new Date(time), "dd/MM/yyyy HH:mm:ss") : "---";
      },
    },
    {
      title: "Hành động / Loại",
      dataIndex: "action_type",
      key: "action_type",
      render: (text: string, record: any) => (
        <Tag
          color={
            text === "DELETE" ? "red" : text === "CLEAR_ALL" ? "orange" : "blue"
          }
        >
          {text || record.entity_type?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Số lượng bản ghi",
      key: "count",
      align: "center" as const,
      render: (_: any, record: any) => (
        <span className="font-bold text-gray-700">
          {record.count || record._count?.id || 1}
        </span>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      render: (text: string) => (
        <span className="text-gray-500 italic">
          {text || "Không có ghi chú"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      align: "center" as const,
      render: (_: any, record: any) => {
        if (record.is_expired) {
          return (
            <Tag icon={<AlertTriangle size={14} />} color="default">
              Đã quá hạn (30 ngày)
            </Tag>
          );
        }
        return (
          <Tag icon={<CheckCircle2 size={14} />} color="success">
            Có thể khôi phục
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Xác nhận khôi phục?"
          description={`Bạn có chắc muốn khôi phục dữ liệu từ mã đợt ${record.batch_code}?`}
          onConfirm={() => handleRestoreBatch(record.batch_code)}
          disabled={isProcessing || record.is_expired}
          okText="Khôi phục"
          cancelText="Hủy"
        >
          <Button
            type="primary"
            icon={<RotateCcw size={14} />}
            disabled={isProcessing || record.is_expired}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Khôi phục
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-100 p-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-1">
            <DatabaseBackup className="text-blue-600" /> Quản lý Sao lưu & Khôi
            phục
          </h1>
          <p className="text-gray-500 text-sm">
            Xem lịch sử các thao tác xóa và khôi phục dữ liệu an toàn.
          </p>
        </div>

        {/* GLOBAL ACTIONS */}
        <div className="flex gap-3">
          {activeTab === "products" && (
            <>
              <Popconfirm
                title="Khôi phục tất cả?"
                description="Khôi phục mọi sản phẩm đã xóa trong 1 tháng qua?"
                onConfirm={handleRestoreAllLastMonth}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button
                  type="default"
                  icon={<PackageSearch size={16} />}
                  loading={isProcessing}
                  className="h-10 font-medium"
                >
                  Khôi phục SP (30 ngày)
                </Button>
              </Popconfirm>

              {/* 👉 THÊM NÚT XÓA SẠCH SP Ở ĐÂY */}
              <Button
                danger
                icon={<Trash2 size={16} />}
                onClick={handleClearAllProducts}
                loading={isProcessing}
                className="h-10 font-medium"
              >
                Xóa sạch SP (Có Backup)
              </Button>
            </>
          )}

          {activeTab === "general" && (
            <Button
              danger
              icon={<Trash2 size={16} />}
              onClick={handleClearInventory}
              loading={isProcessing}
              className="h-10 font-medium"
            >
              Xóa sạch tồn kho (Có Backup)
            </Button>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        {/* TABS */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "products"
                ? "text-blue-600 bg-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <PackageSearch size={18} />
            Lịch sử Sản phẩm
            {activeTab === "products" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === "general"
                ? "text-blue-600 bg-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <History size={18} />
            Lịch sử Chung (Tồn kho, KH...)
            {activeTab === "general" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* TABLE */}
        <div className="flex-1 p-4 overflow-auto">
          <Table
            columns={columns}
            dataSource={historyData}
            rowKey="batch_code"
            loading={isLoading}
            pagination={{ pageSize: 15 }}
            bordered
            size="middle"
            locale={{ emptyText: "Chưa có dữ liệu sao lưu nào." }}
          />
        </div>
      </div>
    </div>
  );
}
