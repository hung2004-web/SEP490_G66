import SegmentedControl from "@/components/ui/SegmentedControl";
import { cx } from "@/utils/cx";
import { ADULT_CHART, CHART_TYPE, CHILD_CHART, toothLabel } from "@/utils/examination";
import ClinicalExamSection from "./ClinicalExamSection";

const CHART_OPTIONS = [
    { value: CHART_TYPE.ADULT, label: "Người lớn (11–48)" },
    { value: CHART_TYPE.CHILD, label: "Trẻ em (51–85)" },
];

// A tooth with at least one finding is highlighted; the findings themselves are in "Tình trạng răng hiện tại".
const ToothBox = ({ tooth, entries, selected, onSelect }) => {
    const count = entries.length;
    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-label={`Răng ${tooth}${count ? `, ${count} ghi nhận` : ""}`}
            title={`Răng ${tooth} · ${toothLabel(tooth)}`}
            className={cx(
                "num relative grid h-10 w-[34px] shrink-0 cursor-pointer place-items-center rounded-md border bg-canvas text-caption font-semibold outline-none transition-colors focus-visible:shadow-focus",
                count ? "border-warning-solid bg-warning-soft text-warning" : "border-border-strong text-ink hover:border-primary",
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
            {chartType === CHART_TYPE.CHILD && <p className="text-caption text-muted">Mặc định sơ đồ trẻ em cho bệnh nhân ≤ 12 tuổi · bác sĩ có thể chuyển tay</p>}
            {children}
        </ClinicalExamSection>
    );
};

export default ExamDentalChart;
