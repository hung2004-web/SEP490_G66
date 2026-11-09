import { useId, useState } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cx } from "@/utils/cx";
import { icdName, isValidToothCode } from "@/utils/examination";
import { ICD10_DENTAL } from "@/utils/messages";

// "Thêm chẩn đoán" / "Sửa chẩn đoán". diagnosis: the one being edited, or null.
// recordedTeeth: teeth with findings on the chart, offered as one-click picks. usedCodes: codes already in the list.
// onSave receives { ...diagnosis, code, teeth, note }.
const DiagnosisDialog = ({ diagnosis = null, recordedTeeth = [], usedCodes = [], onSave, onClose }) => {
    const codeId = useId();
    const codeListId = useId();
    const codeHelpId = useId();
    const toothId = useId();
    const toothErrorId = useId();
    const noteId = useId();
    const [form, setForm] = useState({ code: diagnosis?.code ?? "", teeth: diagnosis?.teeth ?? [], note: diagnosis?.note ?? "" });
    const [toothDraft, setToothDraft] = useState("");
    const [errors, setErrors] = useState({});
    const update = (changes) => setForm((current) => ({ ...current, ...changes }));

    const code = form.code.trim().toUpperCase();
    const name = icdName(code);

    const addTooth = (value) => {
        const tooth = Number(String(value).trim());
        if (!isValidToothCode(tooth)) {
            setErrors((current) => ({ ...current, tooth: "Số răng không hợp lệ (11–48 hoặc 51–85)." }));
            return;
        }
        if (!form.teeth.includes(String(tooth))) update({ teeth: [...form.teeth, String(tooth)].sort((a, b) => Number(a) - Number(b)) });
        setToothDraft("");
        setErrors((current) => ({ ...current, tooth: null }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        let codeError = null;
        if (!code) codeError = "Nhập mã ICD-10.";
        else if (!name) codeError = "Không có mã này trong danh mục ICD-10 nha khoa.";
        else if (code !== diagnosis?.code && usedCodes.includes(code)) codeError = `Chẩn đoán ${code} đã có trong danh sách.`;
        setErrors((current) => ({ ...current, code: codeError }));
        if (codeError) return;
        onSave({ ...diagnosis, code, teeth: form.teeth, note: form.note.trim() });
    };

    return (
        <Modal title={diagnosis ? "Sửa chẩn đoán" : "Thêm chẩn đoán"} onClose={onClose}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="field">
                    <label htmlFor={codeId} className="label">
                        Mã ICD-10 <span className="text-danger-solid">*</span>
                    </label>
                    <input
                        id={codeId}
                        className="input"
                        list={codeListId}
                        placeholder="Ví dụ: K02.1"
                        value={form.code}
                        aria-invalid={errors.code ? true : undefined}
                        aria-describedby={codeHelpId}
                        onChange={(event) => {
                            update({ code: event.target.value });
                            if (errors.code) setErrors((current) => ({ ...current, code: null }));
                        }}
                    />
                    <datalist id={codeListId}>
                        {ICD10_DENTAL.map((item) => (
                            <option key={item.code} value={item.code} label={item.name} />
                        ))}
                    </datalist>
                    <p id={codeHelpId} className={cx("text-caption", errors.code ? "error-text" : "text-muted")}>
                        {errors.code ?? (name ? (
                            <>
                                <b className="font-semibold text-ink">{code}</b> · {name}
                            </>
                        ) : (
                            "Nhập mã hoặc chọn từ danh sách gợi ý"
                        ))}
                    </p>
                </div>

                <div className="field">
                    <label htmlFor={toothId} className="label">
                        Răng liên quan
                    </label>
                    {form.teeth.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                            {form.teeth.map((tooth) => (
                                <li key={tooth} className="num flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pr-1 pl-2 text-caption font-semibold text-primary">
                                    {tooth}
                                    <button
                                        type="button"
                                        className="grid size-4 cursor-pointer place-items-center rounded outline-none hover:bg-primary/10 focus-visible:shadow-focus"
                                        aria-label={`Bỏ răng ${tooth}`}
                                        onClick={() => update({ teeth: form.teeth.filter((item) => item !== tooth) })}
                                    >
                                        <X className="size-3" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-2">
                        <input
                            id={toothId}
                            className="input min-w-0 flex-1"
                            inputMode="numeric"
                            placeholder="Nhập số răng rồi Enter, ví dụ: 36"
                            value={toothDraft}
                            aria-invalid={errors.tooth ? true : undefined}
                            aria-describedby={errors.tooth ? toothErrorId : undefined}
                            onChange={(event) => setToothDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                if (toothDraft.trim()) addTooth(toothDraft);
                            }}
                        />
                        <button type="button" className="btn btn-secondary shrink-0" disabled={!toothDraft.trim()} onClick={() => addTooth(toothDraft)}>
                            Thêm răng
                        </button>
                    </div>
                    {errors.tooth && (
                        <p id={toothErrorId} className="error-text">
                            {errors.tooth}
                        </p>
                    )}
                    {recordedTeeth.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
                            Răng đã ghi nhận tình trạng:
                            {recordedTeeth.map((tooth) => (
                                <button
                                    key={tooth}
                                    type="button"
                                    aria-pressed={form.teeth.includes(String(tooth))}
                                    className="num cursor-pointer rounded-full border border-primary bg-primary-soft px-2 py-0.5 font-semibold text-primary outline-none focus-visible:shadow-focus aria-pressed:opacity-50"
                                    onClick={() => addTooth(tooth)}
                                >
                                    {tooth}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="field">
                    <label htmlFor={noteId} className="label">
                        Mô tả chi tiết
                    </label>
                    <textarea
                        id={noteId}
                        className="input"
                        placeholder="Ví dụ: Sâu ngà răng 36, 37 mặt nhai, ê buốt khi uống lạnh."
                        value={form.note}
                        onChange={(event) => update({ note: event.target.value })}
                    />
                </div>

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary">
                        {diagnosis ? "Lưu thay đổi" : "Thêm chẩn đoán"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DiagnosisDialog;
