import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import { signIn } from "../../services/authService";
import { ROUTES, getPostLoginRoute } from "../../utils/constant";
import { isPasswordEmpty, isPhoneEmpty, normalizePhone, requiredMessage, validatePhone } from "../../utils/validation";

// Sign In only checks that the password is filled; the length rule (validatePassword) belongs to
// Register / Reset / Change Password.
const validateSignInPassword = (value) => (isPasswordEmpty(value) ? requiredMessage("mật khẩu") : undefined);

// Per field: the "empty" rule (the same on blur and on submit) and the validator.
const FIELDS = {
    phone: { isEmpty: isPhoneEmpty, validate: validatePhone },
    password: { isEmpty: isPasswordEmpty, validate: validateSignInPassword },
};

const validate = (values) => {
    const errors = {};
    for (const [name, field] of Object.entries(FIELDS)) {
        const error = field.validate(values[name]);
        if (error) errors[name] = error;
    }
    return errors;
};

// TODO(spec): Sign in via Google is in FR 2.1 and the mockup but not in the UC-04 flow.
const handleGoogleSignIn = () => {};

const SignInPage = () => {
    const navigate = useNavigate();
    const phoneRef = useRef(null);
    const passwordRef = useRef(null);
    const [values, setValues] = useState({ phone: "", password: "" });
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
    };

    // Leaving a filled field validates it; an empty field is only reported on submit (MSG07).
    const handleBlur = (event) => {
        const { name, value } = event.target;
        const field = FIELDS[name];
        if (field.isEmpty(value)) return;
        setFieldErrors((current) => ({ ...current, [name]: field.validate(value) }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        const errors = validate(values);
        setFieldErrors(errors);
        setFormError("");
        if (errors.phone) {
            phoneRef.current?.focus();
            return;
        }
        if (errors.password) {
            passwordRef.current?.focus();
            return;
        }

        setLoading(true);
        try {
            const result = await signIn({ phone: normalizePhone(values.phone), password: values.password });
            if (result.success) {
                // TODO(spec): pass the user's role once the login response defines it.
                navigate(getPostLoginRoute(), { replace: true });
                return;
            }
            // TODO(spec): no system message is defined for a failure the API returns without a message.
            setFormError(result.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page">
            <Card variant="auth" className="w-full max-w-md">
                <h1 className="auth-title">Đăng nhập</h1>
                <p className="auth-subtitle">
                    Truy cập hồ sơ bệnh án, lịch hẹn và kết quả xét nghiệm trực tuyến, mọi lúc, mọi nơi.
                </p>

                <form noValidate onSubmit={handleSubmit}>
                    {/* TODO: add the semantic icon once lucide-react is approved (DESIGN.md section 7). */}
                    {formError && (
                        <div role="alert" className="alert alert-danger mb-4">
                            {formError}
                        </div>
                    )}

                    {/* aria-required only, not the native required attribute, so the browser never shows its own popup. */}
                    <div className="field">
                        <label htmlFor="phone" className="label label-required">
                            Số điện thoại
                        </label>
                        <input
                            ref={phoneRef}
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="0912 345 678"
                            className="input"
                            aria-required="true"
                            aria-invalid={fieldErrors.phone ? true : undefined}
                            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                            value={values.phone}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                        {/* TODO: add the CircleAlert icon before the error once lucide-react is approved (DESIGN.md section 7). */}
                        {fieldErrors.phone && (
                            <p id="phone-error" className="error-text">
                                {fieldErrors.phone}
                            </p>
                        )}
                    </div>
                    <div className="field mt-4">
                        <label htmlFor="password" className="label label-required">
                            Mật khẩu
                        </label>
                        <input
                            ref={passwordRef}
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Ít nhất 8 ký tự"
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

                    <div className="mt-2 flex justify-end">
                        <Link to={ROUTES.FORGOT_PASSWORD} className="btn btn-link">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        aria-busy={loading || undefined}
                        className="btn btn-primary btn-lg mt-6 w-full"
                    >
                        {loading && <span className="btn-spinner" aria-hidden="true" />}
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

                <p className="my-4 text-center text-body-sm text-muted">hoặc</p>

                <button type="button" className="btn btn-secondary btn-lg w-full" onClick={handleGoogleSignIn}>
                    Đăng nhập bằng Google
                </button>

                <p className="mt-6 text-center text-body-sm text-body">
                    Chưa có tài khoản?{" "}
                    <Link to={ROUTES.REGISTER} className="btn btn-link font-semibold">
                        Đăng ký
                    </Link>
                </p>
            </Card>
        </section>
    );
};

export default SignInPage;
