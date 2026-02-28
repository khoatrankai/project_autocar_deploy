/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns"; // Sử dụng để format ngày tháng

export default async function exportOrdersToExcel(orders: any[]) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PhieuXuatKho");

    // 1. DÒNG TIÊU ĐỀ
    worksheet.addRow([]);
    worksheet.mergeCells("B2:J2");
    worksheet.getCell("B2").value = `BÁO CÁO PHIẾU XUẤT KHO / BÁN HÀNG`;
    worksheet.getCell("B2").font = { size: 18, bold: true };
    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // 2. CẤU HÌNH ĐỘ RỘNG CỘT
    worksheet.columns = [
      { key: "empty", width: 5 }, // A: Margin trống giống mẫu của bạn
      { key: "stt", width: 10 }, // B
      { key: "code", width: 20 }, // C
      { key: "created_at", width: 20 }, // D
      { key: "customer", width: 30 }, // E
      { key: "warehouse", width: 25 }, // F
      { key: "staff", width: 25 }, // G
      { key: "total", width: 20 }, // H
      { key: "debt", width: 20 }, // I
      { key: "status", width: 20 }, // J
    ];

    // 3. DÒNG TIÊU ĐỀ CÁC CỘT (HEADER)
    const headerRowIndex = 4;
    const headers = [
      "",
      "STT",
      "MÃ PHIẾU",
      "THỜI GIAN",
      "KHÁCH HÀNG",
      "KHO XUẤT",
      "NGƯỜI BÁN",
      "TỔNG TIỀN",
      "KHÁCH NỢ",
      "TRẠNG THÁI",
    ];

    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(headerRowIndex - 1);

    headerRow.font = { bold: true, size: 12, color: { argb: "ffffff" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Format UI cho dòng Header (Màu nền 1BA49D, Border)
    for (let col = 2; col <= 10; col++) {
      headerRow.getCell(col).border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      headerRow.getCell(col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1BA49D" },
      };
    }

    // 4. ĐỔ DỮ LIỆU (DATA ROWS)
    orders.forEach((order, index) => {
      // Tính toán nợ
      const isDebt = Number(order.final_amount) > Number(order.paid_amount);
      const debtAmount = Number(order.final_amount) - Number(order.paid_amount);

      // Map data
      const rowData = {
        empty: "",
        stt: index + 1,
        code: order.code,
        created_at: format(new Date(order.created_at), "dd/MM/yyyy HH:mm"),
        customer: order.partners?.name
          ? `${order.partners.name} ${order.partners.phone ? `(${order.partners.phone})` : ""}`
          : "Khách lẻ",
        warehouse: order.warehouses?.name || "---",
        staff: order.profiles?.full_name || "---",
        total: Number(order.final_amount),
        debt: debtAmount > 0 ? debtAmount : 0,
        status: isDebt ? "Ghi nợ" : "Đã thanh toán",
      };

      const newRow = worksheet.addRow(rowData);

      // Thêm style (Border, font size) cho từng ô dữ liệu
      for (let col = 2; col <= 10; col++) {
        const cell = newRow.getCell(col);
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        cell.font = { size: 11 };
        cell.alignment = { vertical: "middle" };

        // Format tiền tệ cho cột Tổng tiền (H) và Khách nợ (I)
        if (col === 8 || col === 9) {
          cell.numFmt = "#,##0"; // Hiển thị số có dấu phân cách hàng nghìn (VD: 2.500.000)
        }
      }

      // Căn giữa cho cột STT và Trạng thái
      newRow.getCell(2).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      newRow.getCell(10).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    // 5. LƯU FILE
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `DanhSachPhieuXuatKho_${format(new Date(), "ddMMyyyy")}.xlsx`;
    saveAs(blob, fileName);
  } catch (err) {
    console.error("Lỗi xuất excel:", err);
  }
}
