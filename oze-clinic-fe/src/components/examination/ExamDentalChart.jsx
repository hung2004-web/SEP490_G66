import { DentalLegend, JawLabel, ToothRow } from "@/components/medicalRecord/DentalChartParts";
import { LOWER_TEETH, UPPER_TEETH } from "@/utils/medicalRecord";
import ClinicalExamSection from "./ClinicalExamSection";

// Editable dental chart of the exam: every tooth can be selected. entries: [{ id, tooth, surf, kind, st, note }].
// children: rendered under the chart, normally <ToothEditor /> for the selected tooth.
const ExamDentalChart = ({ entries = [], selectedTooth, onSelectTooth, action, children }) => {
    const toothCount = new Set(entries.map((entry) => String(entry.tooth))).size;

    return (
        <ClinicalExamSection
            title="Sơ đồ răng"
            description={toothCount > 0 ? `${toothCount} răng có ghi nhận · bấm vào răng để ghi nhận` : "Bấm vào răng để ghi nhận tình trạng"}
            action={action}
        >
            <JawLabel name="HÀM TRÊN" />
            <ToothRow teeth={UPPER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} editable />
            <div className="my-2.5 border-t-2 border-dashed border-border" />
            <ToothRow teeth={LOWER_TEETH} entries={entries} selectedTooth={selectedTooth} onSelect={onSelectTooth} editable />
            <JawLabel name="HÀM DƯỚI" />
            <DentalLegend entries={entries} showAll className="mt-4 border-t border-border pt-3" />
            {children && <div className="mt-4">{children}</div>}
        </ClinicalExamSection>
    );
};

export default ExamDentalChart;
