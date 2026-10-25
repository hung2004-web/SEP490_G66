import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import PasswordInput from "@/components/ui/PasswordInput";
import { changePassword, signOut } from "@/services/authService";
import { cx } from "@/utils/cx";
import { MESSAGES, PASSWORD_LENGTH, VALIDATION_MESSAGES } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";
import { isPasswordEmpty, requiredMessage } from "@/utils/validation";

const EMPTY_VALUES = { currentPassword: "", newPassword: "", confirmPassword: "" };
const FIELD_ORDER = ["currentPassword", "newPassword", "confirmPassword"];

const hasValidLength = (password) => password.length >= PASSWORD_LENGTH.MIN && password.length <= PASSWORD_LENGTH.MAX;

// The rules shown under "Mật khẩu mới"; they turn green as soon as they are met.
const getRules = (values) => [
    { key: "length", label: `Từ ${PASSWORD_LENGTH.MIN} đến ${PASSWORD_LENGTH.MAX} ký tự`, met: hasValidLength(values.newPassword) },
    {
        key: "different",
        label: "Khác mật khẩu hiện tại",
        met: !isPasswordEmpty(values.currentPassword) && values.newPassword !== values.currentPassword,
    },
];

const validateField = (name, values) => {
    const value = values[name];
    if (name === "currentPassword") return isPasswordEmpty(value) ? requiredMessage("mật khẩu hiện tại") : undefined;
    if (name === "newPassword") {
        if (isPasswordEmpty(value)) return requiredMessage("mật khẩu mới");
        if (!hasValidLength(value)) return VALIDATION_MESSAGES.PASSWORD_LENGTH;
        if (value === values.currentPassword) return MESSAGES.MSG25;
        return undefined;
    }
    if (isPasswordEmpty(value)) return requiredMessage("xác nhận mật khẩu mới");
    if (value !== values.newPassword) return "Mật khẩu xác nhận không khớp với mật khẩu mới.";
    return undefined;
};

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const [values, setValues] = useState(EMPTY_VALUES);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const rules = getRules(values);

    const focusField = (name) => formRef.current?.querySelector(`#${name}`)?.focus();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    // Checks a field once the user leaves it, but never complains about a field that is still empty.
    const handleBlur = (event) => {
        const { name, value } = event.target;
        if (isPasswordEmpty(value)) return;
        const error = validateField(name, values);
        if (error) setErrors((current) => ({ ...current, [name]: error }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving) return;

        const nextErrors = Object.fromEntries(
            FIELD_ORDER.map((name) => [name, validateField(name, values)]).filter(([, error]) => error),
        );
        setErrors(nextErrors);
        const firstInvalid = FIELD_ORDER.find((name) => nextErrors[name]);
        if (firstInvalid) {
            focusField(firstInvalid);
            return;
        }

        setSaving(true);
        const result = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        setSaving(false);

        if (result.success) {
            toast.success(MESSAGES.MSG64);
            setValues(EMPTY_VALUES);
            return;
        }
        if (result.data?.locked) {
            signOut();
            toast.error(result.message);
            navigate(ROUTES.SIGN_IN, { replace: true });
            return;
        }
        const field = result.data?.attemptsLeft !== undefined ? "currentPassword" : "newPassword";
        setErrors({ [field]: result.message });
        focusField(field);
    };

    const fieldProps = (name, autoComplete) => ({
        id: name,
        name,
        autoComplete,
        "aria-required": true,
        "aria-invalid": errors[name] ? true : undefined,
        "aria-describedby": cx(errors[name] && `${name}-error`, name === "newPassword" && "newPassword-rules") || undefined,
        value: values[name],
        onChange: handleChange,
        onBlur: handleBlur,
    });

    return (
        <>
            <h1 className="page-title mb-6">Đổi mật khẩu</h1>
            <form ref={formRef} noValidate onSubmit={handleSubmit} className="card-app max-w-xl p-0">
                <div className="flex flex-col gap-5 p-6">
                    <FormField id="currentPassword" label="Mật khẩu hiện tại" required error={errors.currentPassword}>
                        <PasswordInput {...fieldProps("currentPassword", "current-password")} />
                    </FormField>

                    <FormField id="newPassword" label="Mật khẩu mới" required error={errors.newPassword}>
                        <PasswordInput {...fieldProps("newPassword", "new-password")} />
                        <ul id="newPassword-rules" className="flex flex-col gap-1 text-caption">
                            {rules.map((rule) => {
                                const Icon = rule.met ? CheckCircle2 : Circle;
                                return (
                                    <li key={rule.key} className={cx("flex items-center gap-1.5", rule.met ? "text-success" : "text-muted")}>
                                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                                        {rule.label}
                                        <span className="sr-only">{rule.met ? "(đã đạt)" : "(chưa đạt)"}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </FormField>

                    <FormField id="confirmPassword" label="Xác nhận mật khẩu mới" required error={errors.confirmPassword}>
                        <PasswordInput {...fieldProps("confirmPassword", "new-password")} />
                    </FormField>
                </div>

                <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => navigate(-1)}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving || undefined}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Lưu mật khẩu
                    </button>
                </div>
            </form>
        </>
    );
};

export default ChangePasswordPage;
