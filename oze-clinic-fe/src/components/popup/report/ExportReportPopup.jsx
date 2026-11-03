import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { REPORT_PERIODS, getReport, getReportOffset } from "@/services/adminReportService";
import { toDateOnly } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import { downloadReportExcel } from "@/utils/reportExport";
import { invalidMessage, requiredMessage } from "@/utils/validation";

const TYPE_OPTIONS = [
    { value: REPORT_PERIODS.DAY, label: "Ngày" },
    { value: REPORT_PERIODS.MONTH, label: "Tháng" },
    { value: REPORT_PERIODS.YEAR, label: "Năm" },
];

const FIELD_ID = "export-report-time";
// How far back "Chọn tháng" and "Chọn năm" go, counting this month / year.
const MONTH_COUNT = 24;
const YEAR_COUNT = 5;

const FIELD_LABELS = {
    [REPORT_PERIODS.DAY]: "Chọn ngày",
    [REPORT_PERIODS.MONTH]: "Chọn tháng",
    [REPORT_PERIODS.YEAR]: "Chọn năm",
};

const pad = (value) => String(value).padStart(2, "0");

// Newest first: { value: "2026-10-01", label: "10/2026" }.
const recentMonths = (today) =>
    Array.from({ length: MONTH_COUNT }, (_, index) => {
        const month = new Date(today.getFullYear(), today.getMonth() - index, 1);
        return { value: toDateOnly(month), label: `${pad(month.getMonth() + 1)}/${month.getFullYear()}` };
    });

// "Xuất báo cáo doanh thu" popup: pick a day, month or year, then download that report as an Excel file.
// initialPeriod: the period shown on the page (a week falls back to a day).
const ExportReportPopup = ({ initialPeriod, onClose }) => {
    const [now] = useState(() => new Date());
    const today = toDateOnly(now);
    const months = recentMonths(now);
    const years = Array.from({ length: YEAR_COUNT }, (_, index) => now.getFullYear() - index);

    const [type, setType] = useState(TYPE_OPTIONS.some((option) => option.value === initialPeriod) ? initialPeriod : REPORT_PERIODS.DAY);
    const [day, setDay] = useState(today);
    const [month, setMonth] = useState(months[0].value);
    const [year, setYear] = useState(years[0]);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    const changeType = (next) => {
        setType(next);
        setError(null);
    };

    // A day inside the chosen period, as getReportOffset wants it.
    const chosenDate = () => {
        if (type === REPORT_PERIODS.YEAR) return `${year}-01-01`;
        if (type === REPORT_PERIODS.MONTH) return month;
        return day;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (type === REPORT_PERIODS.DAY && (!day || day > today)) {
            setError(day ? invalidMessage("Ngày") : requiredMessage("ngày"));
            document.getElementById(FIELD_ID)?.focus();
            return;
        }

        setExporting(true);
        const result = await getReport({ period: type, offset: getReportOffset(type, chosenDate()) });
        setExporting(false);
        if (!result.success) {
            toast.error(result.message ?? GENERIC_ERROR_MESSAGE);
            return;
        }
        downloadReportExcel(result.data);
        onClose();
    };

    return (
        <Modal title="Xuất báo cáo doanh thu" size="sm" onClose={onClose} closeDisabled={exporting}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="field">
                    <span className="label">Loại báo cáo</span>
                    <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} label="Loại báo cáo" className="self-start" />
                </div>

                <FormField id={FIELD_ID} label={FIELD_LABELS[type]} required error={error}>
                    {type === REPORT_PERIODS.DAY && (
                        <input
                            id={FIELD_ID}
                            type="date"
                            className="input"
                            max={today}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${FIELD_ID}-error` : undefined}
                            value={day}
                            onChange={(event) => {
                                setDay(event.target.value);
                                setError(null);
                            }}
                        />
                    )}
                    {type === REPORT_PERIODS.MONTH && (
                        <select id={FIELD_ID} className="input num" value={month} onChange={(event) => setMonth(event.target.value)}>
                            {months.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                    {type === REPORT_PERIODS.YEAR && (
                        <select id={FIELD_ID} className="input num" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                            {years.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )}
                </FormField>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={exporting} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={exporting}>
                        {exporting ? "Đang xuất…" : "Xuất báo cáo"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ExportReportPopup;
