import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { REPORT_PERIODS, getReport, getReportOffset } from "@/services/adminReportService";
import { toDateOnly } from "@/utils/format";
import { GENERIC_ERROR_MESSAGE } from "@/utils/messages";
import { downloadReportCsv, printReportPdf } from "@/utils/reportExport";
import { invalidMessage, requiredMessage } from "@/utils/validation";

const TYPE_OPTIONS = [
    { value: REPORT_PERIODS.DAY, label: "Ngày" },
    { value: REPORT_PERIODS.MONTH, label: "Tháng" },
    { value: REPORT_PERIODS.YEAR, label: "Năm" },
];

const FORMATS = { EXCEL: "excel", PDF: "pdf" };

// TODO(api): Excel is a .csv until the backend builds .xlsx files.
const FORMAT_OPTIONS = [
    { value: FORMATS.EXCEL, label: "Excel (.csv)" },
    { value: FORMATS.PDF, label: "PDF" },
];

const FIELD_ID = "export-report-time";
// Years offered in "Chọn năm", counting back from this year.
const YEAR_COUNT = 5;

// Field label and the name used in its error messages, per report type.
const FIELD_NAMES = {
    [REPORT_PERIODS.DAY]: { label: "Chọn ngày", name: "ngày" },
    [REPORT_PERIODS.MONTH]: { label: "Chọn tháng", name: "tháng" },
    [REPORT_PERIODS.YEAR]: { label: "Chọn năm", name: "năm" },
};

// "Xuất báo cáo doanh thu" popup: pick a day, month or year and a file format, then download it.
// initialPeriod: the period shown on the page (a week falls back to a day).
const ExportReportPopup = ({ initialPeriod, onClose }) => {
    const today = toDateOnly(new Date());
    const thisMonth = today.slice(0, 7);
    const thisYear = Number(today.slice(0, 4));

    const [type, setType] = useState(TYPE_OPTIONS.some((option) => option.value === initialPeriod) ? initialPeriod : REPORT_PERIODS.DAY);
    const [day, setDay] = useState(today);
    const [month, setMonth] = useState(thisMonth);
    const [year, setYear] = useState(thisYear);
    const [format, setFormat] = useState(FORMATS.EXCEL);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    const field = FIELD_NAMES[type];

    // Day inside the chosen period, as getReportOffset wants it; null when the field is empty or wrong.
    const chosenDate = () => {
        if (type === REPORT_PERIODS.YEAR) return `${year}-01-01`;
        if (type === REPORT_PERIODS.MONTH) return /^\d{4}-\d{2}$/.test(month) && month <= thisMonth ? `${month}-01` : null;
        return day && day <= today ? day : null;
    };

    const changeType = (next) => {
        setType(next);
        setError(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const date = chosenDate();
        if (!date) {
            const empty = type === REPORT_PERIODS.DAY ? !day : !month;
            setError(empty ? requiredMessage(field.name) : invalidMessage(field.name.charAt(0).toUpperCase() + field.name.slice(1)));
            document.getElementById(FIELD_ID)?.focus();
            return;
        }

        setExporting(true);
        const result = await getReport({ period: type, offset: getReportOffset(type, date) });
        setExporting(false);
        if (!result.success) {
            toast.error(result.message ?? GENERIC_ERROR_MESSAGE);
            return;
        }
        if (format === FORMATS.PDF) printReportPdf(result.data);
        else downloadReportCsv(result.data);
        onClose();
    };

    const inputProps = {
        id: FIELD_ID,
        className: "input",
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? `${FIELD_ID}-error` : undefined,
    };

    return (
        <Modal title="Xuất báo cáo doanh thu" size="sm" onClose={onClose} closeDisabled={exporting}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="field">
                    <span className="label">Loại báo cáo</span>
                    <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={changeType} label="Loại báo cáo" className="self-start" />
                </div>

                <FormField id={FIELD_ID} label={field.label} required error={error}>
                    {type === REPORT_PERIODS.DAY && (
                        <input
                            {...inputProps}
                            type="date"
                            max={today}
                            value={day}
                            onChange={(event) => {
                                setDay(event.target.value);
                                setError(null);
                            }}
                        />
                    )}
                    {type === REPORT_PERIODS.MONTH && (
                        <input
                            {...inputProps}
                            type="month"
                            max={thisMonth}
                            value={month}
                            onChange={(event) => {
                                setMonth(event.target.value);
                                setError(null);
                            }}
                        />
                    )}
                    {type === REPORT_PERIODS.YEAR && (
                        <select {...inputProps} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                            {Array.from({ length: YEAR_COUNT }, (_, index) => thisYear - index).map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )}
                </FormField>

                <div className="field">
                    <span className="label">Định dạng</span>
                    <SegmentedControl options={FORMAT_OPTIONS} value={format} onChange={setFormat} label="Định dạng" className="self-start" />
                </div>

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
