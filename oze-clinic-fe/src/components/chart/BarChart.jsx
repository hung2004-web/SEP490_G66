import { useState } from "react";
import { cx } from "@/utils/cx";

const TICK_COUNT = 4;
// With more bars than this (a month of days) only the highest and the latest bar get a number on top.
const MAX_LABELLED_BARS = 12;
// On a narrow chart with many bars, only every 5th x-axis label (plus the first and last) stays visible.
const AXIS_LABEL_STEP = 5;

// Rounds the axis step up to 1, 2, 2.5 or 5 x 10^n, so the tallest bar leaves some room above it.
const niceStep = (max) => {
    const rough = max / TICK_COUNT;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough);
    return step * magnitude;
};

// Column chart. data: [{ label, sublabel?, value, previous? }]; value null = no data yet (no bar).
// previous draws a dashed line for the period compared with (named by previousLabel in the tooltip).
// formatValue formats the numbers on bars and in the tooltip. onSelect(item, index) makes each column a button.
// title names what is measured (used for screen readers; the card around the chart shows it on screen).
const BarChart = ({ data, title, formatValue = String, previousLabel, onSelect, height = 224 }) => {
    const [active, setActive] = useState(null);

    const max = Math.max(0, ...data.flatMap((item) => [item.value ?? 0, item.previous ?? 0]));
    const top = max > 0 ? niceStep(max) * TICK_COUNT : 1;
    const percent = (value) => ((value ?? 0) / top) * 100;
    const show = (value) => (value === null ? "Chưa có số liệu" : formatValue(value));

    const filled = data.flatMap((item, index) => (item.value === null ? [] : [index]));
    const latest = filled.at(-1);
    const highest = filled.reduce((best, index) => (best === undefined || data[index].value > data[best].value ? index : best), undefined);
    const labelled = (index) => data.length <= MAX_LABELLED_BARS || index === latest || index === highest;
    const axisKey = (index) => data.length <= MAX_LABELLED_BARS || index === 0 || index === data.length - 1 || (index + 1) % AXIS_LABEL_STEP === 0;
    // Tooltips of the outer columns open inwards so they stay inside the card.
    const tooltipSide = (index) => {
        if (index < data.length / 3) return "left-0";
        return index >= (data.length * 2) / 3 ? "right-0" : "";
    };

    // Line through the middle of each column, in a 100 x 100 box stretched over the plot.
    const linePoints = data
        .flatMap((item, index) =>
            item.previous == null ? [] : [`${((index + 0.5) / data.length) * 100},${100 - percent(item.previous)}`],
        )
        .join(" ");

    const Column = onSelect ? "button" : "div";

    return (
        <figure className="m-0 @container">
            <div className="relative border-b border-border-strong" style={{ height }}>
                <div className="absolute inset-0 flex items-end">
                    {data.map((item, index) => (
                        <Column
                            key={item.label}
                            {...(onSelect && {
                                type: "button",
                                onClick: () => onSelect(item, index),
                                "aria-label": `${[item.label, item.sublabel].filter(Boolean).join(" ")}: ${show(item.value)}`,
                            })}
                            className={cx(
                                "relative flex h-full min-w-0 flex-1 items-end justify-center",
                                onSelect && "cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-primary",
                            )}
                            onPointerEnter={() => setActive(index)}
                            onPointerLeave={() => setActive(null)}
                            onFocus={() => setActive(index)}
                            onBlur={() => setActive(null)}
                        >
                            <span
                                className={cx(
                                    "w-3/5 max-w-16 rounded-t bg-chart-1 transition-opacity duration-150",
                                    active !== null && active !== index && "opacity-50",
                                )}
                                style={{ height: `${percent(item.value)}%` }}
                                aria-hidden="true"
                            />
                            {active === index ? (
                                <span
                                    className={cx(
                                        "absolute z-10 mb-1 flex flex-col whitespace-nowrap rounded-md bg-surface-navy px-2.5 py-1.5 text-left text-caption text-on-navy shadow-md",
                                        tooltipSide(index),
                                    )}
                                    style={{ bottom: `${Math.max(percent(item.value), percent(item.previous))}%` }}
                                    aria-hidden="true"
                                >
                                    <span>
                                        <span className="text-on-navy-soft">
                                            {item.label}
                                            {item.sublabel && ` · ${item.sublabel}`}
                                        </span>
                                        <span className="num ml-2 font-semibold">{show(item.value)}</span>
                                    </span>
                                    {item.previous != null && (
                                        <span className="text-on-navy-soft">
                                            {previousLabel}
                                            <span className="num ml-2">{formatValue(item.previous)}</span>
                                        </span>
                                    )}
                                </span>
                            ) : (
                                item.value !== null &&
                                labelled(index) && (
                                    <span
                                        className="num absolute mb-1 text-caption font-semibold text-ink"
                                        style={{ bottom: `${percent(item.value)}%` }}
                                        aria-hidden="true"
                                    >
                                        {formatValue(item.value)}
                                    </span>
                                )
                            )}
                        </Column>
                    ))}
                </div>

                {linePoints && (
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 size-full overflow-visible text-placeholder"
                        aria-hidden="true"
                    >
                        <polyline
                            points={linePoints}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                )}
            </div>

            {/* X axis */}
            <div className="mt-2 flex" aria-hidden="true">
                {data.map((item, index) => (
                    <div key={item.label} className={cx("min-w-0 flex-1 text-center text-caption text-muted", !axisKey(index) && "@max-xl:invisible")}>
                        <p>{item.label}</p>
                        {item.sublabel && <p className="num text-placeholder">{item.sublabel}</p>}
                    </div>
                ))}
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
                            {previousLabel && (
                                <td>
                                    {previousLabel}: {item.previous == null ? "Chưa có số liệu" : formatValue(item.previous)}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
};

export default BarChart;
