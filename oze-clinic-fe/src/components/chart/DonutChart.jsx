import { useState } from "react";
import { cx } from "@/utils/cx";

const MAX_COLORED = 5;
const RADIUS = 40;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Surface gap between slices, in the same units as the circle.
const GAP = 1.2;

// Slice colour by position, never cycled. Pass data biggest first; from the 6th item on, and any item with
// other: true ("Khác"), the slice is grey. Fold the small ones into "Khác" before passing them in.
const colorOf = (item, index) =>
    item.other || index >= MAX_COLORED ? "var(--color-chart-other)" : `var(--color-chart-${index + 1})`;

// Share of a whole: ring + legend (name, value, %). data: [{ label, value, other? }].
// centerValue / centerLabel go in the hole, e.g. "186,5 tr" / "Tổng".
const DonutChart = ({ data, title, formatValue = String, centerValue, centerLabel }) => {
    const [active, setActive] = useState(null);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const share = (value) => (total > 0 ? value / total : 0);

    // Each slice starts where the ones before it end.
    const slices = data.map((item, index) => ({
        item,
        index,
        length: share(item.value) * CIRCUMFERENCE,
        offset: data.slice(0, index).reduce((sum, previous) => sum + share(previous.value) * CIRCUMFERENCE, 0),
    }));

    const dimmed = (index) => active !== null && active !== index;

    return (
        <figure className="m-0 flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            <div className="relative size-44 shrink-0" aria-hidden="true">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    {slices.map(({ item, index, length, offset: start }) => (
                        <circle
                            key={item.label}
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="none"
                            stroke={colorOf(item, index)}
                            strokeWidth={active === index ? STROKE + 3 : STROKE}
                            strokeDasharray={`${Math.max(0, length - GAP)} ${CIRCUMFERENCE}`}
                            strokeDashoffset={-start}
                            className={cx("transition-[opacity,stroke-width] duration-150", dimmed(index) && "opacity-40")}
                            onPointerEnter={() => setActive(index)}
                            onPointerLeave={() => setActive(null)}
                        />
                    ))}
                </svg>
                {(centerValue || centerLabel) && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="num font-heading text-heading-2 text-ink">
                            {active === null ? centerValue : formatValue(data[active].value)}
                        </span>
                        <span className="text-caption text-muted">{active === null ? centerLabel : data[active].label}</span>
                    </div>
                )}
            </div>

            <table className="w-full max-w-md text-body-sm">
                <caption className="sr-only">{title}</caption>
                <tbody>
                    {data.map((item, index) => (
                        <tr
                            key={item.label}
                            className={cx("transition-opacity duration-150", dimmed(index) && "opacity-50")}
                            onPointerEnter={() => setActive(index)}
                            onPointerLeave={() => setActive(null)}
                        >
                            <th scope="row" className="py-1.5 pr-4 text-left font-normal text-body">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: colorOf(item, index) }}
                                        aria-hidden="true"
                                    />
                                    {item.label}
                                </span>
                            </th>
                            <td className="num py-1.5 pr-4 text-right text-muted">{formatValue(item.value)}</td>
                            <td className="num w-12 py-1.5 text-right font-semibold text-ink">
                                {Math.round(share(item.value) * 100)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
};

export default DonutChart;
