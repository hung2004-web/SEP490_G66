import { useState } from "react";
import { cx } from "@/utils/cx";

const TICK_COUNT = 4;

// Rounds the axis step up to 1, 2, 2.5 or 5 x 10^n so the ticks read cleanly (0, 10, 20, 30, 40).
const niceStep = (max) => {
    const rough = max / TICK_COUNT;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough);
    return step * magnitude;
};

// One-series column chart. data: [{ label, sublabel?, value }]; value null = no data yet (no bar).
// formatValue formats the numbers on bars and in the tooltip.
// title names what is measured (used for screen readers; the card around the chart shows it on screen).
const BarChart = ({ data, title, formatValue = String, height = 224 }) => {
    const [active, setActive] = useState(null);

    const max = Math.max(0, ...data.map((item) => item.value ?? 0));
    const step = max > 0 ? niceStep(max) : 1;
    const top = step * TICK_COUNT;
    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => index * step);
    const percent = (value) => ((value ?? 0) / top) * 100;
    const show = (value) => (value === null ? "Chưa có số liệu" : formatValue(value));

    return (
        <figure className="m-0">
            <div className="flex gap-2" aria-hidden="true">
                {/* Y axis */}
                <div className="relative w-8 shrink-0" style={{ height }}>
                    {ticks.map((tick) => (
                        <span
                            key={tick}
                            className="num absolute right-0 translate-y-1/2 text-caption text-placeholder"
                            style={{ bottom: `${percent(tick)}%` }}
                        >
                            {tick}
                        </span>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="relative" style={{ height }}>
                        {ticks.map((tick) => (
                            <div
                                key={tick}
                                className={cx("absolute inset-x-0 border-t", tick === 0 ? "border-border-strong" : "border-border")}
                                style={{ bottom: `${percent(tick)}%` }}
                            />
                        ))}
                        <div className="absolute inset-0 flex items-end">
                            {data.map((item, index) => (
                                <div
                                    key={item.label}
                                    className="relative flex h-full flex-1 items-end justify-center"
                                    onPointerEnter={() => setActive(index)}
                                    onPointerLeave={() => setActive(null)}
                                >
                                    <div
                                        className={cx(
                                            "w-3/5 max-w-16 rounded-t bg-chart-1 transition-opacity duration-150",
                                            active !== null && active !== index && "opacity-50",
                                        )}
                                        style={{ height: `${percent(item.value)}%` }}
                                    />
                                    {active === index ? (
                                        <div
                                            className="absolute z-10 mb-1 whitespace-nowrap rounded-md bg-surface-navy px-2.5 py-1.5 text-caption text-on-navy shadow-md"
                                            style={{ bottom: `${percent(item.value)}%` }}
                                        >
                                            <span className="text-on-navy-soft">
                                                {item.label}
                                                {item.sublabel && ` · ${item.sublabel}`}
                                            </span>
                                            <span className="num ml-2 font-semibold">{show(item.value)}</span>
                                        </div>
                                    ) : (
                                        item.value !== null && (
                                            <span
                                                className="num absolute mb-1 text-caption font-semibold text-ink"
                                                style={{ bottom: `${percent(item.value)}%` }}
                                            >
                                                {formatValue(item.value)}
                                            </span>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* X axis */}
                    <div className="mt-2 flex">
                        {data.map((item) => (
                            <div key={item.label} className="flex-1 text-center text-caption text-muted">
                                <p>{item.label}</p>
                                {item.sublabel && <p className="num text-placeholder">{item.sublabel}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Same numbers for screen readers */}
            <table className="sr-only">
                <caption>{title}</caption>
                <tbody>
                    {data.map((item) => (
                        <tr key={item.label}>
                            <th scope="row">
                                {item.label} {item.sublabel}
                            </th>
                            <td>{show(item.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
};

export default BarChart;
