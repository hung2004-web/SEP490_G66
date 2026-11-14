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

export const QUEUE_STATUS = { WAITING: "WAITING", CALLED: "CALLED", IN_EXAMINATION: "IN_EXAMINATION" };

// Badge of a row in the doctor's exam queue. Keys are QUEUE_STATUS values.
export const EXAM_QUEUE_STATUS = {
    [QUEUE_STATUS.WAITING]: { label: "Đang chờ", badge: "badge-neutral" },
    [QUEUE_STATUS.CALLED]: { label: "Đã gọi", badge: "badge-warning" },
    [QUEUE_STATUS.IN_EXAMINATION]: { label: "Đang khám", badge: "badge-info" },
};

// Steps of one exam visit, shown by ExamStepper once the exam has started.
export const EXAM_STEPS = ["Lập hồ sơ bệnh án", "Khám & Chẩn đoán", "Lập kế hoạch điều trị", "Điều trị", "Kê đơn thuốc"];

// Heading of each step's content, same order as EXAM_STEPS.
export const EXAM_STEP_TITLES = ["Bổ sung tiền sử bệnh", "Khám lâm sàng & chẩn đoán", "Lập kế hoạch điều trị", "Thực hiện điều trị", "Kê đơn thuốc"];

// Medical history checklists of step 1. The doctor can also type items not in the list.
export const HISTORY_ALLERGY_OPTIONS = [
    "Penicillin",
    "Amoxicillin",
    "Cephalosporin",
    "Thuốc tê (Lidocaine)",
    "Aspirin / NSAIDs",
    "Latex (găng cao su)",
    "Kim loại (Niken)",
    "Iod",
];

export const HISTORY_CONDITION_OPTIONS = [
    "Bệnh tim mạch",
    "Tăng huyết áp",
    "Tiểu đường",
    "Hen suyễn / bệnh phổi",
    "Viêm gan / bệnh gan",
    "Bệnh thận",
    "Rối loạn đông máu",
    "Động kinh",
    "Bệnh tuyến giáp",
    "Loãng xương",
    "Ung thư / xạ trị vùng đầu cổ",
    "Bệnh truyền nhiễm (HIV, lao…)",
];

// Shown in the condition checklist for female patients only.
export const HISTORY_FEMALE_CONDITION_OPTIONS = ["Đang mang thai", "Đang cho con bú"];

export const HISTORY_DENTAL_OPTIONS = [
    "Ê buốt răng",
    "Chảy máu chân răng",
    "Từng nhổ răng",
    "Từng điều trị tủy",
    "Từng niềng răng",
    "Nghiến răng khi ngủ",
    "Từng phẫu thuật răng miệng",
    "Đau khớp thái dương hàm",
];

// Common symptoms the doctor can tick in the "Khám" tab.
export const EXAM_SYMPTOMS = [
    "Đau răng",
    "Ê buốt khi ăn nóng / lạnh",
    "Đau tự phát về đêm",
    "Đau khi nhai",
    "Chảy máu chân răng",
    "Sưng lợi",
    "Sưng má / mặt",
    "Hôi miệng",
    "Răng lung lay",
    "Mẻ / vỡ răng",
    "Lỗ sâu nhìn thấy",
    "Nhét thức ăn kẽ răng",
    "Răng đổi màu",
    "Đau răng khôn",
    "Đau khớp hàm / há miệng hạn chế",
    "Loét miệng",
    "Khô miệng",
    "Mất răng",
    "Răng mọc lệch / chen chúc",
];

// Suggestions for the free-text tooth condition of the exam chart.
export const TOOTH_CONDITION_SUGGESTIONS = [
    "Sâu răng",
    "Mòn cổ răng",
    "Nứt răng",
    "Mẻ răng",
    "Răng lung lay",
    "Viêm tủy",
    "Đã trám",
    "Đã điều trị tủy",
    "Mão / cầu sứ",
    "Mất răng",
    "Răng mọc lệch",
    "Răng ngầm",
];

// Tooth surfaces of the exam chart, in the order of the design.
export const EXAM_TOOTH_SURFACES = [
    { code: "M", label: "gần" },
    { code: "O", label: "nhai" },
    { code: "D", label: "xa" },
    { code: "B", label: "ngoài" },
    { code: "L", label: "trong" },
];

// X-ray order statuses: sent to the technician, image taken, image reviewed by the doctor.
export const XRAY_STATUS = {
    requested: { label: "Chờ chụp", badge: "badge-neutral" },
    captured: { label: "Chờ đọc kết quả", badge: "badge-info" },
    reviewed: { label: "Đã xem", badge: "badge-success" },
};

// Doctor review of an X-ray result ("Duyệt kết quả chụp").
export const IMAGING_REVIEW_STATUS = {
    pending: { label: "Chờ duyệt", badge: "badge-warning" },
    retake: { label: "Cần chụp lại", badge: "badge-danger" },
    approved: { label: "Đã duyệt", badge: "badge-success" },
    cancelled: { label: "Đã huỷ", badge: "badge-neutral" },
};

export const XRAY_TYPES = [
    "Panorama",
    "Cephalometric",
    "Chụp ống tủy",
    "Chụp chỉnh nha 3D",
    "Chụp mặt thẳng (AP)",
    "Chụp khớp thái dương hàm (TMJ)",
    "Chụp khảo sát và giả định đặt Implant",
    "Chụp Cone beam CT hàm trên",
    "Chụp Cone beam CT hàm dưới",
    "Chụp Cone beam CT hai hàm",
    "Chụp CT xoang hàm mặt",
];

// Step 3 "Lập kế hoạch điều trị": status of a planned service and of one of its sessions.
export const PLAN_SERVICE_STATUS = {
    notStarted: { label: "Chưa bắt đầu", badge: "badge-neutral" },
    inProgress: { label: "Đang điều trị", badge: "badge-info" },
    done: { label: "Hoàn thành", badge: "badge-success" },
};

export const PLAN_SESSION_STATUS = {
    pending: { label: "Chưa thực hiện", badge: "badge-neutral" },
    done: { label: "Đã thực hiện", badge: "badge-success" },
};

// ICD-10 codes the doctor picks from in "Chẩn đoán xác định" (dental chapter K00–K08, plus tooth fracture).
export const ICD10_DENTAL = [
    { code: "K01.1", name: "Răng ngầm" },
    { code: "K02.0", name: "Sâu men răng" },
    { code: "K02.1", name: "Sâu ngà răng" },
    { code: "K02.2", name: "Sâu xê măng" },
    { code: "K02.3", name: "Sâu răng ngưng tiến triển" },
    { code: "K03.0", name: "Mòn răng sinh lý quá mức" },
    { code: "K03.1", name: "Mòn răng cơ học (mòn cổ răng)" },
    { code: "K03.6", name: "Cặn bám trên răng" },
    { code: "K04.0", name: "Viêm tủy răng" },
    { code: "K04.1", name: "Hoại tử tủy răng" },
    { code: "K04.4", name: "Viêm quanh chóp cấp" },
    { code: "K04.5", name: "Viêm quanh chóp mạn" },
    { code: "K05.0", name: "Viêm lợi cấp" },
    { code: "K05.1", name: "Viêm lợi mạn" },
    { code: "K05.3", name: "Viêm nha chu mạn" },
    { code: "K07.3", name: "Bất thường vị trí răng" },
    { code: "K08.1", name: "Mất răng do nhổ, tai nạn hoặc bệnh nha chu" },
    { code: "S02.5", name: "Gãy răng" },
];

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

export const PAYMENT_HISTORY_STATUS = {
    paid: { label: "Đã thanh toán đủ", badge: "badge-success" },
    partial: { label: "Thanh toán một phần", badge: "badge-warning" },
    unpaid: { label: "Chưa thanh toán", badge: "badge-danger" },
};

export const PAYMENT_HISTORY_STATUS_GUIDE = [
    {
        title: "Phiếu khám (thanh toán)",
        labels: PAYMENT_HISTORY_STATUS,
        items: [
            { key: "paid", meaning: "Còn lại của phiếu bằng 0.", when: "Tổng các lần thanh toán bằng tổng sau giảm giá.", patient: "Giữ phiếu, mang theo khi tái khám." },
            { key: "partial", meaning: "Đã trả một phần, còn lại trả theo đợt.", when: "Kế hoạch trả nhiều đợt (ví dụ niềng răng 3 đợt).", patient: "Xem đợt sắp tới trong Công nợ." },
            {
                key: "unpaid",
                meaning: "Phiếu đã phát sinh chi phí nhưng chưa có lần thanh toán nào.",
                when: "Sau buổi khám, chưa ghi nhận tiền.",
                patient: "Thanh toán tại quầy hoặc chuyển khoản.",
            },
        ],
    },
];

export const PAYMENT_HISTORY_TEXT = {
    TITLE: "Lịch sử thanh toán",
    DESCRIPTION: "Chi phí và các lần thanh toán theo từng phiếu khám.",
    DOCUMENT_RECEIPT: (no) => `Phiếu khám #${no} – Lịch sử thanh toán`,
    DOCUMENT_NOT_FOUND: "Không tìm thấy phiếu – Lịch sử thanh toán",
    LOADING: "Đang tải lịch sử thanh toán",
    ERROR_TITLE: "Không thể tải lịch sử thanh toán",
    ERROR_TEXT: "Đã có lỗi xảy ra, vui lòng thử lại.",
    RETRY: "Thử lại",
    EMPTY_TITLE: "Chưa có phiếu thanh toán nào",
    EMPTY_TEXT: "Sau mỗi buổi khám có phát sinh chi phí, phiếu khám chữa bệnh sẽ hiện ở đây.",
    SUM_NET: "Tổng chi phí (sau giảm giá)",
    SUM_NET_SUB: (count) => `${count} phiếu khám`,
    SUM_PAID: "Đã thanh toán",
    SUM_PAID_SUB: (count) => `${count} lần thanh toán`,
    SUM_LEFT: "Còn lại",
    SUM_LEFT_LINK: "Xem đợt thanh toán sắp tới",
    SUM_LEFT_LINK_ZERO: "Xem công nợ",
    SEARCH: "Tìm thủ thuật, chẩn đoán",
    CLEAR_SEARCH: "Xóa tìm kiếm",
    FILTER: "Lọc",
    FILTER_LABEL: "Lọc phiếu thanh toán",
    FILTER_UNIT: " lựa chọn",
    STATUS_GROUP: "Trạng thái",
    MONTH_GROUP: "Tháng",
    STATUS_HELP: "Trạng thái",
    SHOWN: (shown, total) => `Hiển thị ${shown}/${total}`,
    CHIP_STATUS: (label) => `Trạng thái: ${label}`,
    CLEAR_ALL: "Xóa tất cả",
    NO_RESULT: "Không có kết quả phù hợp",
    NO_RESULT_TEXT: "Thử bỏ bớt bộ lọc hoặc đổi từ khóa.",
    CLEAR_QUERY: "Xóa tìm kiếm và bộ lọc",
    SORT_NEW: "Mới nhất trước",
    SORT_OLD: "Cũ nhất trước",
    SORT_LEFT: "Còn lại nhiều nhất",
    SORT_NET: "Chi phí lớn nhất",
    TABLE_CAPTION: "Danh sách phiếu thanh toán",
    COL_RECEIPT: "Phiếu khám",
    COL_COST: "Chi phí",
    RECEIPT_NO: (no) => `· Phiếu #${no}`,
    VIEW: (no) => `Xem phiếu #${no}`,
    VIEWING: (no) => `Đang xem phiếu #${no}`,
    VIEW_CONTEXT: (date) => ` ngày ${date}`,
    COST: "Chi phí",
    PAID: "Đã trả",
    LEFT: "Còn lại",
    PAID_LINE: (amount) => `Đã trả ${amount}`,
    LEFT_LINE: (amount) => `Còn lại ${amount}`,
    TOTAL: (count) => `Tổng ${count} phiếu`,
    RANGE: (from, to, total) => `Hiển thị ${from}–${to} / ${total}`,
    PAGINATION: "Phân trang danh sách phiếu",
    RECEIPT_TITLE: (no) => `Phiếu khám #${no}`,
    MEDICAL_RECORD: "Sổ khám",
    MEDICAL_RECORD_CONTEXT: (no) => ` – xem phiếu khám #${no} trong Sổ khám bệnh`,
    NOT_FOUND_TITLE: "Không tìm thấy phiếu này",
    NOT_FOUND_TEXT: "Phiếu không tồn tại hoặc bạn không có quyền xem.",
    NOT_FOUND_STATUS: "Không tìm thấy phiếu này.",
    SHOW_LATEST: "Xem phiếu mới nhất",
    CLINIC: "NHA KHOA OZE",
    CLINIC_MARK: "O",
    CLINIC_PHONE: (phone) => `ĐT: ${phone}`,
    PAPER_TITLE: "PHIẾU KHÁM CHỮA BỆNH",
    PAPER_DATE: "Ngày khám: ",
    NAME: "Họ tên",
    BIRTH_GENDER: "Năm sinh · Giới",
    PHONE: "Điện thoại",
    ADDRESS: "Địa chỉ",
    DIAGNOSIS: "Chẩn đoán",
    REASON: "Lý do khám",
    REMAIN_ALL: "Tổng chi phí còn lại",
    COL_PROCEDURE: "Tên thủ thuật",
    COL_DETAIL: "Nội dung thủ thuật",
    COL_QUANTITY: "SL",
    COL_UNIT_PRICE: "Đ.giá",
    COL_DISCOUNT: "Giảm",
    COL_LINE_TOTAL: "T.toán",
    LINE_META: (quantity, unitPrice, discount) => `SL ${quantity} · Đ.giá ${unitPrice} · Giảm ${discount}`,
    GROSS: "Tổng phải thanh toán",
    DISCOUNT: "Tổng giảm giá",
    NET: "Tổng sau giảm giá",
    PAID_TOTAL: "Đã thanh toán",
    LEFT_TOTAL: "Còn lại",
    APPOINTMENT: "LỊCH HẸN",
    PAYMENTS: "LỊCH SỬ THANH TOÁN",
    COL_DATE: "Ngày",
    COL_PAYER: "Người thanh toán",
    COL_METHOD: "Hình thức",
    COL_AMOUNT: "Số tiền",
    PAYER_METHOD: (payer, method) => `${payer} · ${method}`,
    NO_PAYMENT: "Chưa có lần thanh toán nào cho phiếu này.",
    DOCTOR_SIGN: "Bác sĩ khám bệnh",
    FOOT_REVISIT: "Lần sau tái khám quý khách vui lòng mang theo phiếu khám bệnh này.",
    FOOT_DEPOSIT: "Tiền cọc không hoàn lại. Chỉ quy đổi sang dịch vụ khác.",
    NO_REFUND: "Không có yêu cầu hoàn tiền nào cho phiếu này.",
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
    SERVICE_HELP: "Chọn dịch vụ; dịch vụ có nhiều loại thì chọn đúng một loại, rồi bấm Thêm dịch vụ. Có thể thêm nhiều dịch vụ khác nhau.",
    SERVICE_SELECT: "Dịch vụ cần khám",
    SERVICE_PLACEHOLDER: "Chọn dịch vụ",
    VARIANT_SELECT: "Loại của dịch vụ",
    VARIANT_NEED_SERVICE: "Chọn dịch vụ trước",
    VARIANT_NOT_NEEDED: "Không cần chọn loại",
    VARIANT_PLACEHOLDER: "Chọn loại",
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

export const REFUND_REQUEST_TEXT = {
    TITLE: "Yêu cầu hoàn tiền",
    DESCRIPTION: "Các yêu cầu bạn đã gửi và tình trạng xử lý của từng yêu cầu.",
    DOCUMENT_DETAIL: (code) => `Yêu cầu ${code} – Yêu cầu hoàn tiền`,
    DOCUMENT_NOT_FOUND: "Không tìm thấy yêu cầu – Yêu cầu hoàn tiền",
    LOADING: "Đang tải yêu cầu hoàn tiền",
    CREATE: "Gửi yêu cầu hoàn tiền",
    ERROR_TITLE: "Không tải được yêu cầu hoàn tiền",
    ERROR_TEXT: "Vui lòng thử lại sau ít phút.",
    RETRY: "Thử lại",
    EMPTY_TITLE: "Bạn chưa gửi yêu cầu hoàn tiền nào",
    EMPTY_TEXT: "Yêu cầu hoàn tiền gắn với một phiếu thanh toán đã trả.",
    NO_RESULT: "Không tìm thấy yêu cầu phù hợp",
    NO_RESULT_TEXT: "Thử đổi từ khóa hoặc bộ lọc.",
    CLEAR_QUERY: "Xóa tìm kiếm và bộ lọc",
    SEARCH: "Tìm mã, lý do, giai đoạn",
    CLEAR_SEARCH: "Xóa tìm kiếm",
    FILTER: "Lọc",
    FILTER_UNIT: " bộ lọc đang chọn",
    FILTER_LABEL: "Lọc yêu cầu hoàn tiền",
    STATUS_GROUP: "Trạng thái",
    SORT_NEW: "Mới gửi trước",
    SORT_OLD: "Gửi lâu nhất trước",
    SORT_AMOUNT: "Số tiền lớn nhất",
    STATUS_HELP: "Trạng thái",
    CHIP_STATUS: (label) => `Trạng thái: ${label}`,
    SHOWN: (shown, total) => `Hiển thị ${shown}/${total}`,
    CLEAR_ALL: "Xóa tất cả",
    TABLE_CAPTION: "Danh sách yêu cầu hoàn tiền",
    COL_CODE: "Mã",
    COL_CREATED: "Ngày gửi",
    COL_FOR: "Hoàn cho",
    COL_PAID_AT: "Ngày thanh toán",
    COL_DOCTOR: "Bác sĩ phụ trách",
    COL_AMOUNT: "Số tiền",
    COL_STATUS: "Trạng thái",
    COL_ACTION: "Thao tác",
    VIEW_LABEL: (code) => `Xem yêu cầu ${code}`,
    VIEW_DETAIL: "Xem chi tiết",
    VIEW_CONTEXT: (code) => `yêu cầu ${code}`,
    RANGE: (from, to, total) => `Hiển thị ${from}–${to} / ${total} yêu cầu`,
    PAGINATION: "Phân trang yêu cầu hoàn tiền",
    NO_VALUE: "—",
    DETAIL_TITLE: (code) => `Yêu cầu ${code}`,
    DETAIL_SENT: (time) => `Gửi ${time}`,
    FOR: "Hoàn cho",
    PAID_AT: "Ngày thanh toán",
    DOCTOR: "Bác sĩ phụ trách",
    AMOUNT: "Số tiền yêu cầu",
    REASON: "Lý do",
    PROCESS: "Quá trình xử lý",
    STEP_SENT: "Gửi yêu cầu",
    STEP_REVIEW: "Quản lý xem xét",
    STEP_REFUND: "Hoàn tiền",
    STEP_STATE: { done: "Đã xong", current: "Đang thực hiện", error: "Không thành công", todo: "Chưa tới" },
    SENT_TEXT: "Phòng khám đã nhận yêu cầu của bạn.",
    REVIEWING: "Đang xem xét",
    REVIEWING_TEXT: "Quản lý phòng khám đang kiểm tra phiếu thanh toán và lý do.",
    REJECTED_TEXT: (reason) => `Từ chối: ${reason}`,
    APPROVED_TEXT: (amount) => `Đã duyệt hoàn ${amount}.`,
    WAIT_REFUND: "Chờ hoàn tiền",
    WAIT_REFUND_TEXT: "Lễ tân sẽ liên hệ để hoàn tiền cho bạn.",
    REFUNDED_TEXT: (amount, method) => `Đã hoàn ${amount}${method ? ` · ${method}` : ""}.`,
    NOT_DONE: "Không thực hiện.",
    AFTER_APPROVE: "Thực hiện sau khi được duyệt.",
    NOT_FOUND_TITLE: "Không tìm thấy yêu cầu",
    NOT_FOUND_TEXT: (code) => `Yêu cầu ${code} không có trong danh sách của bạn.`,
    CLOSE: "Đóng",
    CREATE_TITLE: "Gửi yêu cầu hoàn tiền",
    INVOICE: "Phiếu thanh toán",
    INVOICE_PLACEHOLDER: "Chọn phiếu đã thanh toán",
    INVOICE_OPTION: (date, stage, items, max) => `${date} · ${stage ? `${stage} · ` : ""}${items} · tối đa ${max}`,
    AMOUNT_LABEL: "Số tiền muốn hoàn (₫)",
    AMOUNT_PLACEHOLDER: (max) => `Tối đa ${max}`,
    AMOUNT_PLACEHOLDER_EMPTY: "Chọn phiếu trước",
    AMOUNT_HINT: (max, paid, held) => `Tối đa ${max} (đã trả ${paid}${held ? `, trừ ${held} đã yêu cầu` : ""}).`,
    REASON_LABEL: "Lý do",
    REASON_PLACEHOLDER: "Ví dụ: bị thu trùng phí chụp X-quang",
    REASON_COUNT: (count, max) => `${count}/${max}`,
    NOTICE: "Quản lý phòng khám sẽ xem xét và duyệt hoặc từ chối. Tiền cọc không hoàn lại, chỉ quy đổi sang dịch vụ khác.",
    CANCEL: "Hủy",
    SUBMIT: "Gửi yêu cầu",
    SENDING: "Đang gửi…",
    INVOICES_ERROR: "Không tải được danh sách phiếu.",
    INVOICES_EMPTY_TITLE: "Chưa có phiếu nào có thể hoàn tiền",
    INVOICES_EMPTY_TEXT: "Phiếu đã thanh toán đủ điều kiện sẽ hiện ở đây.",
    ERR_INVOICE: "Vui lòng chọn phiếu thanh toán.",
    ERR_AMOUNT: "Vui lòng nhập số tiền lớn hơn 0.",
    ERR_AMOUNT_MAX: (max) => `Số tiền không được vượt quá ${max}.`,
    ERR_REASON: "Vui lòng nhập lý do.",
    ERR_OPEN_REQUEST: "Phiếu này đang có yêu cầu chờ duyệt.",
    ERR_NOT_ELIGIBLE: "Phiếu này không còn đủ điều kiện hoàn tiền. Vui lòng chọn phiếu khác.",
    SHOWN_STATUS: (shown, total) => `Hiển thị ${shown}/${total} yêu cầu.`,
    NO_RESULT_STATUS: "Không tìm thấy yêu cầu phù hợp.",
    NOT_FOUND_STATUS: (code) => `Không tìm thấy yêu cầu ${code}.`,
    CREATED_STATUS: (code) => `Đã gửi yêu cầu ${code}.`,
    CREATED_TOAST: (code) => `Đã gửi yêu cầu ${code}. Quản lý phòng khám sẽ xem xét.`,
    CREATED_TOAST_NO_CODE: "Đã gửi yêu cầu. Quản lý phòng khám sẽ xem xét.",
};

export const REFUND_REQUEST_STATUS_GUIDE = [
    {
        title: "Yêu cầu hoàn tiền",
        items: [
            { key: "pending", meaning: "Phòng khám đã nhận, quản lý đang xem xét.", when: "Bệnh nhân gửi yêu cầu.", patient: "Chờ kết quả, có thể gọi phòng khám." },
            { key: "approved", meaning: "Quản lý đồng ý hoàn tiền, chưa hoàn.", when: "Quản lý duyệt.", patient: "Chờ lễ tân liên hệ hoàn tiền." },
            { key: "rejected", meaning: "Yêu cầu không được chấp nhận, kèm lý do.", when: "Quản lý từ chối.", patient: "Xem lý do; gọi phòng khám nếu cần trao đổi." },
            { key: "refunded", meaning: "Đã hoàn tiền cho bạn.", when: "Lễ tân hoàn tiền sau khi được duyệt.", patient: "Kiểm tra số tiền đã nhận." },
        ],
    },
];

export const REFUND_REQUEST_ADMIN_TEXT = {
    AMOUNT: "Số tiền yêu cầu",
};
