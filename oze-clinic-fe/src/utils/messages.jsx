// System Messages (SRS Report 3), Vietnamese texts from the Sign In spec (section 3b), word for word.
export const MESSAGES = {
    MSG07: "Vui lòng nhập [tên trường].",
    MSG24: "Sai mật khẩu.",
    MSG25: "Mật khẩu mới không được trùng với mật khẩu cũ.",
    MSG26: "Tài khoản đã bị tạm khóa do đăng nhập sai 5 lần liên tiếp.",
    MSG37: "Đến lượt bạn, mời vào [phòng khám]",
    MSG38: "Bạn chưa có lần khám nào.",
    MSG55: "Bạn chưa có thông báo nào.",
    MSG56: "Thông tin liên quan không còn tồn tại.",
    MSG64: "Cập nhật mật khẩu thành công!",
    MSG66: "[Tên trường] không hợp lệ. Vui lòng kiểm tra lại.",
};

// Agreed by the team on 07/10/2026 for Register / Reset / Change Password (not used by Sign In).
// TODO(spec): not in the SRS yet.
export const PASSWORD_LENGTH = { MIN: 8, MAX: 32 };

// Same limits as UpdateProfileRequest in the backend.
export const PROFILE_LIMITS = { FULL_NAME_MAX: 100, ADDRESS_MAX: 500 };

// TODO(spec): not in the SRS System Messages table yet; replace with the MSG codes once added.
export const VALIDATION_MESSAGES = {
    PHONE_INVALID: "Số điện thoại không hợp lệ.",
    PASSWORD_LENGTH: `Mật khẩu phải có từ ${PASSWORD_LENGTH.MIN} đến ${PASSWORD_LENGTH.MAX} ký tự.`,
    EMAIL_INVALID: "Email không hợp lệ.",
    FULL_NAME_TOO_LONG: `Họ và tên không được vượt quá ${PROFILE_LIMITS.FULL_NAME_MAX} ký tự.`,
    BIRTHDATE_IN_FUTURE: "Ngày sinh không được lớn hơn ngày hiện tại.",
    ADDRESS_TOO_LONG: `Địa chỉ không được vượt quá ${PROFILE_LIMITS.ADDRESS_MAX} ký tự.`,
    PHONE_IN_USE: "Số điện thoại đã được sử dụng bởi tài khoản khác.",
    EMAIL_IN_USE: "Email đã được sử dụng bởi tài khoản khác.",
};

// TODO(spec): not in the SRS System Messages table yet.
export const PROFILE_MESSAGES = {
    UPDATE_SUCCESS: "Cập nhật thông tin cá nhân thành công!",
    OTP_SENT: "Mã xác minh đã được gửi. Vui lòng nhập mã để hoàn tất cập nhật.",
    NO_CHANGES: "Không có thông tin nào thay đổi.",
};

export const GENDER_LABELS = { male: "Nam", female: "Nữ" };

export const VERIFICATION_METHOD = { SMS: "SMS", EMAIL: "EMAIL" };

export const VERIFICATION_METHOD_OPTIONS = [
    { value: VERIFICATION_METHOD.SMS, label: "Tin nhắn SMS" },
    { value: VERIFICATION_METHOD.EMAIL, label: "Email" },
];

export const OTP_LENGTH = 6;

export const OTP_RESEND_SECONDS = 60;

export const RESET_PASSWORD_REDIRECT_MS = 3000;

export const CLINIC_HOTLINE = { DISPLAY: "0866 866 010", TEL: "0866866010" };

export const CLINIC_EMAIL = "nhakhoaoze@gmail.com";

export const CLINIC_ADDRESS = "Số nhà 55-59, tổ 4, quốc lộ 3, Đông Anh, Hà Nội";

export const CLINIC_OPENING_HOURS = "Thứ 2 - Chủ nhật";

// Google Maps embed searched by address (no API key needed).
// TODO: replace with the clinic's "Share > Embed a map" URL to pin the exact place.
export const CLINIC_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(`Nha khoa OZE, ${CLINIC_ADDRESS}`)}&output=embed`;

export const CONSULTATION_NOTE_MAX_LENGTH = 500;

export const USER_ROLES = {
    PATIENT: "patient",
    DOCTOR: "doctor",
    DENTAL_IMAGING_TECHNICIAN: "dental_imaging_technician",
    RECEPTIONIST: "receptionist",
    CLINIC_MANAGER: "clinic_manager",
};

export const ROLE_LABELS = {
    [USER_ROLES.PATIENT]: "Bệnh nhân",
    [USER_ROLES.DOCTOR]: "Bác sĩ",
    [USER_ROLES.DENTAL_IMAGING_TECHNICIAN]: "Kỹ thuật viên chẩn đoán hình ảnh",
    [USER_ROLES.RECEPTIONIST]: "Lễ tân",
    [USER_ROLES.CLINIC_MANAGER]: "Quản lý phòng khám",
};

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

export const GENERIC_ERROR_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại sau.";

export const APPOINTMENT_STATUS = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    CHECKED_IN: "CHECKED_IN",
    IN_SERVICE: "IN_SERVICE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    NO_SHOW: "NO_SHOW",
};

export const QUEUE_STATUS = { WAITING: "WAITING", CALLED: "CALLED" };

export const STAGE_STATUS = { SCHEDULED: "Scheduled", IN_PROGRESS: "InProgress", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export const PLAN_STATUS = { PROPOSED: "Proposed", IN_PROGRESS: "InProgress" };

export const PAYMENT_STATUS = { UNPAID: "UNPAID", PARTIALLY_PAID: "PARTIALLY_PAID" };

export const EXAMINATION_STATUS = { COMPLETED: "Completed", LOCKED: "Locked" };

export const PATIENT_APPOINTMENT_STATUS = {
    [APPOINTMENT_STATUS.PENDING]: { label: "Chờ xác nhận", badge: "badge-warning" },
    [APPOINTMENT_STATUS.CONFIRMED]: { label: "Đã xác nhận", badge: "badge-info" },
    [APPOINTMENT_STATUS.CHECKED_IN]: { label: "Đang chờ khám", badge: "badge-info" },
    [APPOINTMENT_STATUS.IN_SERVICE]: { label: "Đang khám", badge: "badge-info" },
    [APPOINTMENT_STATUS.COMPLETED]: { label: "Đã khám", badge: "badge-success" },
    [APPOINTMENT_STATUS.CANCELLED]: { label: "Đã hủy", badge: "badge-neutral" },
    [APPOINTMENT_STATUS.NO_SHOW]: { label: "Lỡ hẹn", badge: "badge-danger" },
};

export const TREATMENT_STAGE_STATUS = {
    [STAGE_STATUS.SCHEDULED]: { label: "Đã lên lịch", badge: "badge-neutral" },
    [STAGE_STATUS.IN_PROGRESS]: { label: "Đang điều trị", badge: "badge-info" },
    [STAGE_STATUS.COMPLETED]: { label: "Hoàn thành", badge: "badge-success" },
    [STAGE_STATUS.CANCELLED]: { label: "Đã hủy", badge: "badge-neutral" },
};

export const TREATMENT_PLAN_STATUS = { [PLAN_STATUS.PROPOSED]: { label: "Chờ chấp nhận", badge: "badge-warning" } };

export const INVOICE_PAYMENT_STATUS = {
    [PAYMENT_STATUS.UNPAID]: { label: "Chưa thanh toán", badge: "badge-warning" },
    [PAYMENT_STATUS.PARTIALLY_PAID]: { label: "Chưa thanh toán", badge: "badge-warning" },
};
