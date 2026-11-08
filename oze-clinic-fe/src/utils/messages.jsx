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

export const BOOKING_MIN_HOURS_AHEAD = 2;

export const BOOKING_NOTE_MAX_LENGTH = 500;

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

const PAYMENT_STATUS_GUIDE_ITEMS = [
    { key: "paid", meaning: "Đã thanh toán đủ đợt này.", when: "Lễ tân xác nhận nhận tiền.", patient: "—" },
    { key: "due", meaning: "Sắp đến mốc phải thanh toán.", when: "Mốc điều trị gắn với đợt sắp diễn ra (ví dụ buổi gắn mắc cài).", patient: "Chuẩn bị tiền, trả tại quầy hoặc chuyển khoản." },
    { key: "overdue", meaning: "Đã qua mốc mà chưa thanh toán.", when: "Mốc đã diễn ra, chưa có xác nhận nhận tiền.", patient: "Thanh toán sớm hoặc gọi phòng khám." },
    { key: "later", meaning: "Đợt của các bước sau.", when: "—", patient: "—" },
];

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
        items: PAYMENT_STATUS_GUIDE_ITEMS,
    },
];

export const PATIENT_DEBT_PAY_TYPE = {
    installment: { label: "Trả góp", badge: "badge-info" },
    step: { label: "Trả theo bước", badge: "badge-warning" },
    once: { label: "Trả một lần", badge: "badge-neutral" },
};

export const PATIENT_DEBT_STATUS = {
    open: { label: "Còn nợ", badge: "badge-warning" },
    overdue: { label: "Quá hạn", badge: "badge-danger" },
    paid: { label: "Đã thanh toán đủ", badge: "badge-success" },
};

export const PATIENT_DEBT_STATUS_GUIDE = [
    {
        title: "Hình thức thanh toán",
        labels: PATIENT_DEBT_PAY_TYPE,
        items: [
            {
                key: "installment",
                meaning: "Tổng giá kế hoạch chia thành nhiều đợt, mỗi đợt gắn với một mốc điều trị và có hạn.",
                when: "Bác sĩ và bệnh nhân thống nhất khi lập kế hoạch dài (ví dụ niềng răng).",
                patient: "Chuẩn bị tiền trước mỗi mốc; đợt tới hiện ở đầu mục Lịch trả góp.",
            },
            {
                key: "step",
                meaning: "Mỗi bước điều trị có giá riêng, làm bước nào thanh toán bước đó.",
                when: "Kế hoạch nhiều bước nhưng không chia đợt (ví dụ điều trị tủy rồi bọc sứ).",
                patient: "Thanh toán sau mỗi buổi làm bước.",
            },
            { key: "once", meaning: "Dịch vụ lẻ, thanh toán một lần theo phiếu sau buổi khám.", when: "Khám, lấy cao răng, trám răng…", patient: "Thanh toán tại quầy sau buổi khám." },
        ],
    },
    {
        title: "Trạng thái khoản",
        labels: PATIENT_DEBT_STATUS,
        items: [
            { key: "open", meaning: "Khoản chưa thanh toán đủ, chưa có đợt quá hạn.", when: "Còn đợt hoặc bước chưa trả.", patient: "Theo dõi đợt tới." },
            { key: "overdue", meaning: "Có đợt hoặc bước đã qua hạn mà chưa trả.", when: "Qua mốc thanh toán chưa có xác nhận nhận tiền.", patient: "Thanh toán sớm hoặc gọi phòng khám." },
            { key: "paid", meaning: "Không còn số phải trả.", when: "Lần thanh toán cuối được xác nhận.", patient: "—" },
        ],
    },
    {
        title: "Đợt thanh toán",
        labels: MEDICAL_RECORD_PAYMENT_STATUS,
        items: PAYMENT_STATUS_GUIDE_ITEMS,
    },
    {
        title: "Hạn",
        items: [{ key: "due", term: "Hạn", meaning: "Hạn chót trả hết khoản, bằng ngày tạo cộng 6 tháng. Khác hạn của từng đợt / bước trong trang chi tiết." }],
    },
];

export const PATIENT_DEBT_TEXT = {
    TITLE: "Công nợ & đợt thanh toán",
    DESCRIPTION: "Các khoản chi phí của bạn và hạn thanh toán, phân loại theo hình thức: trả góp, trả theo bước, trả một lần.",
    DETAIL_TITLE: "Chi tiết công nợ",
    DOCUMENT_TITLE: "Công nợ & đợt thanh toán",
    DOCUMENT_DETAIL: (name) => `${name} – Công nợ`,
    DOCUMENT_NOT_FOUND: "Không tìm thấy – Công nợ",
    DOCUMENT_PENDING: "Chi tiết công nợ – Công nợ",
    LOADING_LIST: "Đang tải công nợ",
    LOADING_DETAIL: "Đang tải chi tiết công nợ",
    CRUMB_LOADING: "Đang tải",
    CRUMB_ERROR: "Lỗi",
    CRUMB_NOT_FOUND: "Không tìm thấy",
    BACK: "Danh sách công nợ",
    ERROR_TITLE: "Không thể tải công nợ",
    ERROR_TEXT: "Đã có lỗi xảy ra, vui lòng thử lại.",
    RETRY: "Thử lại",
    EMPTY_TITLE: "Bạn chưa có khoản nào cần thanh toán",
    EMPTY_TEXT: "Chi phí chỉ phát sinh sau khi bác sĩ khám và thống nhất với bạn.",
    NOT_FOUND_TITLE: "Không tìm thấy khoản này",
    NOT_FOUND_TEXT: "Khoản không tồn tại hoặc bạn không có quyền xem.",
    BACK_TO_LIST: "Về danh sách công nợ",
    TYPE_GROUP: "Phân loại theo hình thức thanh toán",
    TYPE_ALL: "Tất cả",
    SEARCH: "Tìm khoản, dịch vụ",
    CLEAR_SEARCH: "Xóa tìm kiếm",
    FILTER: "Lọc",
    FILTER_LABEL: "Lọc công nợ",
    FILTER_UNIT: " lựa chọn",
    STATUS_GROUP: "Trạng thái",
    STATUS_HELP: "Trạng thái",
    SHOWN: (shown, total) => `Hiển thị ${shown}/${total}`,
    CHIP: (label) => `Trạng thái: ${label}`,
    REMOVE_CHIP: (label) => `Bỏ lọc ${label}`,
    CLEAR_ALL: "Xóa tất cả",
    NO_RESULT: "Không có kết quả phù hợp",
    NO_RESULT_TEXT: "Thử bỏ bớt bộ lọc hoặc đổi từ khóa.",
    CLEAR_QUERY: "Xóa tìm kiếm và bộ lọc",
    TABLE_CAPTION: "Danh sách công nợ",
    COL_NAME: "Tên dịch vụ",
    COL_TYPE: "Hình thức thanh toán",
    COL_TOTAL: "Tổng giá",
    COL_LEFT: "Còn lại",
    COL_STATUS: "Trạng thái",
    COL_DATES: "Ngày tạo / Hạn",
    COL_ACTION: "Thao tác",
    DUE: (date) => `Hạn ${date}`,
    CREATED_DUE: (created, due) => `Ngày tạo ${created} · Hạn ${due}`,
    LEFT: "Còn lại",
    TOTAL: "Tổng giá",
    PAID: "Đã thanh toán",
    VIEW_DETAIL: "Xem chi tiết",
    DETAIL_CONTEXT: (name, date) => `${name}, ngày ${date}`,
    PAGINATION: "Phân trang danh sách công nợ",
    RANGE: (from, to, total) => `Hiển thị ${from}–${to} / ${total}`,
    PAY_RULE: (rule) => `Cách thanh toán: ${rule}`,
    PROGRESS_TEXT: (paid, total) => `${paid} / ${total}`,
    INSTALLMENT_TITLE: "Lịch trả góp",
    INSTALLMENT_SUMMARY: (count, paid) => `${count} đợt · đã trả ${paid}`,
    STEP_TITLE: "Các bước và chi phí",
    STEP_SUMMARY: "Thanh toán khi làm từng bước",
    COL_STEP: "Bước",
    COL_CONTENT: "Nội dung",
    COL_AMOUNT: "Số tiền",
    ONCE_TITLE: (date) => `Thanh toán ngày ${date}`,
    VIEW_RECEIPT: "Xem phiếu",
    COL_PROCEDURE: "Thủ thuật",
    COL_LINE_TOTAL: "Thành tiền",
    PAYMENTS_TITLE: "Các lần đã thanh toán",
    COL_DATE: "Ngày",
    COL_METHOD: "Phương thức",
    COL_RECEIPT: "Phiếu",
    RECEIPT: "Phiếu",
    RECEIPT_CONTEXT: (date, amount) => `ngày ${date}, ${amount}`,
    NO_PAYMENT: "Chưa có lần thanh toán nào.",
    VIEW_PLAN: "Xem kế hoạch trong Sổ khám bệnh",
    REFUNDS_TITLE: "Yêu cầu hoàn tiền",
    ALL_REFUNDS: "Tất cả",
    REFUND_LINK: (code, label) => `Yêu cầu hoàn tiền ${code} · ${label}`,
    REFUND_HEAD: (code) => `${code} · `,
    REFUND_META: (stage, visitDate, createdAt) => `${stage ? `${stage} · ` : ""}phiếu ${visitDate} · tạo ${createdAt}`,
    VIEW: "Xem",
    REFUND_CONTEXT: (code) => `yêu cầu ${code}`,
    NO_REFUND: "Không có yêu cầu hoàn tiền nào cho khoản này.",
    CONTACT_BEFORE: "Cần hoàn tiền? Vui lòng liên hệ lễ tân hoặc gọi ",
    CONTACT_AFTER: ".",
    ONCE_RULE: "Thanh toán sau khi làm",
    SORT_DUE: "Đến hạn trước",
    SORT_LEFT: "Còn lại nhiều nhất",
    SORT_NEW: "Mới nhất trước",
};

export const BOOKING_ERROR_CODE = {
    PROFILE_NOT_FOUND: "PATIENT_PROFILE_NOT_FOUND",
    SLOT_NOT_AVAILABLE: "SLOT_NOT_AVAILABLE",
    PAST_DATE: "PAST_DATE",
    TOO_FAR_AHEAD: "TOO_FAR_AHEAD",
    VARIANT_INACTIVE: "VARIANT_INACTIVE",
    HAS_UNFINISHED: "PATIENT_HAS_UNFINISHED",
    GENERIC: "GENERIC",
};

export const BOOKING_TEXT = {
    TITLE: "Đặt lịch khám",
    SUCCESS_DOCUMENT_TITLE: "Đặt lịch khám thành công",
    DESCRIPTION: "Chọn dịch vụ, ngày và ca khám. Lễ tân sẽ xác nhận lịch hẹn qua SMS hoặc email.",
    PATIENT_SECTION: "Thông tin bệnh nhân",
    SCHEDULE_SECTION: "Thông tin lịch khám",
    UPDATE_PROFILE: "Cập nhật hồ sơ",
    NOTE: "Ghi chú",
    OPTIONAL: "(không bắt buộc)",
    NOTE_PLACEHOLDER: "Mô tả triệu chứng hoặc lý do khám",
    SERVICE: "Dịch vụ",
    SERVICE_HELP: "Chọn dịch vụ, chọn loại nếu có, rồi bấm Thêm dịch vụ. Có thể thêm nhiều dịch vụ.",
    SERVICE_SELECT: "Dịch vụ cần khám",
    SERVICE_PLACEHOLDER: "Chọn dịch vụ",
    VARIANT_SELECT: "Loại của dịch vụ",
    VARIANT_NEED_SERVICE: "Chọn dịch vụ trước",
    VARIANT_NOT_NEEDED: "Không cần chọn loại",
    VARIANT_PLACEHOLDER: "Chọn loại",
    VARIANT_UNKNOWN: "Chưa rõ, cần tư vấn",
    VARIANT_UNKNOWN_LABEL: "chưa rõ loại",
    CHOSEN_SUFFIX: " (đã chọn)",
    ADD_SERVICE: "Thêm dịch vụ",
    CHOSEN_SERVICES: "Dịch vụ đã chọn",
    NO_SERVICE: "Chưa có dịch vụ nào. Chọn dịch vụ ở trên rồi bấm \"Thêm dịch vụ\".",
    REMOVE_SERVICE: (label) => `Bỏ ${label}`,
    SERVICE_REQUIRED: "Vui lòng chọn ít nhất một dịch vụ.",
    SERVICE_PENDING: (label) => `"${label}" chưa được thêm vào danh sách. Bấm "Thêm dịch vụ" để thêm, hoặc chọn lại "Chọn dịch vụ" nếu không cần.`,
    SERVICE_GONE: (label) => `"${label}" không còn khả dụng và đã được bỏ.`,
    SERVICE_ADDED: (label, count) => `Đã thêm ${label}. Đã chọn ${count} dịch vụ.`,
    SERVICE_REMOVED: (label) => `Đã bỏ ${label}.`,
    DOCTOR: "Bác sĩ",
    ANY_DOCTOR: "Không yêu cầu",
    CLINIC_ASSIGNS: "Phòng khám sắp xếp",
    DAY: "Ngày khám",
    WEEK_TEXT: (from, to) => `Tuần (${from} – ${to})`,
    PREV_WEEK: "Tuần trước",
    THIS_WEEK: "Tuần này",
    NEXT_WEEK: "Tuần sau",
    PICK_WEEK: "Chọn tuần",
    PREV_MONTH: "Tháng trước",
    NEXT_MONTH: "Tháng sau",
    MONTH_TITLE: (month, year) => `Tháng ${month}/${year}`,
    WEEK_COLUMN: "Tuần",
    WEEKDAY_SHORT: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
    WEEK_ROW: (week, range) => `Tuần ${week}, ${range}`,
    WEEK_ROW_TODAY: ", có hôm nay",
    WEEK_ROW_OUTSIDE: " (ngoài khoảng đặt lịch)",
    DAYS_GROUP: (range) => `Ngày khám trong tuần ${range}`,
    TODAY: "Hôm nay",
    TODAY_ARIA: "hôm nay",
    DAY_FREE: (count) => `${count} ca trống`,
    DAY_FULL: "Hết ca",
    DAY_OFF: "Nghỉ",
    DAY_PAST: "Đã qua",
    DAY_CLOSED: "Chưa mở lịch",
    DAYS_ERROR: "Không tải được số ca trống.",
    RETRY: "Thử lại",
    EARLIEST: "Ca trống sớm nhất:",
    PICK_EARLIEST: "Chọn ca này",
    PICKED: "Đang chọn",
    UPDATED_AT: (time) => `Cập nhật lúc ${time}`,
    REFRESH: "Làm mới ca trống",
    REFRESHED: (time, count) => `Đã cập nhật lúc ${time}. ${count} ca trống.`,
    SLOT: "Ca khám",
    MORNING: "Buổi sáng",
    AFTERNOON: "Buổi chiều",
    SESSION_COUNT: (count) => `· ${count} ca trống`,
    SESSION_EMPTY: (session) => `Không còn ca trống trong ${session.toLowerCase()}.`,
    SLOT_ARIA: (start, end) => `${start} đến ${end}`,
    SLOTS_ERROR: "Không tải được ca khám.",
    SLOT_REQUIRED: "Vui lòng chọn ca khám.",
    SLOT_GONE: (range) => `Ca ${range} không còn trống. Vui lòng chọn ca khác.`,
    DAY_GONE_DOCTOR: (from, to) => `Ngày ${from} không còn ca trống với bác sĩ đã chọn. Đã chuyển sang ${to}.`,
    DAY_GONE_DOCTOR_SLOT: " Ca đã chọn đã được bỏ, vui lòng chọn lại ca.",
    DAY_GONE: (from, to) => `Ngày ${from} đã hết ca. Đã chuyển sang ${to}.`,
    SUBMIT_SLOT_TAKEN: (range) => `Chưa đặt được lịch: ca ${range} vừa hết chỗ. Vui lòng chọn ca khác rồi bấm "Đặt lịch khám" lại.`,
    SUBMIT_PAST_DATE: "Chưa đặt được lịch: ngày đã chọn không còn đặt được (chỉ đặt trước tối đa 30 ngày). Vui lòng chọn ngày và ca khác.",
    SUBMIT_ERROR: "Chưa đặt được lịch do lỗi kết nối. Thông tin bạn chọn vẫn được giữ, vui lòng bấm \"Đặt lịch khám\" lại. Nếu vẫn lỗi, gọi",
    SUBMIT: "Đặt lịch khám",
    SUBMITTING: "Đang đặt lịch…",
    LOAD_ERROR_TITLE: "Không thể tải thông tin đặt lịch",
    LOAD_ERROR_TEXT: "Vui lòng bấm \"Thử lại\". Nếu vẫn không được, gọi",
    LOAD_ERROR_TEXT_END: "để đặt lịch qua điện thoại.",
    UNLINKED_TITLE: "Tài khoản chưa được gắn với hồ sơ khám",
    UNLINKED_TEXT: "Vì vậy bạn chưa thể đặt lịch trực tuyến. Vui lòng gọi",
    UNLINKED_TEXT_END: "để lễ tân gắn hồ sơ hoặc đặt lịch giúp bạn.",
    BLOCKED_TITLE: "Bạn đang có một lịch hẹn chưa khám xong",
    BLOCKED_APPOINTMENT: (day, time, code) => `Lịch hẹn ${day} lúc ${time} (mã ${code})`,
    BLOCKED_TEXT: "Mỗi lần chỉ đặt được một lịch hẹn. Muốn đặt lịch mới, vui lòng đến khám theo lịch này hoặc hủy lịch trước.",
    BLOCKED_ACTION: "Xem hoặc hủy lịch hẹn",
    NO_SLOTS_TITLE: "Hiện không còn ca trống trong 30 ngày tới",
    NO_SLOTS_TEXT: "Vui lòng gọi",
    NO_SLOTS_TEXT_END: "để được hỗ trợ xếp lịch.",
    ALL_DOCTORS: "Xem với mọi bác sĩ",
    SUCCESS_TITLE: "Đặt lịch khám thành công",
    SUCCESS_TEXT: "Lịch hẹn của bạn đang chờ phòng khám xác nhận. Lễ tân sẽ báo cho bạn qua SMS hoặc email khi lịch được xác nhận. Muốn đổi hoặc hủy, vào \"Lịch hẹn của tôi\".",
    SUCCESS_CODE: "Mã lịch hẹn",
    SUCCESS_TIME: "Thời gian",
    SUCCESS_DOCTOR: "Bác sĩ",
    SUCCESS_SERVICES: "Dịch vụ",
    SUCCESS_NOTE: "Ghi chú",
    MY_APPOINTMENTS: "Xem lịch hẹn của tôi",
    HOME: "Về trang chủ",
    GENDER: { male: "Nam", female: "Nữ" },
    WEEKDAYS: ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
};
