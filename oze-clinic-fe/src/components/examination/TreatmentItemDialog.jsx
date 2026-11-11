import { useId, useState } from "react";
import Modal from "@/components/ui/Modal";
import { parseMoney } from "@/utils/examination";
import { formatDateTime, formatNumber } from "@/utils/format";

const CONTENT_MAX = 500;

const FieldError = ({ id, message }) =>
    message ? (
        <p id={id} className="error-text">
            {message}
        </p>
    ) : null;

// "Thêm nội dung điều trị" / "Sửa nội dung điều trị". item: the one being edited, or null to add.
// subtitle: "Nguyễn Văn A · Lượt khám LK-1019-012" when adding (editing shows when the item was added).
// onSave receives { ...item, content, price }.
const TreatmentItemDialog = ({ item = null, patientName, subtitle, busy = false, onSave, onClose }) => {
    const ids = { content: useId(), contentError: useId(), price: useId(), priceHelp: useId() };
    const [form, setForm] = useState({ content: item?.content ?? "", price: item?.price ?? null });
    const [errors, setErrors] = useState({});
    const update = (changes, field) => {
        setForm((current) => ({ ...current, ...changes }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
    };

    const description = item ? [patientName, `thêm lúc ${formatDateTime(item.createdAt)}`].filter(Boolean).join(" · ") : subtitle;

    const handleSubmit = (event) => {
        event.preventDefault();
        const content = form.content.trim();
        const nextErrors = {
            content: !content ? "Nhập nội dung điều trị." : content.length > CONTENT_MAX ? `Tối đa ${CONTENT_MAX} ký tự.` : null,
            price: form.price == null ? "Nhập giá tiền." : null,
        };
        setErrors(nextErrors);
        if (nextErrors.content || nextErrors.price) return;
        onSave({ ...item, content, price: form.price });
    };

    return (
        <Modal title={item ? "Sửa nội dung điều trị" : "Thêm nội dung điều trị"} description={description} onClose={onClose} closeDisabled={busy}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div className="field">
                    <label htmlFor={ids.content} className="label">
                        Nội dung điều trị <span className="text-danger-solid">*</span>
                    </label>
                    <textarea
                        id={ids.content}
                        className="input min-h-24"
                        maxLength={CONTENT_MAX}
                        placeholder="Ví dụ: Trám composite răng 36 mặt nhai – xa"
                        value={form.content}
                        aria-invalid={errors.content ? true : undefined}
                        aria-describedby={errors.content ? ids.contentError : undefined}
                        onChange={(event) => update({ content: event.target.value }, "content")}
                    />
                    <FieldError id={ids.contentError} message={errors.content} />
                </div>

                <div className="field">
                    <label htmlFor={ids.price} className="label">
                        Giá tiền (₫) <span className="text-danger-solid">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id={ids.price}
                            className="input num pr-8"
                            inputMode="numeric"
                            placeholder="0"
                            value={form.price == null ? "" : formatNumber(form.price)}
                            aria-invalid={errors.price ? true : undefined}
                            aria-describedby={ids.priceHelp}
                            onChange={(event) => update({ price: parseMoney(event.target.value) }, "price")}
                        />
                        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                            ₫
                        </span>
                    </div>
                    {errors.price ? (
                        <p id={ids.priceHelp} className="error-text">
                            {errors.price}
                        </p>
                    ) : (
                        !item && (
                            <p id={ids.priceHelp} className="text-caption text-muted">
                                Giá sẽ được cộng vào hoá đơn buổi khám này
                            </p>
                        )
                    )}
                </div>

                <div className="modal-actions -mx-5 mt-2 border-t border-border px-5 pt-4 sm:-mx-6 sm:px-6">
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy && <span className="btn-spinner" aria-hidden="true" />}
                        {item ? "Lưu thay đổi" : "Thêm vào danh sách"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TreatmentItemDialog;
