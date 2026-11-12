import { useEffect, useState } from "react";
import { clinicToday, getRevenueByDay } from "@/services/receptionService";
import { cx } from "@/utils/cx";

// Money actually received per day (confirmed payments), cash and transfer stacked. Pending transfers are not counted
// until they are confirmed. Source: GET api/invoice-reports/revenue-by-day (at most 31 days).

const RANGES = [
    { days: 7, label: "7 ngày" },
    { days: 14, label: "14 ngày" },
    { days: 30, label: "30 ngày" },
];
const CASH_COLOR = "var(--color-chart-1)";
const TRANSFER_COLOR = "var(--color-chart-3)";
const CHART_HEIGHT = 180;

const money = (value) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const short = (value) =>
    value >= 1_000_000 ? `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : `${Math.round(value / 1000)}k`;
const dayLabel = (date) => {
    const [, month, day] = date.split("-");
    return `${day}/${month}`;
};

const RevenueChart = () => {
    const [days, setDays] = useState(7);
    const [state, setState] = useState({ loading: true, result: null });

    useEffect(() => {
        let active = true;
        getRevenueByDay({ from: clinicToday(-(days - 1)), to: clinicToday() }).then((result) => active && setState({ loading: false, result }));
        return () => {
            active = false;
        };
    }, [days]);

    const report = state.result?.success ? state.result.data : null;
    const max = Math.max(1, ...(report?.days ?? []).map((d) => d.total));
    const today = clinicToday();

    return (
        <section aria-labelledby="revenue-title" className="mb-5 rounded-lg border border-border bg-canvas p-5">
            <div className="flex flex-wrap items-start gap-4">
                <div className="mr-auto">
                    <h2 id="revenue-title" className="font-heading text-heading-3 text-ink">
                        Tiền đã thu theo ngày
                    </h2>
                    <p className="text-body-sm text-muted">Chỉ tính khoản đã xác nhận. Chuyển khoản chờ đối soát chưa được cộng.</p>
                </div>
                <div role="group" aria-label="Khoảng thời gian" className="flex gap-1 rounded-lg bg-surface-muted p-1">
                    {RANGES.map((range) => (
                        <button
                            key={range.days}
                            type="button"
                            aria-pressed={days === range.days}
                            onClick={() => {
                                setState((current) => ({ ...current, loading: true }));
                                setDays(range.days);
                            }}
                            className={cx(
                                "rounded-md px-3 py-1 text-label",
                                days === range.days ? "bg-canvas text-ink shadow-sm" : "text-muted hover:text-ink",
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {state.result && !state.result.success && (
                <p role="alert" className="mt-4 text-body-sm text-danger">
                    {state.result.message}
                </p>
            )}

            {report && (
                <>
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
                        <Total label="Tiền mặt" value={report.cashTotal} color={CASH_COLOR} />
                        <Total label="Chuyển khoản" value={report.transferTotal} color={TRANSFER_COLOR} />
                        <Total label="Tổng" value={report.total} strong />
                    </dl>

                    <figure className={cx("m-0 mt-4 transition-opacity", state.loading && "opacity-50")}>
                        <div className="flex items-end gap-1 border-b border-border-strong" style={{ height: CHART_HEIGHT }}>
                            {report.days.map((d) => (
                                <div
                                    key={d.date}
                                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
                                    title={`${dayLabel(d.date)}: tiền mặt ${money(d.cash)}, chuyển khoản ${money(d.transfer)}`}
                                >
                                    {d.total > 0 && report.days.length <= 14 && (
                                        <span className="num mb-1 text-center text-caption text-muted">{short(d.total)}</span>
                                    )}
                                    <div
                                        className="mx-auto flex w-full max-w-10 flex-col overflow-hidden rounded-t-sm"
                                        style={{ height: `${(d.total / max) * 100}%` }}
                                    >
                                        <div style={{ flexGrow: d.transfer, background: TRANSFER_COLOR }} />
                                        <div style={{ flexGrow: d.cash, background: CASH_COLOR }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 flex gap-1">
                            {report.days.map((d, index) => (
                                <span
                                    key={d.date}
                                    className={cx(
                                        "num min-w-0 flex-1 truncate text-center text-caption",
                                        d.date === today ? "font-semibold text-primary" : "text-muted",
                                        report.days.length > 14 && index % 5 !== 0 && index !== report.days.length - 1 && "invisible",
                                    )}
                                >
                                    {dayLabel(d.date)}
                                </span>
                            ))}
                        </div>
                        <figcaption className="sr-only">{report.days.map((d) => `${dayLabel(d.date)}: ${money(d.total)}`).join("; ")}</figcaption>
                    </figure>
                </>
            )}
        </section>
    );
};

const Total = ({ label, value, color, strong }) => (
    <div>
        <dt className="flex items-center gap-2 text-body-sm text-muted">
            {color && <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} />}
            {label}
        </dt>
        <dd className={cx("num m-0 font-heading text-ink", strong ? "text-heading-2 font-bold" : "text-heading-3")}>{money(value)}</dd>
    </div>
);

export default RevenueChart;
