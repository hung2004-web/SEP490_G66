import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import { requestPasswordReset } from "../../services/authService";
import { ROUTES, VERIFICATION_METHOD, VERIFICATION_METHOD_OPTIONS } from "../../utils/constant";
import { isPhoneEmpty, normalizePhone, validatePhone } from "../../utils/validation";

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const phoneRef = useRef(null);
    const [phone, setPhone] = useState("");
    const [method, setMethod] = useState(VERIFICATION_METHOD.SMS);
    const [phoneError, setPhoneError] = useState();
    const [loading, setLoading] = useState(false);

    const handlePhoneChange = (event) => {
        setPhone(event.target.value);
        setPhoneError(undefined);
    };

    const handlePhoneBlur = (event) => {
        const { value } = event.target;
        if (isPhoneEmpty(value)) return;
        const error = validatePhone(value);
        if (error) setPhoneError(error);
    };

    const handleMethodChange = (event) => {
        setMethod(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        const error = validatePhone(phone);
        setPhoneError(error);
        if (error) {
            phoneRef.current?.focus();
            return;
        }

        const normalizedPhone = normalizePhone(phone);
        setLoading(true);
        try {
            const result = await requestPasswordReset({ phone: normalizedPhone, method });
            if (result.success) {
                navigate(ROUTES.VERIFY_OTP, { state: { phone: normalizedPhone, method } });
                return;
            }
            setPhoneError(result.message);
            phoneRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="flex justify-center py-12 md:py-16">
            <Card variant="public" className="w-full max-w-md">
                <h1 className="text-center text-heading-1">Khôi phục tài khoản</h1>
                <p className="mt-2 text-center text-body-md text-muted">
                    Vui lòng cung cấp thông tin để xác minh tài khoản.
                </p>

                <form noValidate onSubmit={handleSubmit} className="mt-6">
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
                            aria-invalid={phoneError ? true : undefined}
                            aria-describedby={phoneError ? "phone-error" : undefined}
                            value={phone}
                            onChange={handlePhoneChange}
                            onBlur={handlePhoneBlur}
                        />
                        {phoneError && (
                            <p id="phone-error" className="error-text">
                                {phoneError}
                            </p>
                        )}
                    </div>

                    <fieldset className="mt-4">
                        <legend className="sr-only">Phương thức nhận mã</legend>
                        <div className="flex flex-wrap gap-x-6">
                            {VERIFICATION_METHOD_OPTIONS.map((option) => (
                                <div key={option.value} className="flex h-control items-center gap-2">
                                    <input
                                        id={`method-${option.value}`}
                                        name="method"
                                        type="radio"
                                        value={option.value}
                                        checked={method === option.value}
                                        onChange={handleMethodChange}
                                    />
                                    <label htmlFor={`method-${option.value}`} className="label cursor-pointer">
                                        {option.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <button
                        type="submit"
                        disabled={loading}
                        aria-busy={loading || undefined}
                        className="btn btn-primary btn-lg mt-6 w-full"
                    >
                        {loading && <span className="btn-spinner" aria-hidden="true" />}
                        {loading ? "Đang gửi mã..." : "Gửi mã OTP"}
                    </button>
                </form>
            </Card>
        </section>
    );
};

export default ForgotPasswordPage;
