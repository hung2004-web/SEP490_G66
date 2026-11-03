// Files for "Xuất báo cáo". TODO(api): let the backend build a real .xlsx / .pdf once it has report endpoints.
const MILLION = 1_000_000;

// Report in rows of cells: summary, revenue per bar (this period and the compared one), revenue per service.
const reportRows = (report) => [
    ["Báo cáo", report.label],
    [],
    ["Doanh thu (₫)", report.revenue.value * MILLION],
    ["Lượt khám", report.visits.value],
    ["Bệnh nhân mới", report.newPatients.value],
    [],
    ["Doanh thu theo thời gian (triệu ₫)", report.comparison.current, report.comparison.previous],
    ...report.revenueBars.map((bar) => [[bar.label, bar.sublabel].filter(Boolean).join(" "), bar.value ?? "", bar.previous ?? ""]),
    [],
    ["Doanh thu theo dịch vụ", "Triệu ₫"],
    ...report.revenueByService.map((item) => [item.label, item.value]),
];

const fileName = (report) => `bao-cao-${report.period}-${report.from}`;

// CSV that opens in Excel; the BOM keeps Vietnamese letters.
export const downloadReportCsv = (report) => {
    const csv = reportRows(report)
        .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName(report)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const escapeHtml = (value) =>
    String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// Opens the browser's print dialog on a plain page of the report, where it can be saved as PDF.
export const printReportPdf = (report) => {
    const rows = reportRows(report)
        .map((row) => (row.length === 0 ? '<tr><td colspan="3">&nbsp;</td></tr>' : `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`))
        .join("");
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0";
    document.body.append(frame);
    frame.contentDocument.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${fileName(report)}</title>
<style>body{font-family:sans-serif;font-size:12px}h1{font-size:18px}table{border-collapse:collapse}td{padding:4px 12px 4px 0}</style></head>
<body><h1>Báo cáo doanh thu · ${escapeHtml(report.label)}</h1><table>${rows}</table></body></html>`);
    frame.contentDocument.close();
    frame.contentWindow.addEventListener("afterprint", () => frame.remove());
    frame.contentWindow.print();
};
