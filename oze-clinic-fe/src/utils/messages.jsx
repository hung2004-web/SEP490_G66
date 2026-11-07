// System Messages (SRS Report 3), Vietnamese texts from the Sign In spec (section 3b), word for word.
export const MESSAGES = {
    MSG01: "Lịch hẹn đang ở trạng thái [trạng thái]. Thời gian hẹn: [thời gian].",
    MSG07: "Vui lòng nhập [tên trường].",
    MSG13: "Không thể hủy lịch hẹn trong vòng [số giờ] giờ trước giờ hẹn.",
    MSG23: "Bạn không có quyền truy cập.",
    MSG24: "Sai mật khẩu.",
    MSG25: "Mật khẩu mới không được trùng với mật khẩu cũ.",
    MSG26: "Tài khoản đã bị tạm khóa do đăng nhập sai 5 lần liên tiếp.",
    MSG29: "Lịch hẹn ngày [ngày] lúc [giờ] của bạn đã được hủy thành công.",
    MSG30: "Vui lòng nhập lý do hủy lịch hẹn.",
    MSG31: "Lịch hẹn này không thể hủy trực tuyến nữa. Vui lòng liên hệ phòng khám qua số [số điện thoại].",
    MSG32: "Lịch hẹn của bạn đã được đổi sang ngày [ngày] lúc [giờ] với [bác sĩ].",
    MSG33: "Lịch hẹn này không thể đổi trực tuyến nữa. Vui lòng liên hệ phòng khám qua số [số điện thoại].",
    MSG34: "Khung giờ đã chọn không còn trống. Vui lòng chọn thời gian khác.",
    MSG37: "Đến lượt bạn, mời vào [phòng khám]",
    MSG38: "Bạn chưa có lần khám nào.",
    MSG55: "Bạn chưa có thông báo nào.",
    MSG56: "Thông tin liên quan không còn tồn tại.",
    MSG64: "Cập nhật mật khẩu thành công!",
    MSG66: "[Tên trường] không hợp lệ. Vui lòng kiểm tra lại.",
    MSG76: "[Mục] không khả dụng vào [thời gian].",
    MSG80: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ phòng khám.",
    MSG84: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
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
    SLOT_REQUIRED: "Vui lòng chọn ca khám mới.",
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

export const CLINIC_HOTLINES_TEXT = "0866.866.010 – 0866.866.108";

export const CLINIC_EMAIL = "nhakhoaoze@gmail.com";

export const CLINIC_ADDRESS = "Số nhà 55-59, tổ 4, quốc lộ 3, Đông Anh, Hà Nội";

export const CLINIC_OPENING_HOURS = "Thứ 2 - Chủ nhật";

// Google Maps embed searched by address (no API key needed).
// TODO: replace with the clinic's "Share > Embed a map" URL to pin the exact place.
export const CLINIC_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(`Nha khoa OZE, ${CLINIC_ADDRESS}`)}&output=embed`;

export const CONSULTATION_NOTE_MAX_LENGTH = 500;

export const APPOINTMENT_CHANGE_DEADLINE_HOURS = 24;

export const CANCEL_REASON_MAX_LENGTH = 500;

export const RESCHEDULE_REASON_MAX_LENGTH = 500;

export const BOOKING_MAX_DAYS_AHEAD = 30;

export const USER_ROLES = {
    PATIENT: "patient",
    DOCTOR: "doctor",
    DENTAL_IMAGING_TECHNICIAN: "dental_imaging_technician",
    RECEPTIONIST: "receptionist",
    CLINIC_MANAGER: "clinic_manager",
};

export const BACKEND_ROLE_NAMES = {
    [USER_ROLES.PATIENT]: "Patient",
    [USER_ROLES.DOCTOR]: "Doctor",
    [USER_ROLES.DENTAL_IMAGING_TECHNICIAN]: "DentalImagingTechnician",
    [USER_ROLES.RECEPTIONIST]: "Receptionist",
    [USER_ROLES.CLINIC_MANAGER]: "ClinicManager",
};

export const BACKEND_LOGIN_CODES = {
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    LOCKED_OUT: "LOCKED_OUT",
    ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
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

export const PAYMENT_STATUS = { UNPAID: "UNPAID", PARTIALLY_PAID: "PARTIALLY_PAID", PAID: "PAID" };

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
    [PAYMENT_STATUS.PAID]: { label: "Đã thanh toán", badge: "badge-success" },
};

export const PAYMENT_METHOD_LABELS = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", QR_TRANSFER: "Chuyển khoản QR" };

export const MEDICAL_RECORD_PLAN_STATUS = {
    proposed: { label: "Chờ đồng ý", badge: "badge-warning" },
    active: { label: "Đang điều trị", badge: "badge-info" },
    paused: { label: "Tạm dừng", badge: "badge-neutral" },
    done: { label: "Hoàn thành", badge: "badge-success" },
    stopped: { label: "Đã dừng", badge: "badge-danger" },
};

export const MEDICAL_RECORD_STAGE_STATUS = {
    done: { label: "Đã làm", badge: "badge-success" },
    next: { label: "Bước tiếp theo", badge: "badge-info" },
    todo: { label: "Chưa đến", badge: "badge-neutral" },
};

export const MEDICAL_RECORD_PAYMENT_STATUS = {
    paid: { label: "Đã trả", badge: "badge-success" },
    due: { label: "Sắp đến hạn", badge: "badge-warning" },
    overdue: { label: "Quá hạn", badge: "badge-danger" },
    later: { label: "Chưa đến", badge: "badge-neutral" },
};

export const MEDICAL_RECORD_TOOTH_STATUS = {
    condition: { label: "Cần điều trị", badge: "badge-danger" },
    planned: { label: "Kế hoạch", badge: "badge-danger" },
    treating: { label: "Đang điều trị", badge: "badge-warning" },
    done: { label: "Đã điều trị", badge: "badge-info" },
    watch: { label: "Theo dõi", badge: "badge-neutral" },
};

export const MEDICAL_RECORD_FILM_STATUS = { concluded: { label: "Đã có kết luận", badge: "badge-success" } };

export const MEDICAL_RECORD_APPOINTMENT_BADGE = {
    confirmed: "badge-info",
    pending: "badge-warning",
    done: "badge-success",
    cancelled: "badge-neutral",
    noshow: "badge-danger",
    checkedin: "badge-info",
    inservice: "badge-info",
};

export const MEDICAL_RECORD_FILM_PLACE = { clinic: "Tại phòng khám", partner: "Trung tâm X-quang liên kết" };

export const MEDICAL_RECORD_TOOTH_KIND = {
    caries: "Sâu răng",
    filling: "Trám răng",
    pulp: "Viêm tủy",
    rct: "Điều trị tủy",
    crown: "Mão / bọc sứ",
    wear: "Mẻ, đổi màu",
    impacted: "Răng mọc lệch",
};

export const MEDICAL_RECORD_TOOTH_SURFACE = { O: "mặt nhai", I: "rìa cắn", B: "mặt ngoài", L: "mặt trong", P: "mặt trong", M: "mặt gần", D: "mặt xa" };

export const MEDICAL_RECORD_TOOTH_POSITION = [
    "",
    "Răng cửa giữa",
    "Răng cửa bên",
    "Răng nanh",
    "Răng hàm nhỏ thứ nhất",
    "Răng hàm nhỏ thứ hai",
    "Răng hàm lớn thứ nhất",
    "Răng hàm lớn thứ hai",
    "Răng khôn",
];

export const MEDICAL_RECORD_TOOTH_QUADRANT = ["", "hàm trên bên phải", "hàm trên bên trái", "hàm dưới bên trái", "hàm dưới bên phải"];

export const MEDICAL_RECORD_STATUS_GUIDE = [
    {
        title: "Kế hoạch điều trị",
        labels: MEDICAL_RECORD_PLAN_STATUS,
        items: [
            { key: "proposed", meaning: "Bác sĩ đã lập kế hoạch, bệnh nhân chưa đồng ý.", when: "Bác sĩ lập kế hoạch sau khi khám.", patient: "Trao đổi với bác sĩ; đồng ý tại phòng khám (ký trên bệnh án)." },
            { key: "active", meaning: "Đang thực hiện các bước.", when: "Bệnh nhân đồng ý và bắt đầu bước đầu tiên.", patient: "Theo dõi bước tiếp theo và đợt thanh toán." },
            { key: "paused", meaning: "Tạm ngưng, kế hoạch vẫn giữ.", when: "Bệnh nhân xin tạm ngưng hoặc chờ điều kiện (ví dụ xét nghiệm).", patient: "Liên hệ phòng khám khi muốn tiếp tục." },
            { key: "done", meaning: "Đã làm xong tất cả các bước.", when: "Bác sĩ hoàn tất bước cuối.", patient: "Theo dõi lịch tái khám định kỳ (nếu có)." },
            {
                key: "stopped",
                meaning: "Bệnh nhân không tiếp tục kế hoạch.",
                when: "Bác sĩ báo lý do, chủ phòng khám quyết định quyết toán; phần chưa làm có thể được hoàn tiền.",
                patient: "Xem quyết toán trong Lịch sử thanh toán.",
            },
        ],
    },
    {
        title: "Bước điều trị",
        labels: MEDICAL_RECORD_STAGE_STATUS,
        items: [
            { key: "done", meaning: "Bước đã thực hiện.", when: "Bác sĩ ghi nhận xử trí của buổi khám.", patient: "—" },
            { key: "next", meaning: "Bước sẽ làm ở buổi kế tiếp.", when: "Bước trước đó đã làm xong.", patient: "Xem ngày hẹn." },
            { key: "todo", meaning: "Bước còn lại trong kế hoạch.", when: "—", patient: "—" },
        ],
    },
    {
        title: "Đợt thanh toán",
        labels: MEDICAL_RECORD_PAYMENT_STATUS,
        items: [
            { key: "paid", meaning: "Đã thanh toán đủ đợt này.", when: "Lễ tân xác nhận nhận tiền.", patient: "—" },
            { key: "due", meaning: "Sắp đến mốc phải thanh toán.", when: "Mốc điều trị gắn với đợt sắp diễn ra (ví dụ buổi gắn mắc cài).", patient: "Chuẩn bị tiền, trả tại quầy hoặc chuyển khoản." },
            { key: "overdue", meaning: "Đã qua mốc mà chưa thanh toán.", when: "Mốc đã diễn ra, chưa có xác nhận nhận tiền.", patient: "Thanh toán sớm hoặc gọi phòng khám." },
            { key: "later", meaning: "Đợt của các bước sau.", when: "—", patient: "—" },
        ],
    },
];
