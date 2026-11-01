import { useState } from "react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createService, updateService } from "@/services/serviceManagementService";
import { cx } from "@/utils/cx";
import { ROOM_TYPE_OPTIONS } from "@/utils/data/mockRooms";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

// Same limits as CreateServiceRequest in the backend; the price cap keeps typing sane (999.999.999 ₫).
const SERVICE_LIMITS = { NAME_MAX: 200, CODE_MAX: 20, DESCRIPTION_MAX: 500, PRICE_DIGITS_MAX: 9, DURATION_DIGITS_MAX: 3 };
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;
const EMPTY_SERVICE_FORM = { code: "", name: "", price: "", durationMinutes: "", roomType: "", description: "" };

const priceFormatter = new Intl.NumberFormat("vi-VN");

const validateService = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.code)) errors.code = requiredMessage("mã dịch vụ");
    else if (!CODE_PATTERN.test(form.code.trim())) errors.code = "Mã dịch vụ chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
    if (isRequiredEmpty(form.name)) errors.name = requiredMessage("tên dịch vụ");
    if (form.price === "") errors.price = requiredMessage("giá tham khảo");
    if (form.durationMinutes !== "" && Number(form.durationMinutes) === 0) errors.durationMinutes = "Thời lượng phải lớn hơn 0.";
    return errors;
};

// Keeps only digits, without leading zeros, at most maxDigits long.
const toDigits = (value, maxDigits) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits);

// Price is kept as digits ("18000000") and shown with dots ("18.000.000") while typing.
const formatPriceInput = (digits) => (digits === "" ? "" : priceFormatter.format(Number(digits)));

// Form values as they are sent and compared: trimmed, code in capitals, numbers as numbers.
const toServiceRequest = (form) => ({
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    price: Number(form.price),
    durationMinutes: form.durationMinutes === "" ? null : Number(form.durationMinutes),
    roomType: form.roomType,
    description: form.description.trim(),
});

const toServiceForm = (service) => ({
    code: service.code,
    name: service.name,
    price: String(service.price),
    durationMinutes: service.durationMinutes ? String(service.durationMinutes) : "",
    roomType: service.roomType ?? "",
    description: service.description ?? "",
});

// "Thêm dịch vụ" (service = null) or "Cập nhật dịch vụ" popup. onSaved(message) runs after a successful save.
const ServiceFormPopup = ({ service, onClose, onSaved }) => {
    const editing = Boolean(service);
    const [form, setForm] = useState(() => (editing ? toServiceForm(service) : EMPTY_SERVICE_FORM));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const setField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const fieldProps = (name) => ({
        id: `service-form-${name}`,
        name,
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `service-form-${name}-error` : undefined,
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateService(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        const request = toServiceRequest(form);
        if (editing && JSON.stringify(request) === JSON.stringify(toServiceRequest(toServiceForm(service)))) {
            toast.info("Không có thông tin nào thay đổi.");
            onClose();
            return;
        }

        setSaving(true);
        const response = editing ? await updateService(service.id, request) : await createService(request);
        setSaving(false);
        if (!response.success) {
            setErrors(response.errors ?? {});
            if (!response.errors) toast.error(response.message);
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal title={editing ? "Cập nhật dịch vụ" : "Thêm dịch vụ"} onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="service-form-code" label="Mã dịch vụ" required error={errors.code}>
                        <input
                            {...fieldProps("code")}
                            className="input uppercase"
                            placeholder="DV009"
                            maxLength={SERVICE_LIMITS.CODE_MAX}
                            value={form.code}
                            onChange={(event) => setField("code", event.target.value)}
                        />
                    </FormField>
                    <FormField id="service-form-name" label="Tên dịch vụ" required error={errors.name}>
                        <input
                            {...fieldProps("name")}
                            className="input"
                            placeholder="Ví dụ: Tẩy trắng răng"
                            maxLength={SERVICE_LIMITS.NAME_MAX}
                            value={form.name}
                            onChange={(event) => setField("name", event.target.value)}
                        />
                    </FormField>
                    <FormField id="service-form-price" label="Giá tham khảo (₫)" required error={errors.price}>
                        <input
                            {...fieldProps("price")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="0"
                            value={formatPriceInput(form.price)}
                            onChange={(event) => setField("price", toDigits(event.target.value, SERVICE_LIMITS.PRICE_DIGITS_MAX))}
                        />
                    </FormField>
                    <FormField id="service-form-durationMinutes" label="Thời lượng dự kiến (phút)" error={errors.durationMinutes}>
                        <input
                            {...fieldProps("durationMinutes")}
                            className="input num"
                            inputMode="numeric"
                            placeholder="30"
                            value={form.durationMinutes}
                            onChange={(event) => setField("durationMinutes", toDigits(event.target.value, SERVICE_LIMITS.DURATION_DIGITS_MAX))}
                        />
                    </FormField>
                </div>
                <FormField id="service-form-roomType" label="Loại phòng yêu cầu">
                    <select
                        {...fieldProps("roomType")}
                        className={cx("input", !form.roomType && "text-placeholder")}
                        value={form.roomType}
                        onChange={(event) => setField("roomType", event.target.value)}
                    >
                        <option value="">Chọn loại phòng</option>
                        {ROOM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="text-ink">
                                {option.label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField id="service-form-description" label="Mô tả">
                    <textarea
                        {...fieldProps("description")}
                        className="input"
                        rows={3}
                        maxLength={SERVICE_LIMITS.DESCRIPTION_MAX}
                        value={form.description}
                        onChange={(event) => setField("description", event.target.value)}
                    />
                </FormField>
                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Lưu dịch vụ
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default ServiceFormPopup;
