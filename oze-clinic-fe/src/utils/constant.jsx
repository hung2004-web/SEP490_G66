export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot-password",
    VERIFY_OTP: "/verify-otp",
    RESET_PASSWORD: "/reset-password",
};

// System Messages (SRS Report 3), Vietnamese texts from the Sign In spec (section 3b), word for word.
export const MESSAGES = {
    MSG07: "Vui lòng nhập [tên trường].",
    MSG24: "Sai mật khẩu.",
    MSG26: "Tài khoản đã bị tạm khóa do đăng nhập sai 5 lần liên tiếp.",
    MSG66: "[Tên trường] không hợp lệ. Vui lòng kiểm tra lại.",
};

// Agreed by the team on 07/10/2026 for Register / Reset / Change Password (not used by Sign In).
// TODO(spec): not in the SRS yet.
export const PASSWORD_LENGTH = { MIN: 8, MAX: 32 };

// TODO(spec): not in the SRS System Messages table yet; replace with the MSG codes once added.
export const VALIDATION_MESSAGES = {
    PHONE_INVALID: "Số điện thoại không hợp lệ.",
    PASSWORD_LENGTH: `Mật khẩu phải có từ ${PASSWORD_LENGTH.MIN} đến ${PASSWORD_LENGTH.MAX} ký tự.`,
};

export const VERIFICATION_METHOD = { SMS: "SMS", EMAIL: "EMAIL" };

export const VERIFICATION_METHOD_OPTIONS = [
    { value: VERIFICATION_METHOD.SMS, label: "Tin nhắn SMS" },
    { value: VERIFICATION_METHOD.EMAIL, label: "Email" },
];

export const OTP_LENGTH = 6;

export const OTP_RESEND_SECONDS = 20;

// TODO(spec): BR-001/UC-04 say Home Page, the screen flow says Patient Dashboard, and staff
// destinations are not defined. The role source is also not defined in the login response.
// eslint-disable-next-line no-unused-vars
export const getPostLoginRoute = (role) => ROUTES.HOME;
