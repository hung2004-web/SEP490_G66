import { HISTORY_ALLERGY_OPTIONS, HISTORY_CONDITION_OPTIONS, HISTORY_DENTAL_OPTIONS, HISTORY_FEMALE_CONDITION_OPTIONS } from "@/utils/messages";
import ClinicalExamSection from "./ClinicalExamSection";
import HistoryChecklist from "./HistoryChecklist";

// "Tiền sử bệnh": allergies, underlying conditions and dental history, completed by the doctor in step 1.
// history: { allergies: [], conditions: [], dental: [] }; onChange receives the whole updated history.
// gender "female" adds pregnancy / breastfeeding to the conditions.
const MedicalHistoryCard = ({ history, gender, onChange }) => {
    const female = gender === "female";
    const conditionOptions = female ? [...HISTORY_CONDITION_OPTIONS, ...HISTORY_FEMALE_CONDITION_OPTIONS] : HISTORY_CONDITION_OPTIONS;
    const update = (key) => (value) => onChange?.({ ...history, [key]: value });

    return (
        <ClinicalExamSection
            title="Tiền sử bệnh"
            divided={false}
            badge={<span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Bác sĩ bổ sung</span>}
            action={<span className="text-caption text-muted">Bấm vào từng mục để mở / thu gọn</span>}
            bodyClassName="flex flex-col gap-3.5"
        >
            <HistoryChecklist
                title="Dị ứng"
                tone="danger"
                options={HISTORY_ALLERGY_OPTIONS}
                value={history.allergies}
                onChange={update("allergies")}
                placeholder="Dị ứng khác, ví dụ: Metronidazol"
            />
            <HistoryChecklist
                title="Bệnh nền & tình trạng sức khoẻ"
                tone="warning"
                options={conditionOptions}
                value={history.conditions}
                onChange={update("conditions")}
                placeholder="Bệnh khác"
                note={female ? undefined : `Bệnh nhân nữ có thêm 2 mục: ${HISTORY_FEMALE_CONDITION_OPTIONS.join(", ")}`}
            />
            <HistoryChecklist
                title="Tiền sử bệnh răng miệng"
                options={HISTORY_DENTAL_OPTIONS}
                value={history.dental}
                onChange={update("dental")}
                placeholder="Tiền sử khác, ví dụ: từng cấy ghép Implant"
                defaultOpen={false}
            />
        </ClinicalExamSection>
    );
};

export default MedicalHistoryCard;
