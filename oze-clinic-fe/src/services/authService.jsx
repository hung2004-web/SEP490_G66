import api from "./api";
import { BACKEND_LOGIN_CODES, BACKEND_ROLE_NAMES, GENERIC_ERROR_MESSAGE, MESSAGES, VERIFICATION_METHOD } from "../utils/messages";
import { getDefaultMockUserId, getMockCurrentUser, getMockUsers, setMockCurrentUserId, updateMockUser } from "../utils/data/mockData";
import { invalidMessage } from "../utils/validation";
import { clearSession, getSessionRefreshToken, getSessionToken, isAccessTokenExpired, saveSession, sessionFromAuthResult } from "./sessionStore";

const MOCK_PASSWORD = "12345678";
const MOCK_DELAY_MS = 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const failure = (message) => ({ success: false, message, data: null, errors: null });

const success = (data) => ({ success: true, message: null, data, errors: null });

const AUTH_REQUEST_CONFIG = { skipAuthRefresh: true };

const loginFailure = (code) => {
    if (code === BACKEND_LOGIN_CODES.INVALID_CREDENTIALS) return failure(MESSAGES.MSG24);
    if (code === BACKEND_LOGIN_CODES.LOCKED_OUT) return failure(MESSAGES.MSG26);
    if (code === BACKEND_LOGIN_CODES.ACCOUNT_DISABLED) return failure(MESSAGES.MSG80);
    return failure(GENERIC_ERROR_MESSAGE);
};

const sendLogout = (refreshToken) => {
    api.post("/api/Auth/logout", { refreshToken }, AUTH_REQUEST_CONFIG).catch(() => { });
};

// mockUserId: the signed-in mock account; for an API sign-in, the default mock user of the role.
const completeSignIn = (body, mockUserId) => {
    if (body?.success !== true) return loginFailure(body?.code);

    const data = body.data;
    if (typeof data?.token !== "string" || typeof data?.refreshToken !== "string" || !data.token || !data.refreshToken) {
        return failure(GENERIC_ERROR_MESSAGE);
    }

    const session = sessionFromAuthResult(data);
    if (!session) {
        sendLogout(data.refreshToken);
        return failure(GENERIC_ERROR_MESSAGE);
    }

    setMockCurrentUserId(mockUserId ?? getDefaultMockUserId(session.role));
    saveSession(session);
    return success({ role: session.role });
};

const MOCK_SESSION_MINUTES = 60;

const toBase64Url = (value) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

// Unsigned token with the claims sessionStore reads (sub, role, FullName, exp). Only the frontend reads it.
const mockAccessToken = (user) => {
    const header = toBase64Url({ alg: "none", typ: "JWT" });
    const payload = toBase64Url({
        sub: user.id,
        role: BACKEND_ROLE_NAMES[user.role],
        FullName: user.fullname,
        exp: Math.floor(Date.now() / 1000) + MOCK_SESSION_MINUTES * 60,
    });
    return `${header}.${payload}.mock`;
};

// Mock accounts in utils/data/mockData (password "password123"), used when the API cannot be reached.
const mockSignIn = async ({ identifier, password }) => {
    await wait(MOCK_DELAY_MS);
    const user = getMockUsers().find((candidate) => candidate.phone === identifier || candidate.email === identifier);
    if (!user || user.password !== password) return loginFailure(BACKEND_LOGIN_CODES.INVALID_CREDENTIALS);
    return completeSignIn(success({ token: mockAccessToken(user), refreshToken: `mock-refresh-${user.id}` }), user.id);
};

// No ApiResponse (network error, timeout, missing VITE_API_URL) or a server error such as the database being down.
const isApiUnavailable = (error) => typeof error.response?.data?.success !== "boolean" || error.response.status >= 500;

export const signIn = async ({ identifier, password }) => {
    try {
        const response = await api.post("/api/Auth/login", { identifier, password }, AUTH_REQUEST_CONFIG);
        return completeSignIn(response.data);
    } catch (error) {
        if (isApiUnavailable(error)) return mockSignIn({ identifier, password });
        return loginFailure(error.response?.data?.code);
    }
};

export const signOut = () => {
    const token = getSessionToken();
    const refreshToken = getSessionRefreshToken();
    const expired = token !== null && isAccessTokenExpired(token);

    setMockCurrentUserId(null);
    clearSession();
    if (refreshToken) sendLogout(refreshToken);
    return { expired };
};

const GENERIC_ERROR = "Có lỗi xảy ra, vui lòng thử lại sau.";

// The backend answers 400 with the same ApiResponse shape, so screens only check result.success.
// Statuses in ERROR_PAGE_STATUSES are already sent to the error page by the interceptor in "./api".
const postApi = async (url, body) => {
    try {
        const response = await api.post(url, body);
        return response.data;
    } catch (error) {
        // Anything that is not an ApiResponse (e.g. the HTML 404 page when VITE_API_URL is missing) gets a generic message.
        const data = error.response?.data;
        return typeof data?.success === "boolean" ? data : failure(GENERIC_ERROR);
    }
};

// The backend expects "Male"/"Female" and "Sms"/"Email".
const GENDER_VALUES = { male: "Male", female: "Female" };
const BACKEND_VERIFICATION_METHOD = { [VERIFICATION_METHOD.SMS]: "Sms", [VERIFICATION_METHOD.EMAIL]: "Email" };

// Returns data: { sessionId, verificationMethod, maskedDestination, expiresAt, resendAvailableAt }.
export const register = async ({ fullname, birthdate, gender, phone, email, password, confirmPassword, method }) =>
    postApi("/api/Auth/register", {
        fullName: fullname.trim(),
        dateOfBirth: birthdate,
        gender: GENDER_VALUES[gender],
        phoneNumber: phone,
        email: email.trim() || null,
        password,
        confirmPassword,
        verificationMethod: BACKEND_VERIFICATION_METHOD[method],
    });

export const verifyRegisterOtp = async ({ sessionId, code }) =>
    postApi("/api/Auth/verify-otp", { sessionId, otp: code });

export const resendRegisterOtp = async ({ sessionId }) => postApi("/api/Auth/resend-otp", { sessionId });

const MOCK_UNREGISTERED_PHONE = "0900000001";

const mockRequestPasswordReset = async ({ phone }) => {
    await wait(MOCK_DELAY_MS);

    if (phone === MOCK_UNREGISTERED_PHONE) return failure(invalidMessage("Số điện thoại"));

    return success(null);
};

export const requestPasswordReset = async ({ phone, method }) => mockRequestPasswordReset({ phone, method });

const MOCK_OTP_CODE = "123456";
const MOCK_EXPIRED_OTP_CODE = "000000";
const MOCK_RESET_TOKEN = "mock-reset-token";

const mockVerifyOtp = async ({ code }) => {
    await wait(MOCK_DELAY_MS);

    if (code === MOCK_EXPIRED_OTP_CODE) return failure(invalidMessage("Mã xác minh"));
    if (code !== MOCK_OTP_CODE) return failure(invalidMessage("Mã xác minh"));

    return success({ resetToken: MOCK_RESET_TOKEN });
};

export const verifyOtp = async ({ phone, code }) => mockVerifyOtp({ phone, code });

const mockResetPassword = async ({ password }) => {
    await wait(MOCK_DELAY_MS);

    if (password === MOCK_PASSWORD) return failure(MESSAGES.MSG25);

    return success(null);
};

export const resetPassword = async ({ token, password }) => mockResetPassword({ token, password });

const MAX_CHANGE_PASSWORD_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Wrong current-password attempts in this tab. TODO(be): the backend counts these and locks the account.
let wrongPasswordAttempts = 0;

// Change password while signed in. On a wrong current password, data.attemptsLeft says how many tries remain;
// data.locked is true once the account is locked (the screen then signs the user out).
export const changePassword = async ({ currentPassword, newPassword }) => {
    await wait(MOCK_DELAY_MS);

    const user = getMockCurrentUser();
    if (!user) return failure("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

    if (currentPassword !== user.password) {
        wrongPasswordAttempts += 1;
        const attemptsLeft = MAX_CHANGE_PASSWORD_ATTEMPTS - wrongPasswordAttempts;
        if (attemptsLeft <= 0) {
            wrongPasswordAttempts = 0;
            return { ...failure(MESSAGES.MSG26), data: { locked: true } };
        }
        return {
            ...failure(`Mật khẩu hiện tại không đúng. Bạn còn ${attemptsLeft} lần thử trước khi tài khoản bị tạm khoá ${LOCK_MINUTES} phút.`),
            data: { attemptsLeft },
        };
    }

    wrongPasswordAttempts = 0;
    if (newPassword === user.password) return failure(MESSAGES.MSG25);

    updateMockUser(user.id, { password: newPassword });
    return success(null);
};
