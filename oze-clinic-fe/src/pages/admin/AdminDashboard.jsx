import { useState } from "react";
import { CalendarCheck, Download, Inbox, Stethoscope, UserPlus, Wallet } from "lucide-react";
import BarChart from "@/components/chart/BarChart";
import DonutChart from "@/components/chart/DonutChart";
import MetricCard from "@/components/ui/MetricCard";
import PeriodNavigator from "@/components/ui/PeriodNavigator";
import SegmentedControl from "@/components/ui/SegmentedControl";
import useAsync from "@/hooks/useAsync";
import { REPORT_PERIODS, getPendingRequests, getReport } from "@/services/adminReportService";
import { REQUEST_TYPES } from "@/utils/data/mockAdminReport";
import { formatCurrency, formatDate, toDateOnly } from "@/utils/format";

const PERIOD_OPTIONS = [
    { value: REPORT_PERIODS.DAY, label: "Ngày" },
    { value: REPORT_PERIODS.WEEK, label: "Tuần" },
    { value: REPORT_PERIODS.MONTH, label: "Tháng" },
    { value: REPORT_PERIODS.YEAR, label: "Năm" },
];

// Words after "so với ..." in the metric captions.
const PREVIOUS_LABELS = {
    [REPORT_PERIODS.DAY]: "hôm trước",
    [REPORT_PERIODS.WEEK]: "tuần trước",
    [REPORT_PERIODS.MONTH]: "tháng trước",
    [REPORT_PERIODS.YEAR]: "năm trước",
};

const REQUEST_TYPE_BADGES = {
    [REQUEST_TYPES.LEAVE]: { label: "Xin nghỉ", badge: "badge-info" },
    [REQUEST_TYPES.REFUND]: { label: "Hoàn tiền", badge: "badge-warning" },
};

const MILLION = 1_000_000;
const SKELETON_ROW_COUNT = 3;

// Revenue figures come in million VND: 24.1 -> "24,1".
const millionFormatter = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatMillion = (value) => millionFormatter.format(value);

const pad = (value) => String(value).padStart(2, "0");

// "2026-10-28T09:10" -> "09:10, 28/10"
const formatSubmittedAt = (value) => {
    const date = new Date(value);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
};

const signed = (value) => (value > 0 ? `+${value}` : String(value));

const toneOf = (change) => {
    if (change > 0) return "positive";
    if (change < 0) return "negative";
    return "neutral";
};

// Comparison line of a metric, e.g. "+12% so với tuần trước"; nothing to compare = no line.
const changeCaption = (change, period, unit = "") =>
    change === null ? undefined : `${signed(change)}${unit} so với ${PREVIOUS_LABELS[period]}`;

// Downloads the report shown on screen as a CSV file (opens in Excel; the BOM keeps Vietnamese letters).
const exportReport = (report) => {
    const rows = [
        ["Báo cáo", report.label],
        [],
        ["Doanh thu (₫)", report.revenue.value * MILLION],
        ["Lượt khám", report.visits.value],
        ["Bệnh nhân mới", report.newPatients.value],
        [],
        ["Doanh thu theo thời gian", "Triệu ₫"],
        ...report.revenueBars.map((bar) => [[bar.label, bar.sublabel].filter(Boolean).join(" "), bar.value ?? ""]),
        [],
        ["Doanh thu theo dịch vụ", "Triệu ₫"],
        ...report.revenueByService.map((item) => [item.label, item.value]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-${report.period}-${report.from}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const ReportCard = ({ title, children }) => (
    <section className="card-app">
        <h2 className="card-title mb-6">{title}</h2>
        {children}
    </section>
);

const AdminDashboard = () => {
    const [period, setPeriod] = useState(REPORT_PERIODS.WEEK);
    const [offset, setOffset] = useState(0);

    const { loading, value: reportResult } = useAsync(() => getReport({ period, offset }), [period, offset]);
    const { loading: requestsLoading, value: requestsResult } = useAsync(() => getPendingRequests(), []);

    const report = reportResult?.success ? reportResult.data : null;
    const requests = requestsResult?.success ? requestsResult.data : [];
    const updatedAt = report && new Date(report.updatedAt);

    const changePeriod = (next) => {
        setPeriod(next);
        setOffset(0);
    };

    // TODO: open the leave / refund request once those pages exist.
    const openRequest = () => {};

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Báo cáo &amp; cảnh báo</h1>
                    <p className="num mt-1 text-caption text-muted">
                        {updatedAt
                            ? `Cập nhật lúc ${pad(updatedAt.getHours())}:${pad(updatedAt.getMinutes())}, ${formatDate(toDateOnly(updatedAt))}`
                            : "Đang tải…"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} label="Kỳ báo cáo" />
                    <PeriodNavigator
                        label={report?.label ?? "…"}
                        onPrevious={() => setOffset((current) => current - 1)}
                        onNext={() => setOffset((current) => current + 1)}
                        nextDisabled={offset >= 0}
                    />
                    <button type="button" className="btn btn-secondary" disabled={!report} onClick={() => exportReport(report)}>
                        <Download className="size-4" aria-hidden="true" />
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    label="Doanh thu"
                    loading={loading}
                    value={report && formatCurrency(report.revenue.value * MILLION)}
                    caption={report && changeCaption(report.revenue.change, period, "%")}
                    tone={report ? toneOf(report.revenue.change) : undefined}
                />
                <MetricCard
                    icon={Stethoscope}
                    label="Lượt khám"
                    loading={loading}
                    value={report?.visits.value}
                    caption={report && changeCaption(report.visits.change, period, "%")}
                    tone={report ? toneOf(report.visits.change) : undefined}
                />
                <MetricCard
                    icon={UserPlus}
                    label="Bệnh nhân mới"
                    loading={loading}
                    value={report?.newPatients.value}
                    caption={report && changeCaption(report.newPatients.change, period)}
                    tone={report ? toneOf(report.newPatients.change) : undefined}
                />
                <MetricCard
                    icon={CalendarCheck}
                    label="Lịch hẹn hôm nay"
                    loading={loading}
                    value={report?.todayAppointments.total}
                    caption={
                        report &&
                        `${report.todayAppointments.checkedIn} đã check-in · ${report.todayAppointments.notArrived} chưa đến`
                    }
                />
            </div>

            <ReportCard title={`Doanh thu ${report?.label ?? ""} (triệu ₫)`}>
                {loading ? (
                    <div className="skeleton h-64 w-full" aria-hidden="true" />
                ) : (
                    report && (
                        <BarChart data={report.revenueBars} title={`Doanh thu ${report.label} (triệu ₫)`} formatValue={formatMillion} />
                    )
                )}
            </ReportCard>

            <ReportCard title="Tỷ trọng doanh thu theo dịch vụ">
                {loading ? (
                    <div className="skeleton h-44 w-full" aria-hidden="true" />
                ) : (
                    report && (
                        <DonutChart
                            data={report.revenueByService}
                            title="Tỷ trọng doanh thu theo dịch vụ (triệu ₫)"
                            formatValue={(value) => `${formatMillion(value)} tr`}
                            centerValue={`${formatMillion(report.revenue.value)} tr`}
                            centerLabel="Tổng"
                        />
                    )
                )}
            </ReportCard>

            <section className="card-app overflow-hidden p-0" aria-labelledby="pending-requests-title">
                <div className="flex items-center gap-2 px-6 py-4">
                    <h2 id="pending-requests-title" className="card-title">
                        Đơn chờ duyệt
                    </h2>
                    {requests.length > 0 && <span className="num rounded-full bg-warning-soft px-2 text-caption text-warning">{requests.length}</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="table" aria-busy={requestsLoading}>
                        <thead>
                            <tr>
                                <th scope="col">Loại đơn</th>
                                <th scope="col">Người gửi</th>
                                <th scope="col">Nội dung</th>
                                <th scope="col">Gửi lúc</th>
                                <th scope="col">
                                    <span className="sr-only">Thao tác</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {requestsLoading &&
                                Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                                    <tr key={index} aria-hidden="true">
                                        {Array.from({ length: 5 }, (_, cell) => (
                                            <td key={cell}>
                                                <div className="skeleton h-4 w-full max-w-32" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            {!requestsLoading && requests.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="empty-state">
                                            <Inbox className="empty-state-icon" aria-hidden="true" />
                                            <p className="empty-state-title">Không có đơn nào chờ duyệt</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!requestsLoading &&
                                requests.map((request) => {
                                    const type = REQUEST_TYPE_BADGES[request.type];
                                    return (
                                        <tr key={request.id}>
                                            <td>
                                                <span className={`badge whitespace-nowrap ${type.badge}`}>{type.label}</span>
                                            </td>
                                            <td className="min-w-44 py-2">
                                                <p className="text-label text-ink">{request.senderName}</p>
                                                <p className="text-caption text-muted">{request.senderRole}</p>
                                            </td>
                                            <td className="min-w-56">{request.content}</td>
                                            <td className="whitespace-nowrap text-muted">{formatSubmittedAt(request.submittedAt)}</td>
                                            <td className="text-right">
                                                <button
                                                    type="button"
                                                    className="btn btn-primary whitespace-nowrap"
                                                    onClick={() => openRequest(request)}
                                                >
                                                    Xem &amp; duyệt
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminDashboard;
