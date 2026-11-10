import SegmentedControl from "@/components/ui/SegmentedControl";
import { cx } from "@/utils/cx";
import { ADULT_CHART, CHART_TYPE, CHILD_CHART, toothCategory, toothLabel } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

const CHART_OPTIONS = [
    { value: CHART_TYPE.ADULT, label: "Người lớn (11–48)" },
    { value: CHART_TYPE.CHILD, label: "Trẻ em (51–85)" },
];

// Colours of a tooth box by its most important finding (see toothCategory).
const CATEGORY_TONE = {
    issue: "border-danger bg-danger-soft text-danger",
    filling: "border-primary bg-primary-soft text-primary",
    rct: "border-chart-7 bg-chart-7/10 text-chart-7",
    crown: "border-warning-solid bg-warning-soft text-warning",
    missing: "border-dashed border-placeholder bg-surface-tint text-placeholder",
    replaced: "border-dashed border-success-solid bg-success-soft text-success",
};

const LEGEND = [
    { letter: "S", label: "Sâu răng / cần điều trị", tone: CATEGORY_TONE.issue },
    { letter: "T", label: "Đã trám", tone: CATEGORY_TONE.filling },
    { letter: "Đ", label: "Đã điều trị tủy", tone: CATEGORY_TONE.rct },
    { letter: "M", label: "Mão / cầu sứ", tone: CATEGORY_TONE.crown },
    { letter: "X", label: "Mất răng", tone: CATEGORY_TONE.missing },
];

const ToothBox = ({ tooth, entries, selected, onSelect }) => {
    const category = toothCategory(entries);
    const count = entries.length;
    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-label={`Răng ${tooth}${count ? `, ${count} ghi nhận` : ""}`}
            title={`Răng ${tooth} · ${toothLabel(tooth)}`}
            className={cx(
                "num relative grid h-10 w-[34px] shrink-0 cursor-pointer place-items-center rounded-md border bg-canvas text-caption font-semibold outline-none transition-colors focus-visible:shadow-focus",
                category ? CATEGORY_TONE[category] : "border-border-strong text-ink hover:border-primary",
                selected && "border-2 border-primary",
            )}
            onClick={() => onSelect(tooth)}
        >
            {tooth}
            {count > 1 && (
                <span className="absolute -top-2 -right-1.5 grid size-4 place-items-center rounded-full border-2 border-canvas bg-ink text-[10px] font-bold text-on-primary">
                    {count}
                </span>
            )}
        </button>
    );
};

const JawRow = ({ halves, entriesOf, selectedTooth, onSelectTooth }) => (
    <div className="flex w-full items-center gap-1">
        {halves.map((half, index) => (
            <div key={half[0]} className="contents">
                {index === 1 && <span aria-hidden="true" className="h-11 w-0.5 shrink-0 bg-border-strong" />}
                <div className={cx("flex min-w-0 flex-1 gap-1", index === 0 ? "justify-end" : "justify-start")}>
                    {half.map((tooth) => (
                        <ToothBox key={tooth} tooth={tooth} entries={entriesOf(tooth)} selected={tooth === selectedTooth} onSelect={onSelectTooth} />
                    ))}
                </div>
            </div>
        ))}
    </div>
);

// "Sơ đồ răng" of the exam: adult or primary-teeth chart, every tooth selectable.
// entries: [{ tooth, condition, replaced? }]. children: the panel of the selected tooth.
const ExamDentalChart = ({ entries = [], chartType, onChartTypeChange, selectedTooth, onSelectTooth, children }) => {
    const chart = chartType === CHART_TYPE.CHILD ? CHILD_CHART : ADULT_CHART;
    const entriesOf = (tooth) => entries.filter((entry) => Number(entry.tooth) === tooth);
    const legend = chartType === CHART_TYPE.CHILD ? [...LEGEND, { letter: "T", label: "Đã thay răng vĩnh viễn", tone: CATEGORY_TONE.replaced }] : LEGEND;

    return (
        <ClinicalExamSection
            title="Sơ đồ răng"
            action={<SegmentedControl label="Loại sơ đồ răng" options={CHART_OPTIONS} value={chartType} onChange={onChartTypeChange} />}
            bodyClassName="flex flex-col gap-4"
        >
            {/* Fixed-size tooth boxes; on narrow screens the chart scrolls sideways instead of squeezing. */}
            <div className="overflow-x-auto rounded-[10px] bg-surface-tint px-2 py-3">
                <div className="mx-auto flex w-max min-w-full flex-col items-center gap-1.5">
                <p className="text-caption font-medium text-muted">Hàm trên</p>
                <JawRow halves={chart.upper} entriesOf={entriesOf} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth} />
                <span aria-hidden="true" className="my-1 h-px w-full max-w-140 bg-border" />
                <JawRow halves={chart.lower} entriesOf={entriesOf} selectedTooth={selectedTooth} onSelectTooth={onSelectTooth} />
                <p className="text-caption font-medium text-muted">Hàm dưới</p>
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-caption text-body">
                    {legend.map((item) => (
                        <li key={item.label} className="flex items-center gap-1.5">
                            <span aria-hidden="true" className={cx("grid size-4.5 place-items-center rounded border text-[9px] font-bold", item.tone)}>
                                {item.letter}
                            </span>
                            {item.label}
                        </li>
                    ))}
                    <li className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-4.5 rounded border-2 border-primary bg-canvas" />
                        Đang chọn
                    </li>
                </ul>
                {chartType === CHART_TYPE.CHILD && <p className="text-caption text-muted">Mặc định sơ đồ trẻ em cho bệnh nhân ≤ 12 tuổi · bác sĩ có thể chuyển tay</p>}
            </div>
            {children}
        </ClinicalExamSection>
    );
};

export default ExamDentalChart;
