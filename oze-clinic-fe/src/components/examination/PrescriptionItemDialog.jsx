import { useId, useState } from "react";
import Modal from "@/components/ui/Modal";
import { PRESCRIPTION_LIMITS, validatePrescriptionItem } from "@/utils/examination";

const FieldError = ({ id, message }) =>
    message ? (
        <p id={id} className="error-text">
            {message}
        </p>
    ) : null;

const TEXT_FIELDS = ["medicationName", "dosage", "frequency", "duration", "instructions"];

// "Thêm thuốc" / "Sửa thuốc", one field per PrescriptionItems column. item: the medicine being edited, or null to add.
// onSave receives { ...item, medicationName, dosage, frequency, duration, quantity, instructions } (texts trimmed).
const PrescriptionItemDialog = ({ item = null, busy = false, onSave, onClose }) => {
    const baseId = useId();
    const [form, setForm] = useState({
        medicationName: item?.medicationName ?? "",
        dosage: item?.dosage ?? "",
        quantity: item?.quantity ?? null,
        frequency: item?.frequency ?? "",
        duration: item?.duration ?? "",
        instructions: item?.instructions ?? "",
    });
    const [errors, setErrors] = useState({});

    const update = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
    };

    // Props shared by every field: id, label link, error state.
    const fieldProps = (field) => ({
        id: `${baseId}-${field}`,
        "aria-invalid": errors[field] ? true : undefined,
        "aria-describedby": errors[field] ? `${baseId}-${field}-error` : undefined,
    });

    const textField = (field, label, placeholder, { required = false, multiline = false } = {}) => {
        const Input = multiline ? "textarea" : "input";
        return (
            <div className="field">
                <label htmlFor={`${baseId}-${field}`} className="label">
                    {label} {required && <span className="text-danger-solid">*</span>}
                </label>
                <Input
                    {...fieldProps(field)}
                    className={multiline ? "input min-h-20" : "input"}
                    maxLength={PRESCRIPTION_LIMITS[field]}
                    placeholder={placeholder}
                    value={form[field]}
                    onChange={(event) => update(field, event.target.value)}
                />
                <FieldError id={`${baseId}-${field}-error`} message={errors[field]} />
            </div>
        );
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const nextErrors = validatePrescriptionItem(form);
        setErrors(nextErrors);
        if (nextErrors.count) return;
        const trimmed = Object.fromEntries(TEXT_FIELDS.map((field) => [field, form[field].trim()]));
        onSave({ ...item, ...form, ...trimmed });
    };

    return (
        <Modal title={item ? "Sửa thuốc" : "Thêm thuốc"} onClose={onClose} closeDisabled={busy}>
            <form noValidate onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                {textField("medicationName", "Tên thuốc", "Ví dụ: Augmentin", { required: true })}

                <div className="grid gap-4 sm:grid-cols-2">
                    {textField("dosage", "Hàm lượng", "Ví dụ: 625mg")}
                    <div className="field">
                        <label htmlFor={`${baseId}-quantity`} className="label">
                            Số lượng
                        </label>
                        <input
                            {...fieldProps("quantity")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="Ví dụ: 10"
                            value={form.quantity ?? ""}
                            onChange={(event) => {
                                const digits = event.target.value.replace(/\D/g, "");
                                update("quantity", digits ? Number(digits) : null);
                            }}
                        />
                        <FieldError id={`${baseId}-quantity-error`} message={errors.quantity} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {textField("frequency", "Số lần dùng", "Ví dụ: Ngày 2 lần")}
                    {textField("duration", "Thời gian dùng", "Ví dụ: 5 ngày")}
                </div>

                {textField("instructions", "Hướng dẫn", "Ví dụ: Uống sau ăn, mỗi lần 1 viên", { multiline: true })}

                <div className="modal-actions -mx-5 mt-2 border-t border-border px-5 pt-4 sm:-mx-6 sm:px-6">
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy && <span className="btn-spinner" aria-hidden="true" />}
                        {item ? "Lưu thay đổi" : "Thêm thuốc"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PrescriptionItemDialog;
