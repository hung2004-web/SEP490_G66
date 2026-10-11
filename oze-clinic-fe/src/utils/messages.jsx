// System Messages (SRS Report 3), Vietnamese texts from the Sign In spec (section 3b), word for word.
export const MESSAGES = {
    MSG07: "Vui lòng nhập [tên trường].",
    MSG24: "Sai mật khẩu.",
    MSG25: "Mật khẩu mới không được trùng với mật khẩu cũ.",
    MSG26: "Tài khoản đã bị tạm khóa do đăng nhập sai 5 lần liên tiếp.",
    MSG64: "Cập nhật mật khẩu thành công!",
    MSG66: "[Tên trường] không hợp lệ. Vui lòng kiểm tra lại.",
};

// Agreed by the team on 07/10/2026 for Register / Reset / Change Password (not used by Sign In).
// TODO(spec): not in the SRS yet.
export const PASSWORD_LENGTH = { MIN: 8, MAX: 32 };

// TODO(spec): not in the SRS System Messages table yet; replace with the MSG codes once added.
export const VALIDATION_MESSAGES = {
    PHONE_INVALID: "Số điện thoại không hợp lệ.",
    PASSWORD_LENGTH: `Mật khẩu phải có từ ${PASSWORD_LENGTH.MIN} đến ${PASSWORD_LENGTH.MAX} ký tự.`,
    EMAIL_INVALID: "Email không hợp lệ.",
};

export const VERIFICATION_METHOD = { SMS: "SMS", EMAIL: "EMAIL" };

export const VERIFICATION_METHOD_OPTIONS = [
    { value: VERIFICATION_METHOD.SMS, label: "Tin nhắn SMS" },
    { value: VERIFICATION_METHOD.EMAIL, label: "Email" },
];

export const OTP_LENGTH = 6;

export const OTP_RESEND_SECONDS = 20;

export const RESET_PASSWORD_REDIRECT_MS = 3000;

export const CLINIC_HOTLINE = { DISPLAY: "0866 866 010", TEL: "0866866010" };

export const GUEST_HEADER_TEXT = {
    LOGO_ALT: "OZE Dental",
    SEARCH_LABEL: "Tìm kiếm",
    SEARCH_PLACEHOLDER: "Tìm kiếm...",
    SEARCH_BUTTON: "Tìm kiếm",
    HOTLINE_LABEL: "Hotline:",
    HOME: "Trang chủ",
    SERVICES: "Dịch vụ",
    ALL_SERVICES: "Xem tất cả dịch vụ",
    BOOK_APPOINTMENT: "Đặt lịch hẹn",
    ABOUT_US: "Về chúng tôi",
    ABOUT_US_INTRO: "Giới thiệu",
    DOCTORS: "Đội ngũ bác sĩ",
    CONTACT: "Liên hệ",
    SIGN_IN: "Đăng nhập",
    SIGN_UP: "Đăng ký",
    OPEN_MENU: "Mở menu",
    CLOSE_MENU: "Đóng menu",
    DRAWER_LABEL: "Menu",
};
