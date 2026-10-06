import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/Alert";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
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

                    <Input
                        ref={phoneRef}
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        label="Số điện thoại"
                        placeholder="0123456789"
                        required
                        value={values.phone}
                        onChange={handleChange}
                        error={fieldErrors.phone}
                    />
                    <Input
                        ref={passwordRef}
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        label="Mật khẩu"
                        placeholder="Ít nhất 8 ký tự"
                        required
                        value={values.password}
                        onChange={handleChange}
                        error={fieldErrors.password}
                        className="mt-4"
                    />

                    <div className="mt-2 flex justify-end">
                        <Link to={ROUTES.FORGOT_PASSWORD} className="btn btn-link">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <Button type="submit" size="lg" fullWidth loading={loading} className="mt-6">
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>
                </form>

                <p className="my-4 text-center text-body-sm text-muted">hoặc</p>

                <Button variant="secondary" size="lg" fullWidth onClick={handleGoogleSignIn}>
                    Đăng nhập bằng Google
                </Button>

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
