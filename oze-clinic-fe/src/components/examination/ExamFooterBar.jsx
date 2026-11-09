import { ArrowRight } from "lucide-react";

const saveStatusText = (saving, savedAt) => {
    if (saving) return "Đang lưu nháp…";
    return savedAt ? `Đã lưu nháp lúc ${savedAt}` : "Chưa lưu nháp";
};

// Sticky action bar at the bottom of the "Khám" tab.
// canComplete: false until the exam has enough data (e.g. at least one diagnosis); completeHint explains why.
const ExamFooterBar = ({ saving = false, savedAt, canComplete = true, completeHint, onSaveDraft, onEnd, onComplete }) => (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-canvas px-5 py-3 shadow-md">
        <div className="mr-auto min-w-0 text-caption text-muted" aria-live="polite">
            <p>{saveStatusText(saving, savedAt)}</p>
            {!canComplete && completeHint && <p className="text-warning">{completeHint}</p>}
        </div>
        {onSaveDraft && (
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={onSaveDraft}>
                {saving && <span className="btn-spinner" aria-hidden="true" />}
                Lưu nháp
            </button>
        )}
        {onEnd && (
            <button type="button" className="btn border-danger bg-canvas text-danger hover:bg-danger-soft" disabled={saving} onClick={onEnd}>
                Kết thúc khám
            </button>
        )}
        {onComplete && (
            <button type="button" className="btn btn-primary" disabled={saving || !canComplete} onClick={onComplete}>
                Hoàn thành & chuyển sang lập kế hoạch điều trị
                <ArrowRight className="size-4" aria-hidden="true" />
            </button>
        )}
    </div>
);

export default ExamFooterBar;
