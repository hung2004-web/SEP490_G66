import { cx } from "@/utils/cx";
import { getToothState, toothName } from "@/utils/medicalRecord";
import { MEDICAL_RECORD_TOOTH_STATUS } from "@/utils/messages";

const SURFACE_FILL = { watch: "fill-warning-solid/30", done: "fill-primary/45", treating: "fill-warning-solid/60" };
const SURFACE_FILL_DEFAULT = "fill-danger-solid/45";
const LINE_STROKE = { condition: "stroke-danger", planned: "stroke-danger", treating: "stroke-warning", done: "stroke-primary", watch: "stroke-warning" };

const regionOf = (code, quadrant, upper) => {
    if (code === "O" || code === "I") return "C";
    if (code === "B") return upper ? "T" : "B";
    if (code === "L" || code === "P") return upper ? "B" : "T";
    const rightSide = quadrant === 1 || quadrant === 4;
    if (code === "M") return rightSide ? "R" : "L";
    return rightSide ? "L" : "R";
};

const ToothSvg = ({ tooth, state }) => {
    const quadrant = Math.floor(tooth / 10);
    const upper = quadrant <= 2;
    const molar = tooth % 10 >= 6;
    const top = upper ? 44 : 2;
    const fills = {};
    Object.entries(state.surfaces).forEach(([code, entry]) => {
        fills[regionOf(code, quadrant, upper)] = SURFACE_FILL[entry.st] ?? SURFACE_FILL_DEFAULT;
    });
    const regions = {
        T: `2,${top} 32,${top} 22,${top + 10} 12,${top + 10}`,
        B: `2,${top + 30} 32,${top + 30} 22,${top + 20} 12,${top + 20}`,
        L: `2,${top} 12,${top + 10} 12,${top + 20} 2,${top + 30}`,
        R: `32,${top} 22,${top + 10} 22,${top + 20} 32,${top + 30}`,
    };
    const roots = molar ? [10, 24] : [17];
    const lineStroke = (entry) => LINE_STROKE[entry.st] ?? "stroke-danger";

    return (
        <svg viewBox="0 0 34 76" className="block h-auto w-full max-w-9.5" aria-hidden="true">
            {roots.map((x) => (
                <path
                    key={`root-${x}`}
                    d={upper ? `M${x - 5} 44 L${x - 2} 5 L${x + 2} 5 L${x + 5} 44Z` : `M${x - 5} 32 L${x - 2} 71 L${x + 2} 71 L${x + 5} 32Z`}
                    className="fill-surface-muted stroke-placeholder"
                    strokeWidth="1"
                />
            ))}
            {state.pulp &&
                roots.map((x) => (
                    <line
                        key={`canal-${x}`}
                        x1={x}
                        y1={upper ? 42 : 34}
                        x2={x}
                        y2={upper ? 9 : 67}
                        className={lineStroke(state.pulp)}
                        strokeWidth="2.6"
                        strokeLinecap="round"
                    />
                ))}
            {Object.entries(regions).map(([key, points]) => (
                <g key={key}>
                    <polygon points={points} className="fill-canvas stroke-placeholder" strokeWidth="1" />
                    {fills[key] && <polygon points={points} className={cx(fills[key], "stroke-placeholder")} strokeWidth="1" />}
                </g>
            ))}
            <rect x="12" y={top + 10} width="10" height="10" className="fill-canvas stroke-placeholder" strokeWidth="1" />
            {fills.C && <rect x="12" y={top + 10} width="10" height="10" className={cx(fills.C, "stroke-placeholder")} strokeWidth="1" />}
            {state.crown && (
                <rect
                    x="0.5"
                    y={top - 1.5}
                    width="33"
                    height="33"
                    rx="3"
                    fill="none"
                    className={lineStroke(state.crown)}
                    strokeWidth="2.6"
                    strokeDasharray={state.crown.st === "planned" ? "4 3" : undefined}
                />
            )}
            {state.watch && (
                <g>
                    <circle cx="17" cy={upper ? 24 : 52} r="7" className="fill-warning-soft stroke-warning" strokeWidth="1.4" />
                    <text x="17" y={upper ? 28 : 56} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-warning">
                        !
                    </text>
                </g>
            )}
        </svg>
    );
};

const ToothButton = ({ tooth, entries, selected, onSelect }) => {
    const hasEntries = entries.length > 0;
    const state = getToothState(entries);
    const upper = Math.floor(tooth / 10) <= 2;
    const statusText = state.statuses.map((status) => MEDICAL_RECORD_TOOTH_STATUS[status]?.label ?? status).join(", ");
    return (
        <button
            type="button"
            disabled={!hasEntries}
            title={`Răng ${tooth} · ${toothName(tooth)}`}
            aria-label={hasEntries ? `Răng ${tooth}: ${statusText}` : `Răng ${tooth}`}
            className={cx(
                "flex min-w-0 items-center gap-0.5 rounded-lg border px-px py-0.75 outline-none focus-visible:shadow-focus",
                upper ? "flex-col" : "flex-col-reverse",
                selected ? "border-primary bg-primary-soft" : "border-transparent",
                hasEntries ? !selected && "hover:bg-surface-tint" : "cursor-default",
            )}
            onClick={() => onSelect(tooth)}
        >
            <span className={cx("text-caption font-semibold", selected ? "text-primary" : "text-muted")}>{tooth}</span>
            <ToothSvg tooth={tooth} state={state} />
        </button>
    );
};

export default ToothButton;
