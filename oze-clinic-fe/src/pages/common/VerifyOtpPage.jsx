import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import { requestPasswordReset, verifyOtp } from "../../services/authService";
import { OTP_LENGTH, OTP_RESEND_SECONDS } from "../../utils/messages";
import { ROUTES } from "../../utils/routes";
import { invalidMessage, requiredMessage } from "../../utils/validation";

const EMPTY_CODE = Array(OTP_LENGTH).fill("");

const onlyDigits = (value) => value.replace(/\D/g, "");

const replaceAt = (list, index, item) => list.map((current, position) => (position === index ? item : current));

const formatCountdown = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const rest = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
};

const VerifyOtpPage = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const inputRefs = useRef([]);
    const [digits, setDigits] = useState(EMPTY_CODE);
    const [codeError, setCodeError] = useState();
    const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (secondsLeft === 0) return undefined;
        const timeoutId = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
        return () => clearTimeout(timeoutId);
    }, [secondsLeft]);

    if (!state?.phone || !state?.method) {
        return <Navigate to={ROUTES.FORGOT_PASSWORD} replace />;
    }

    const { phone, method } = state;
    const busy = loading || resending;

    const focusBox = (index) => inputRefs.current[index]?.focus();

    const updateDigits = (next) => {
        setDigits(next);
        setCodeError(undefined);
    };

    const fillFrom = (start, text) => {
        const pasted = text.slice(0, OTP_LENGTH - start).split("");
        const next = [...digits];
        pasted.forEach((digit, offset) => {
            next[start + offset] = digit;
        });
        updateDigits(next);
        focusBox(Math.min(start + pasted.length, OTP_LENGTH - 1));
    };

    const handleDigitChange = (index, event) => {
        const { value, selectionStart } = event.target;
        const typed = onlyDigits(value);
        if (typed.length >= OTP_LENGTH) {
            fillFrom(0, typed);
            return;
        }
        if (value === "") {
            updateDigits(replaceAt(digits, index, ""));
            return;
        }
        const digit = onlyDigits(value.charAt(selectionStart - 1));
        if (digit === "") return;
        updateDigits(replaceAt(digits, index, digit));
        if (index < OTP_LENGTH - 1) focusBox(index + 1);
    };

    const handleKeyDown = (index, event) => {
        if (event.key !== "Backspace" || digits[index] !== "" || index === 0) return;
        event.preventDefault();
        updateDigits(replaceAt(digits, index - 1, ""));
        focusBox(index - 1);
    };

    const handlePaste = (index, event) => {
        event.preventDefault();
        const pasted = onlyDigits(event.clipboardData.getData("text"));
        if (pasted === "") return;
        fillFrom(pasted.length >= OTP_LENGTH ? 0 : index, pasted);
    };

    const handleResend = async () => {
        if (busy || secondsLeft > 0) return;

        setResending(true);
        try {
            const result = await requestPasswordReset({ phone, method });
            if (result.success) {
                setDigits(EMPTY_CODE);
                setCodeError(undefined);
                setSecondsLeft(OTP_RESEND_SECONDS);
            } else {
                setCodeError(result.message);
            }
            focusBox(0);
        } finally {
            setResending(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy) return;

        const code = digits.join("");
        if (code === "") {
            setCodeError(requiredMessage("mã xác minh"));
            focusBox(0);
            return;
        }
        if (code.length < OTP_LENGTH) {
            setCodeError(invalidMessage("Mã xác minh"));
            focusBox(digits.indexOf(""));
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOtp({ phone, code });
            if (result.success) {
                navigate(ROUTES.RESET_PASSWORD, { replace: true, state: { phone, resetToken: result.data.resetToken } });
                return;
            }
            setCodeError(result.message);
            focusBox(0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-page">
            <Card variant="auth" className="w-full max-w-md">
                <h1 className="auth-title">Nhập mã xác minh (OTP)</h1>
                <p className="auth-subtitle">
                    Mã xác minh gồm 6 chữ số vừa được gửi. Vui lòng nhập mã để tiếp tục.
                </p>

                <form noValidate onSubmit={handleSubmit}>
                    <div role="group" aria-labelledby="code-label" className="field">
                        <p id="code-label" className="label label-required">
                            Mã xác minh
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                            {digits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => {
                                        inputRefs.current[index] = element;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? "one-time-code" : "off"}
                                    autoFocus={index === 0}
                                    aria-label={`Chữ số ${index + 1} của mã xác minh`}
                                    aria-required="true"
                                    aria-invalid={codeError ? true : undefined}
                                    aria-describedby={codeError ? "code-error" : undefined}
                                    className="input num h-12 px-0 text-center text-heading-2"
                                    value={digit}
                                    onChange={(event) => handleDigitChange(index, event)}
                                    onKeyDown={(event) => handleKeyDown(index, event)}
                                    onPaste={(event) => handlePaste(index, event)}
                                />
                            ))}
                        </div>
                        {codeError && (
                            <p id="code-error" className="error-text">
                                {codeError}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted">
                        {secondsLeft > 0 && <p className="num">Gửi lại mã sau {formatCountdown(secondsLeft)}</p>}
                        <p>
                            Chưa nhận được mã?{" "}
                            <button
                                type="button"
                                disabled={secondsLeft > 0 || busy}
                                aria-busy={resending || undefined}
                                className="btn btn-link font-semibold"
                                onClick={handleResend}
                            >
                                Gửi lại OTP
                            </button>
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={busy}
                        aria-busy={loading || undefined}
                        className="btn btn-primary btn-lg mt-6 w-full"
                    >
                        {loading && <span className="btn-spinner" aria-hidden="true" />}
                        {loading ? "Đang xác nhận..." : "Xác nhận và tiếp tục"}
                    </button>
                </form>
            </Card>
        </section>
    );
};

export default VerifyOtpPage;
