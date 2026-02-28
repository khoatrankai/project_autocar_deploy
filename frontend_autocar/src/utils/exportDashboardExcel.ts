/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

// Hàm định dạng header chung cho cả 3 báo cáo
const styleHeader = (
  worksheet: ExcelJS.Worksheet,
  headerRowIndex: number,
  maxCol: number,
) => {
  const headerRow = worksheet.getRow(headerRowIndex - 1);
  headerRow.font = { bold: true, size: 12, color: { argb: "ffffff" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (let col = 2; col <= maxCol; col++) {
    const cell = headerRow.getCell(col);
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1BA49D" },
    };
  }
};

// Hàm định dạng viền cho các ô dữ liệu
const styleDataCell = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
  cell.font = { size: 11 };
  cell.alignment = { vertical: "middle" };
};

// ==========================================
// 1. XUẤT EXCEL BÁO CÁO CÔNG NỢ
// ==========================================
export const exportDebtExcel = async (debts: any[], isOverdue: boolean) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("BaoCaoCongNo");

    worksheet.addRow([]);
    worksheet.mergeCells("B2:F2");
    worksheet.getCell("B2").value = isOverdue
      ? "BÁO CÁO NỢ QUÁ HẠN"
      : "BÁO CÁO CÔNG NỢ KHÁCH HÀNG";
    worksheet.getCell("B2").font = { size: 18, bold: true };
    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.columns = [
      { key: "empty", width: 5 },
      { key: "stt", width: 10 },
      { key: "code", width: 25 },
      { key: "name", width: 35 },
      { key: "phone_date", width: 25 },
      { key: "debt", width: 20 },
    ];

    const headerRowIndex = 4;
    worksheet.addRow([
      "",
      "STT",
      isOverdue ? "MÃ ĐƠN HÀNG" : "MÃ KHÁCH HÀNG",
      isOverdue ? "TÊN KHÁCH HÀNG" : "TÊN KHÁCH HÀNG",
      isOverdue ? "NGÀY TẠO ĐƠN" : "SỐ ĐIỆN THOẠI",
      "SỐ TIỀN NỢ",
    ]);

    styleHeader(worksheet, headerRowIndex, 6);

    debts.forEach((item, index) => {
      let debtAmount = 0;
      let name = "";
      let code = "";
      let phoneOrDate = "";

      if (isOverdue) {
        debtAmount = Number(item.total_amount) - Number(item.paid_amount);
        name = item.partners?.name || "Khách lẻ";
        code = item.code;
        phoneOrDate = format(new Date(item.created_at), "dd/MM/yyyy");
      } else {
        debtAmount = Number(item.current_debt);
        name = item.name;
        code = item.code;
        phoneOrDate = item.phone || "---";
      }

      const row = worksheet.addRow({
        empty: "",
        stt: index + 1,
        code,
        name,
        phone_date: phoneOrDate,
        debt: debtAmount,
      });

      for (let col = 2; col <= 6; col++) {
        styleDataCell(row.getCell(col));
      }
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).numFmt = "#,##0"; // Format tiền
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `BaoCaoCongNo_${format(new Date(), "ddMMyyyy")}.xlsx`);
  } catch (err) {
    console.error(err);
  }
};

// ==========================================
// 2. XUẤT EXCEL DOANH THU & LỢI NHUẬN SALE
// ==========================================
export const exportSaleProfitExcel = async (
  payrollData: any,
  staffName: string,
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("LoiNhuanSale");

    worksheet.addRow([]);
    worksheet.mergeCells("B2:E2");
    worksheet.getCell("B2").value =
      `BÁO CÁO DOANH THU & LỢI NHUẬN - ${staffName.toUpperCase()}`;
    worksheet.getCell("B2").font = { size: 18, bold: true };
    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.addRow([
      "",
      `Tháng: ${payrollData?.month} / ${payrollData?.year}`,
    ]);
    worksheet.getCell("B3").font = { italic: true };

    worksheet.columns = [
      { key: "empty", width: 5 },
      { key: "stt", width: 10 },
      { key: "metric", width: 40 },
      { key: "value", width: 25 },
      { key: "note", width: 30 },
    ];

    const headerRowIndex = 5;
    worksheet.addRow([
      "",
      "STT",
      "CHỈ TIÊU ĐÁNH GIÁ",
      "GIÁ TRỊ (VNĐ)",
      "GHI CHÚ",
    ]);
    styleHeader(worksheet, headerRowIndex, 5);

    const data = [
      {
        metric: "1. Tổng bán ra (Bao gồm VAT)",
        value: payrollData?.totalRevenue,
        note: "Tổng giá trị các đơn hàng",
      },
      {
        metric: "2. Tổng VAT xuất (Kế toán thu)",
        value: payrollData?.totalVat,
        note: "Trừ lại tiền thuế",
      },
      {
        metric: "3. Doanh thu thực tế (Tính hoa hồng)",
        value: payrollData?.netRevenue,
        note: "Mục (1) - Mục (2)",
      },
      {
        metric: "4. Tổng giá vốn sản phẩm",
        value: payrollData?.totalCost,
        note: "Giá vốn nhập hàng",
      },
      {
        metric: "5. Phí Grab (Sale chịu)",
        value: payrollData?.staffGrabFee,
        note: "Phí vận chuyển Sale chịu",
      },
      {
        metric: "6. LỢI NHUẬN CUỐI CỦA SALE",
        value: payrollData?.profitForSale,
        note: "Mục (3) - Mục (4) - Mục (5)",
      },
    ];

    data.forEach((item, index) => {
      const row = worksheet.addRow({
        empty: "",
        stt: index + 1,
        metric: item.metric,
        value: Number(item.value || 0),
        note: item.note,
      });

      for (let col = 2; col <= 5; col++) {
        styleDataCell(row.getCell(col));
      }
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).numFmt = "#,##0"; // Format tiền

      // Bôi đậm dòng Lợi nhuận cuối
      if (index === data.length - 1) {
        row.getCell(3).font = { bold: true, size: 12 };
        row.getCell(4).font = {
          bold: true,
          size: 12,
          color: { argb: "0070f3" },
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `BaoCaoLoiNhuan_${staffName.replace(/\s+/g, "")}_${format(new Date(), "MMyyyy")}.xlsx`,
    );
  } catch (err) {
    console.error(err);
  }
};

// ==========================================
// 3. XUẤT EXCEL PHÍ GRAB
// ==========================================
export const exportGrabFeeExcel = async (
  payrollData: any,
  staffName: string,
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PhiGrab");

    worksheet.addRow([]);
    worksheet.mergeCells("B2:D2");
    worksheet.getCell("B2").value =
      `BÁO CÁO PHÍ VẬN CHUYỂN (GRAB) - ${staffName.toUpperCase()}`;
    worksheet.getCell("B2").font = { size: 16, bold: true };
    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.columns = [
      { key: "empty", width: 5 },
      { key: "metric", width: 40 },
      { key: "value", width: 25 },
      { key: "note", width: 30 },
    ];

    const headerRowIndex = 4;
    worksheet.addRow(["", "HẠNG MỤC", "SỐ TIỀN (VNĐ)", "GHI CHÚ"]);
    styleHeader(worksheet, headerRowIndex, 4);

    const data = [
      {
        metric: "Tổng phí Grab phát sinh",
        value: payrollData?.totalGrabFee || 0,
        note: "Thống kê từ các đơn hàng",
      },
      {
        metric: "Công ty hỗ trợ",
        value: payrollData?.companyGrabFee || 0,
        note: "Phần công ty chịu",
      },
      {
        metric: "PHẦN SALE PHẢI CHỊU",
        value: payrollData?.staffGrabFee || 0,
        note: "Trừ vào lương Sale",
      },
    ];

    data.forEach((item, index) => {
      const row = worksheet.addRow({
        empty: "",
        metric: item.metric,
        value: Number(item.value || 0),
        note: item.note,
      });

      for (let col = 2; col <= 4; col++) {
        styleDataCell(row.getCell(col));
      }
      row.getCell(3).numFmt = "#,##0";

      if (index === data.length - 1) {
        row.getCell(2).font = { bold: true };
        row.getCell(3).font = { bold: true, color: { argb: "ef4444" } }; // Màu đỏ cho phí phải chịu
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `PhiGrab_${staffName.replace(/\s+/g, "")}_${format(new Date(), "MMyyyy")}.xlsx`,
    );
  } catch (err) {
    console.error(err);
  }
};
