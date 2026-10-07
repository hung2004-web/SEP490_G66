import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/Alert";
import Card from "../../components/Card";
import { signIn } from "../../services/authService";
import { MESSAGES, ROUTES, getPostLoginRoute } from "../../utils/constant";

const requiredMessage = (fieldName) => MESSAGES.MSG07.replace("[tên trường]", fieldName);

const validate = ({ phone, password }) => {
    const errors = {};
    // TODO(spec): BR-002 requires a phone number format check, but the SRS does not define the rule.
    if (!phone.trim()) errors.phone = requiredMessage("số điện thoại");
    // Password length is not enforced until the team confirms the "At least 8 characters" rule.
    if (!password) errors.password = requiredMessage("mật khẩu");
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
            const result = await signIn({ phone: values.phone.trim(), password: values.password });
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
        <section className="flex justify-center py-12 md:py-16">
            <Card variant="public" className="w-full max-w-md">
                <h1 className="text-center text-heading-1">Đăng nhập</h1>
                <p className="mt-2 text-center text-body-md text-muted">
                    Truy cập hồ sơ bệnh án, lịch hẹn và kết quả xét nghiệm trực tuyến, mọi lúc, mọi nơi.
                </p>

                <form noValidate onSubmit={handleSubmit} className="mt-6">
                    {formError && (
                        <Alert tone="danger" className="mb-4">
                            {formError}
                        </Alert>
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
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="0123456789"
                            className="input"
                            aria-required="true"
                            aria-invalid={fieldErrors.phone ? true : undefined}
                            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                            value={values.phone}
                            onChange={handleChange}
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
                    <Link to={ROUTES.SIGN_UP} className="btn btn-link font-semibold">
                        Đăng ký
                    </Link>
                </p>
            </Card>
        </section>
    );
};

export default SignInPage;
