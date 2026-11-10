import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck,Inbox, Stethoscope, UserPlus, Wallet } from "lucide-react";
import BarChart from "@/components/chart/BarChart";
import DonutChart from "@/components/chart/DonutChart";
import ExportReportPopup from "@/components/popup/report/ExportReportPopup";
import MetricCard from "@/components/ui/MetricCard";
import PeriodNavigator from "@/components/ui/PeriodNavigator";
import SegmentedControl from "@/components/ui/SegmentedControl";
import StatusBadge from "@/components/ui/StatusBadge";
import useAsync from "@/hooks/useAsync";
import { REPORT_PERIODS, getPendingRequests, getReport, getReportOffset } from "@/services/adminReportService";
import { REQUEST_TYPES } from "@/utils/data/mockAdminReport";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { ROUTES } from "@/utils/routes";

const PERIOD_OPTIONS = [
    { value: REPORT_PERIODS.DAY, label: "Ngày" },
    { value: REPORT_PERIODS.WEEK, label: "Tuần" },
    { value: REPORT_PERIODS.MONTH, label: "Tháng" },
    { value: REPORT_PERIODS.YEAR, label: "Năm" },
];

// Revenue chart title (followed by the period) and the hint next to it.
const CHART_TEXTS = {
    [REPORT_PERIODS.DAY]: { title: "Thực thu theo khung giờ", hint: "Bấm vào một cột để xem hoá đơn trong ngày" },
    [REPORT_PERIODS.WEEK]: { title: "Thực thu theo ngày", hint: "Bấm vào một cột để xem báo cáo ngày đó" },
    [REPORT_PERIODS.MONTH]: { title: "Thực thu theo ngày", hint: "Bấm vào một cột để xem báo cáo ngày đó" },
    [REPORT_PERIODS.YEAR]: { title: "Thực thu theo tháng", hint: "Bấm vào một cột để xem tháng đó" },
};

const REQUEST_TYPE_BADGES = {
    [REQUEST_TYPES.LEAVE]: { label: "Xin nghỉ", badge: "badge-info" },
    [REQUEST_TYPES.REFUND]: { label: "Hoàn tiền", badge: "badge-warning" },
};

const REQUEST_PAGES = {
    [REQUEST_TYPES.LEAVE]: ROUTES.ADMIN_LEAVE_REQUESTS,
    [REQUEST_TYPES.REFUND]: ROUTES.ADMIN_REFUNDS,
};

const MILLION = 1_000_000;
const SKELETON_ROW_COUNT = 3;

// Revenue figures come in million VND: 24.1 -> "24,1".
const millionFormatter = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatMillion = (value) => millionFormatter.format(value);

// "Thực thu theo ngày · tháng 10/2026 (triệu ₫)"; a day or week label starts with a weekday / date, so it keeps its case.
const chartTitle = (report) => {
    const label = report.period === REPORT_PERIODS.MONTH || report.period === REPORT_PERIODS.YEAR ? report.label.toLowerCase() : report.label;
    return `${CHART_TEXTS[report.period].title} · ${label} (triệu ₫)`;
};

const signed = (value) => (value > 0 ? `+${value}` : String(value));

const toneOf = (change) => {
    if (change > 0) return "positive";
    if (change < 0) return "negative";
    return "neutral";
};

// Comparison line of a metric, e.g. "+12% so với tuần trước"; nothing to compare = no line.
const changeCaption = (change, report, unit = "") =>
    change === null ? undefined : `${signed(change)}${unit} ${report.comparison.caption}`;

// Card with a bordered head row: title on the left, an optional note or action on the right.
const ReportCard = ({ title, aside, children }) => (
    <section className="card-app flex flex-col p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="card-title flex-1">{title}</h2>
            {aside}
        </div>
        <div className="px-5 pb-5 pt-4">{children}</div>
    </section>
);

const DebtCard = ({ debts, loading, onViewAll }) => (
    <ReportCard
        title="Công nợ"
        aside={
            <button type="button" className="btn btn-link h-auto p-0 font-semibold" onClick={onViewAll}>
                Xem danh sách
            </button>
        }
    >
        {loading || !debts ? (
            <div className="skeleton h-56 w-full" aria-hidden="true" />
        ) : (
            <div className="flex flex-col gap-3.5">
                <div>
                    <p className="text-muted">Còn phải thu</p>
                    <p className="num font-heading text-heading-1 text-ink">{formatCurrency(debts.total)}</p>
                    <p className="num text-caption font-normal text-muted">{debts.invoiceCount} hoá đơn chưa thanh toán đủ</p>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Bệnh nhân</th>
                                <th scope="col" className="text-right">
                                    Còn nợ
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.items.map((item) => (
                                <tr key={item.invoiceCode}>
                                    <td className="py-2">
                                        <p className="font-semibold text-ink">{item.patientName}</p>
                                        <p className="text-caption font-normal text-muted">
                                            {item.invoiceCode} · {item.note}
                                        </p>
                                    </td>
                                    <td className="num whitespace-nowrap text-right font-bold text-ink">{formatCurrency(item.remaining)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </ReportCard>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState(REPORT_PERIODS.WEEK);
    const [offset, setOffset] = useState(0);
    const [exportOpen, setExportOpen] = useState(false);

    const { loading, value: reportResult } = useAsync(() => getReport({ period, offset }), [period, offset]);
    const { loading: requestsLoading, value: requestsResult } = useAsync(() => getPendingRequests(), []);

    const report = reportResult?.success ? reportResult.data : null;
    const requests = requestsResult?.success ? requestsResult.data : [];

    const changePeriod = (next) => {
        setPeriod(next);
        setOffset(0);
    };

    const openRequest = (request) => navigate(`${REQUEST_PAGES[request.type]}?id=${request.id}`);

    // TODO: open the "Danh sách công nợ" drawer once it is built.
    const openDebts = () => {};

    // TODO: open the invoices of the clicked hour once the invoice list exists.
    const openInvoices = () => {};

    // A day bar opens that day's report, a month bar that month's; days not reached yet have nothing to show.
    const openBar = (bar) => {
        if (period === REPORT_PERIODS.DAY) return openInvoices(bar);
        if (bar.value === null) return;
        const next = period === REPORT_PERIODS.YEAR ? REPORT_PERIODS.MONTH : REPORT_PERIODS.DAY;
        setPeriod(next);
        setOffset(getReportOffset(next, bar.date));
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="page-header mb-0 items-center">
                <div>
                    <h1 className="page-title">Báo cáo</h1>
                    <p className="num mt-1 text-caption text-muted">
                        {report ? `Cập nhật lúc ${formatDateTime(report.updatedAt)}` : "Đang tải…"}
                    </p>
                </div>
                {/* Phone: period buttons share the full width, the navigator stretches next to "Xuất báo cáo". */}
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                    <SegmentedControl
                        options={PERIOD_OPTIONS}
                        value={period}
                        onChange={changePeriod}
                        label="Kỳ báo cáo"
                        className="w-full *:flex-1 sm:w-auto sm:*:flex-none"
                    />
                    <PeriodNavigator
                        className="min-w-0 flex-1 sm:flex-none"
                        label={report?.label ?? "…"}
                        onPrevious={() => setOffset((current) => current - 1)}
                        onNext={() => setOffset((current) => current + 1)}
                        nextDisabled={offset >= 0}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setExportOpen(true)}>
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={Wallet}
                    label="Doanh thu thực thu"
                    loading={loading}
                    value={report && formatCurrency(report.revenue.value * MILLION)}
                    caption={report && changeCaption(report.revenue.change, report, "%")}
                    tone={report ? toneOf(report.revenue.change) : undefined}
                />
                <MetricCard
                    icon={Stethoscope}
                    label="Lượt khám"
                    loading={loading}
                    value={report?.visits.value}
                    caption={report && changeCaption(report.visits.change, report, "%")}
                    tone={report ? toneOf(report.visits.change) : undefined}
                />
                <MetricCard
                    icon={UserPlus}
                    label="Bệnh nhân mới"
                    loading={loading}
                    value={report?.newPatients.value}
                    caption={report && changeCaption(report.newPatients.change, report)}
                    tone={report ? toneOf(report.newPatients.change) : undefined}
                />
                <MetricCard
                    icon={CalendarCheck}
                    label="Lịch hẹn trong kỳ"
                    loading={loading}
                    value={report?.appointments.total}
                    caption={
                        report &&
                        `${report.appointments.completed} hoàn thành · ${report.appointments.cancelled} huỷ · ${report.appointments.noShow} lỡ hẹn`
                    }
                />
            </div>

            <ReportCard
                title={report ? chartTitle(report) : CHART_TEXTS[period].title}
                aside={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-normal text-muted">
                        {report && period !== REPORT_PERIODS.DAY && (
                            <>
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-sm bg-chart-1" aria-hidden="true" />
                                    {report.comparison.current}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-4 border-t-2 border-dashed border-placeholder" aria-hidden="true" />
                                    {report.comparison.previous}
                                </span>
                            </>
                        )}
                        <span>{CHART_TEXTS[period].hint}</span>
                    </div>
                }
            >
                {loading ? (
                    <div className="skeleton h-64 w-full" aria-hidden="true" />
                ) : (
                    report && (
                        <BarChart
                            data={report.revenueBars}
                            title={chartTitle(report)}
                            formatValue={formatMillion}
                            previousLabel={period === REPORT_PERIODS.DAY ? undefined : report.comparison.previous}
                            onSelect={openBar}
                        />
                    )
                )}
            </ReportCard>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
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
                <DebtCard debts={report?.debts} loading={loading} onViewAll={openDebts} />
            </div>

            <section className="card-app @container overflow-hidden p-0" aria-labelledby="pending-requests-title">
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                    <h2 id="pending-requests-title" className="card-title flex-1">
                        Đơn chờ duyệt
                    </h2>
                    {requests.length > 0 && <span className="num rounded-full bg-warning-soft px-2 text-caption text-warning">{requests.length}</span>}
                </div>
                {/* Narrow card: one block per request; wide enough for every column: the table. */}
                <ul className="divide-y divide-border @4xl:hidden" aria-busy={requestsLoading}>
                    {requestsLoading &&
                        Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                            <li key={index} aria-hidden="true" className="flex flex-col gap-2 px-5 py-4">
                                <div className="skeleton h-4 w-24" />
                                <div className="skeleton h-4 w-full max-w-64" />
                            </li>
                        ))}
                    {!requestsLoading && requests.length === 0 && (
                        <li className="empty-state">
                            <Inbox className="empty-state-icon" aria-hidden="true" />
                            <p className="empty-state-title">Không có đơn nào chờ duyệt</p>
                        </li>
                    )}
                    {!requestsLoading &&
                        requests.map((request) => (
                            <li key={`${request.type}-${request.id}`} className="flex flex-col gap-2 px-5 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <StatusBadge status={request.type} labels={REQUEST_TYPE_BADGES} />
                                    <span className="num text-caption text-muted">{formatDateTime(request.submittedAt)}</span>
                                </div>
                                <div>
                                    <p className="text-label text-ink">{request.senderName}</p>
                                    <p className="text-caption text-muted">{request.senderDetail}</p>
                                </div>
                                <p className="text-body-sm">{request.content}</p>
                                <button type="button" className="btn btn-primary self-start" onClick={() => openRequest(request)}>
                                    Xem &amp; duyệt
                                </button>
                            </li>
                        ))}
                </ul>
                <div className="relative hidden overflow-x-auto @4xl:block">
                    <table className="table" aria-busy={requestsLoading}>
                        <thead>
                            <tr>
                                <th scope="col">Loại đơn</th>
                                <th scope="col">Người gửi / bệnh nhân</th>
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
                                    return (
                                        <tr key={`${request.type}-${request.id}`}>
                                            <td>
                                                <StatusBadge status={request.type} labels={REQUEST_TYPE_BADGES} />
                                            </td>
                                            <td className="min-w-44 py-2">
                                                <p className="text-label text-ink">{request.senderName}</p>
                                                <p className="text-caption text-muted">{request.senderDetail}</p>
                                            </td>
                                            <td className="min-w-56">{request.content}</td>
                                            <td className="whitespace-nowrap text-muted">{formatDateTime(request.submittedAt)}</td>
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

            {exportOpen && <ExportReportPopup initialPeriod={period} onClose={() => setExportOpen(false)} />}
        </div>
    );
};

export default AdminDashboard;
