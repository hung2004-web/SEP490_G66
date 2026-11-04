// Excel file for "Xuất báo cáo". TODO(api): let the backend build the file once it has report endpoints.
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

const escapeXml = (value) =>
    String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// Column letters: 0 -> A, 1 -> B, ...
const columnName = (index) => String.fromCharCode(65 + index);

const sheetXml = (rows) => {
    const body = rows
        .map((row, rowIndex) => {
            const cells = row
                .map((cell, columnIndex) => {
                    const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
                    if (cell === "") return "";
                    if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
                    return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
                })
                .join("");
            return `<row r="${rowIndex + 1}">${cells}</row>`;
        })
        .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="36" customWidth="1"/><col min="2" max="3" width="16" customWidth="1"/></cols><sheetData>${body}</sheetData></worksheet>`;
};

// The fixed parts of a one-sheet workbook.
const workbookFiles = (sheet, sheetName) => ({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": sheet,
});

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
};

// Uncompressed ("stored") zip of { path: text }, which is all an .xlsx needs.
const zip = (files) => {
    const encoder = new TextEncoder();
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const [path, text] of Object.entries(files)) {
        const name = encoder.encode(path);
        const data = encoder.encode(text);
        const crc = crc32(data);

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true); // UTF-8 names
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);
        local.setUint32(22, data.length, true);
        local.setUint16(26, name.length, true);
        locals.push(local, name, data);

        const central = new DataView(new ArrayBuffer(46));
        central.setUint32(0, 0x02014b50, true);
        central.setUint16(4, 20, true);
        central.setUint16(6, 20, true);
        central.setUint16(8, 0x0800, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, data.length, true);
        central.setUint32(24, data.length, true);
        central.setUint16(28, name.length, true);
        central.setUint32(42, offset, true);
        centrals.push(central, name);

        offset += 30 + name.length + data.length;
    }

    const centralSize = centrals.reduce((sum, part) => sum + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, centrals.length / 2, true);
    end.setUint16(10, centrals.length / 2, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...locals, ...centrals, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

// Downloads rows of cells (strings or numbers, "" for an empty cell) as a one-sheet .xlsx.
export const downloadExcel = (rows, fileName, sheetName) => {
    const url = URL.createObjectURL(zip(workbookFiles(sheetXml(rows), sheetName)));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

// Downloads the report as bao-cao-<period>-<from>.xlsx.
export const downloadReportExcel = (report) => {
    downloadExcel(reportRows(report), `bao-cao-${report.period}-${report.from}.xlsx`, "Báo cáo");
};
