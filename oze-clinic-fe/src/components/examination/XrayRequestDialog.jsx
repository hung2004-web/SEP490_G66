import { useId, useState } from "react";
import Modal from "@/components/ui/Modal";
import { cx } from "@/utils/cx";
import { XRAY_TYPES } from "@/utils/messages";

// "Phiếu chỉ định chụp X-quang". subtitle: "Nguyễn Văn A · sinh 1998 · BS. Trần Minh Khoa".
// defaultArea: prefilled from the selected tooth ("Răng 36"). onSubmit receives { types, area, purpose, needPrint }.
const XrayRequestDialog = ({ subtitle, defaultArea = "", busy = false, onSubmit, onClose }) => {
    const areaId = useId();
    const purposeId = useId();
    const typesErrorId = useId();
    const areaErrorId = useId();
    const [form, setForm] = useState({ types: [], area: defaultArea, purpose: "", needPrint: false });
    const [errors, setErrors] = useState({});
    const update = (changes) => setForm((current) => ({ ...current, ...changes }));

    const toggleType = (type) => {
        update({ types: form.types.includes(type) ? form.types.filter((item) => item !== type) : [...form.types, type] });
        if (errors.types) setErrors((current) => ({ ...current, types: null }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const nextErrors = {
            types: form.types.length ? null : "Chọn ít nhất một loại chụp.",
            area: form.area.trim() ? null : "Nhập vùng hoặc răng cần chụp.",
        };
        setErrors(nextErrors);
        if (nextErrors.types || nextErrors.area) return;
        onSubmit({ ...form, types: XRAY_TYPES.filter((type) => form.types.includes(type)) });
    };

    return (
        <Modal title="Phiếu chỉ định chụp X-quang" description={subtitle} size="lg" onClose={onClose} closeDisabled={busy}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <fieldset aria-describedby={errors.types ? typesErrorId : undefined}>
                    <legend className="label mb-2">
                        Loại chụp <span className="text-danger-solid">*</span>
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {XRAY_TYPES.map((type) => {
                            const checked = form.types.includes(type);
                            return (
                                <label
                                    key={type}
                                    className={cx(
                                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-body-sm transition-colors",
                                        checked ? "bg-primary-soft font-medium text-ink" : "bg-surface-tint text-ink hover:bg-surface-muted",
                                    )}
                                >
                                    <input type="checkbox" className="size-4 shrink-0" checked={checked} onChange={() => toggleType(type)} />
                                    {type}
                                </label>
                            );
                        })}
                    </div>
                    {errors.types && (
                        <p id={typesErrorId} className="error-text mt-1.5">
                            {errors.types}
                        </p>
                    )}
                </fieldset>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="field">
                        <label htmlFor={areaId} className="label">
                            Vùng / răng <span className="text-danger-solid">*</span>
                        </label>
                        <input
                            id={areaId}
                            className="input"
                            placeholder="Ví dụ: Răng 36, toàn hàm"
                            value={form.area}
                            aria-invalid={errors.area ? true : undefined}
                            aria-describedby={errors.area ? areaErrorId : undefined}
                            onChange={(event) => {
                                update({ area: event.target.value });
                                if (errors.area) setErrors((current) => ({ ...current, area: null }));
                            }}
                        />
                        {errors.area && (
                            <p id={areaErrorId} className="error-text">
                                {errors.area}
                            </p>
                        )}
                    </div>
                    <div className="field">
                        <label htmlFor={purposeId} className="label">
                            Chụp yêu cầu
                        </label>
                        <input
                            id={purposeId}
                            className="input"
                            placeholder="Ví dụ: Đánh giá độ sâu lỗ sâu răng 36"
                            value={form.purpose}
                            onChange={(event) => update({ purpose: event.target.value })}
                        />
                    </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-surface-tint px-3 py-2.5 text-body-sm text-ink">
                    <input type="checkbox" className="size-4" checked={form.needPrint} onChange={(event) => update({ needPrint: event.target.checked })} />
                    Bệnh nhân cần in ảnh
                </label>
                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy && <span className="btn-spinner" aria-hidden="true" />}
                        Gửi chỉ định
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default XrayRequestDialog;
