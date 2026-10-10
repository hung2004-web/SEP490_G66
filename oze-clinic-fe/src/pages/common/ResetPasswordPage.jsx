import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import { resetPassword } from "../../services/authService";
import { MESSAGES, PASSWORD_LENGTH, RESET_PASSWORD_REDIRECT_MS, ROUTES } from "../../utils/constant";
import { invalidMessage, isPasswordEmpty, requiredMessage, validatePassword } from "../../utils/validation";

const validateNewPassword = (password) =>
    isPasswordEmpty(password) ? requiredMessage("mật khẩu mới") : validatePassword(password);

const validateConfirmPassword = (confirmPassword, password) => {
    if (isPasswordEmpty(confirmPassword)) return requiredMessage("xác nhận mật khẩu");
    if (!isPasswordEmpty(password) && confirmPassword !== password) return invalidMessage("Mật khẩu xác nhận");
    return undefined;
};

const FIELDS = {
    password: (values) => validateNewPassword(values.password),
    confirmPassword: (values) => validateConfirmPassword(values.confirmPassword, values.password),
};

const validate = (values) => {
    const errors = {};
    for (const [name, validateField] of Object.entries(FIELDS)) {
        const error = validateField(values);
        if (error) errors[name] = error;
    }
    return errors;
};

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);
    const [values, setValues] = useState({ password: "", confirmPassword: "" });
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    useEffect(() => {
        if (!succeeded) return undefined;
        const timeoutId = setTimeout(() => navigate(ROUTES.SIGN_IN, { replace: true }), RESET_PASSWORD_REDIRECT_MS);
        return () => clearTimeout(timeoutId);
    }, [succeeded, navigate]);

    if (!state?.resetToken) {
        return <Navigate to={ROUTES.FORGOT_PASSWORD} replace />;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
    };

    const handleBlur = (event) => {
        const { name, value } = event.target;
        if (isPasswordEmpty(value)) return;
        const error = FIELDS[name](values);
        if (error) setFieldErrors((current) => ({ ...current, [name]: error }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading || succeeded) return;

        const errors = validate(values);
        setFieldErrors(errors);
        if (errors.password) {
            passwordRef.current?.focus();
            return;
        }
        if (errors.confirmPassword) {
            confirmPasswordRef.current?.focus();
            return;
        }

        setLoading(true);
        try {
            const result = await resetPassword({ token: state.resetToken, password: values.password });
            if (result.success) {
                setSucceeded(true);
                return;
            }
            setFieldErrors({ password: result.message });
            passwordRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page">
            <Card variant="auth" className="w-full max-w-md">
                <h1 className="auth-title">Đặt lại mật khẩu</h1>
                <p className="auth-subtitle">Vui lòng nhập mật khẩu mới.</p>

                <form noValidate onSubmit={handleSubmit}>
                    <div role="status">
                        {succeeded && <div className="alert alert-success mb-4">{MESSAGES.MSG64}</div>}
                    </div>

                    <div className="field">
                        <label htmlFor="password" className="label label-required">
                            Mật khẩu mới
                        </label>
                        <input
                            ref={passwordRef}
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder={`Từ ${PASSWORD_LENGTH.MIN} đến ${PASSWORD_LENGTH.MAX} ký tự`}
                            className="input"
                            aria-required="true"
                            aria-invalid={fieldErrors.password ? true : undefined}
                            aria-describedby={fieldErrors.password ? "password-error" : undefined}
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {fieldErrors.password && (
                            <p id="password-error" className="error-text">
                                {fieldErrors.password}
                            </p>
                        )}
                    </div>
                    <div className="field mt-4">
                        <label htmlFor="confirmPassword" className="label label-required">
                            Xác nhận mật khẩu
                        </label>
                        <input
                            ref={confirmPasswordRef}
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Nhập lại mật khẩu mới"
                            className="input"
                            aria-required="true"
                            aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                            value={values.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {fieldErrors.confirmPassword && (
                            <p id="confirmPassword-error" className="error-text">
                                {fieldErrors.confirmPassword}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || succeeded}
                        aria-busy={loading || undefined}
                        className="btn btn-primary btn-lg mt-6 w-full"
                    >
                        {loading && <span className="btn-spinner" aria-hidden="true" />}
                        {loading ? "Đang lưu..." : "Đặt lại mật khẩu"}
                    </button>
                </form>
            </Card>
        </section>
    );
};

export default ResetPasswordPage;
