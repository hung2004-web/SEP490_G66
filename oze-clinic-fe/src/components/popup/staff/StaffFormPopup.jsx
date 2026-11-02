import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createStaffAccount, updateStaffAccount } from "@/services/staffService";
import { STAFF_ROLE_OPTIONS } from "@/utils/data/mockStaff";
import { GENDER_LABELS, PROFILE_LIMITS, USER_ROLES, VALIDATION_MESSAGES } from "@/utils/messages";
import { isRequiredEmpty, requiredMessage, validateEmail, validatePhone } from "@/utils/validation";

const LICENSE_MAX = 50;

const EMPTY_FORM = { fullName: "", role: "", gender: "", email: "", phone: "", birthDate: "", licenseNumber: "" };

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

const roleLabel = (role) => STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "";

const validateStaff = (form) => {
    const errors = {};
    if (isRequiredEmpty(form.fullName)) errors.fullName = requiredMessage("họ và tên");
    else if (form.fullName.trim().length > PROFILE_LIMITS.FULL_NAME_MAX) errors.fullName = VALIDATION_MESSAGES.FULL_NAME_TOO_LONG;
    if (!form.role) errors.role = "Vui lòng chọn vai trò.";
    if (!form.gender) errors.gender = "Vui lòng chọn giới tính.";
    if (isRequiredEmpty(form.email)) errors.email = requiredMessage("email");
    else errors.email = validateEmail(form.email.trim());
    errors.phone = validatePhone(form.phone);
    if (form.birthDate && form.birthDate > today()) errors.birthDate = VALIDATION_MESSAGES.BIRTHDATE_IN_FUTURE;
    if (form.role === USER_ROLES.DOCTOR && isRequiredEmpty(form.licenseNumber))
        errors.licenseNumber = requiredMessage("số chứng chỉ hành nghề");
    return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
};

// "Tạo tài khoản nhân viên" (member = null) or "Cập nhật tài khoản". onSaved(message) runs after a successful save.
const StaffFormPopup = ({ member, onClose, onSaved }) => {
    const editing = Boolean(member);
    const [form, setForm] = useState(() =>
        editing
            ? {
                  fullName: member.fullName,
                  role: member.role,
                  gender: member.gender ?? "",
                  email: member.email,
                  phone: member.phone,
                  birthDate: member.birthDate ?? "",
                  licenseNumber: member.licenseNumber ?? "",
              }
            : EMPTY_FORM,
    );
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fieldProps = (name) => ({
        id: `staff-${name}`,
        name,
        value: form[name],
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `staff-${name}-error` : undefined,
        onChange: (event) => {
            setForm((current) => ({ ...current, [name]: event.target.value }));
            setErrors((current) => ({ ...current, [name]: undefined }));
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextErrors = validateStaff(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const response = editing ? await updateStaffAccount(member.id, form) : await createStaffAccount(form);
        setSaving(false);
        if (!response.success) {
            setErrors(response.errors ?? { form: response.message });
            return;
        }
        onSaved(response.message);
    };

    return (
        <Modal
            title={editing ? "Cập nhật tài khoản nhân viên" : "Tạo tài khoản nhân viên"}
            description={
                editing ? `${member.fullName} · ${member.code}` : "Mật khẩu tạm sẽ được gửi qua SMS đến số điện thoại của nhân viên."
            }
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {errors.form && (
                    <p role="alert" className="alert alert-danger">
                        {errors.form}
                    </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="staff-fullName" label="Họ và tên" required error={errors.fullName}>
                        <input
                            {...fieldProps("fullName")}
                            className="input"
                            placeholder="Nhập họ và tên"
                            maxLength={PROFILE_LIMITS.FULL_NAME_MAX}
                        />
                    </FormField>
                    <FormField id="staff-role" label="Vai trò" required error={errors.role}>
                        <select {...fieldProps("role")} className="input">
                            <option value="">Chọn vai trò</option>
                            {STAFF_ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField id="staff-email" label="Email" required error={errors.email}>
                        <input {...fieldProps("email")} type="email" className="input" placeholder="VD: ha.lt@oze.vn" />
                    </FormField>
                    <FormField id="staff-phone" label="Số điện thoại" required error={errors.phone}>
                        <input {...fieldProps("phone")} type="tel" inputMode="numeric" className="input" placeholder="VD: 0922 333 555" />
                    </FormField>
                    <FormField id="staff-birthDate" label="Ngày sinh" error={errors.birthDate}>
                        <input {...fieldProps("birthDate")} type="date" className="input" max={today()} />
                    </FormField>
                    <fieldset className="field" aria-describedby={errors.gender ? "staff-gender-error" : undefined}>
                        <legend className="label label-required">Giới tính</legend>
                        <div className="flex h-control items-center gap-6">
                            {Object.entries(GENDER_LABELS).map(([value, label]) => (
                                <label key={value} className="flex cursor-pointer items-center gap-2 text-body-sm text-ink">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value={value}
                                        className="size-4"
                                        checked={form.gender === value}
                                        aria-invalid={Boolean(errors.gender)}
                                        onChange={(event) => {
                                            setForm((current) => ({ ...current, gender: event.target.value }));
                                            setErrors((current) => ({ ...current, gender: undefined }));
                                        }}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        {errors.gender && (
                            <p id="staff-gender-error" className="error-text">
                                {errors.gender}
                            </p>
                        )}
                    </fieldset>
                </div>

                {form.role === USER_ROLES.DOCTOR && (
                    <div className="flex flex-col gap-3 rounded-lg bg-surface-muted p-4">
                        <p className="text-label font-semibold text-ink">Thông tin chuyên môn ({roleLabel(form.role)})</p>
                        <FormField id="staff-licenseNumber" label="Số chứng chỉ hành nghề" required error={errors.licenseNumber}>
                            <input
                                {...fieldProps("licenseNumber")}
                                className="input"
                                placeholder="Nhập số CCHN"
                                maxLength={LICENSE_MAX}
                            />
                        </FormField>
                    </div>
                )}

                <div className="modal-actions -mx-6 mt-2 border-t border-border px-6 pt-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Huỷ
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Tạo tài khoản"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default StaffFormPopup;
