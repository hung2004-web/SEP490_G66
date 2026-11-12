import api from "./api";

// Receptionist workspace calls to oze-clinic-be. Every call returns the ApiResponse body
// ({ success, message, data, errors }); a business error from the server comes back as success: false.

// Clinic date (Asia/Ho_Chi_Minh) as "yyyy-mm-dd", the same day the backend uses for ClinicClock.Today
export const clinicToday = (offsetDays = 0) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" })
        .format(new Date(Date.now() + offsetDays * 86_400_000));
    return parts;
};

export const PRIORITY = { NORMAL: 0, HIGH: 1, URGENT: 2 };

// Shared by the other staff services so every call returns the same ApiResponse shape
export const call = async (request) => {
    try {
        const response = await request();
        return response.data;
    } catch (error) {
        const body = error.response?.data;
        if (body && typeof body.success === "boolean") return body;
        // Validation errors of [ApiController] (ProblemDetails) or no response at all
        const firstError = body?.errors && Object.values(body.errors).flat()[0];
        return {
            success: false,
            message: firstError ?? (error.response ? "Yêu cầu không hợp lệ." : "Không kết nối được máy chủ. Kiểm tra backend đang chạy."),
            data: null,
            errors: null,
        };
    }
};

// ----- appointments (M3, M4) -----
export const getTodayAppointments = () =>
    call(() => api.get("/api/appointments", { params: { date: clinicToday(), pageSize: 100 } }));

export const confirmAppointment = (id) => call(() => api.post(`/api/appointments/${id}/confirm`));

export const checkInAppointment = (id, { priority, reason }) =>
    call(() => api.post(`/api/appointments/${id}/check-in`, { priority, reason: reason || null }));

export const cancelAppointment = (id, reason) => call(() => api.post(`/api/appointments/${id}/cancel`, { reason }));

// Only for a checked-in patient who left before being seen
export const markNoShow = (id) => call(() => api.post(`/api/appointments/${id}/no-show`));

export const createWalkIn = (request) => call(() => api.post("/api/appointments/walk-in", request));

export const findPatientsByKeyword = (keyword) =>
    call(() => api.get("/api/patients", { params: { searchKeyword: keyword, pageSize: 5 } }));

// ----- queue (M4) -----
export const getWaitingList = () => call(() => api.get("/api/appointments/waiting-list"));

export const setPriority = (id, { priority, reason }) =>
    call(() => api.post(`/api/appointments/${id}/priority`, { priority, reason: reason || null }));

export const getNeedsAttention = () => call(() => api.get("/api/appointments/needs-attention"));

export const reassignDoctor = (id, doctorId) => call(() => api.post(`/api/appointments/${id}/reassign-doctor`, { doctorId }));

// ----- cashier (M8) -----
// Every invoice still to collect, whatever its age (one call per open status)
export const getOpenInvoices = async () => {
    const results = await Promise.all(
        ["UNPAID", "PARTIALLY_PAID", "PENDING_CONFIRMATION"].map((paymentStatus) =>
            call(() => api.get("/api/invoices", { params: { paymentStatus, pageSize: 100, sortBy: "createdAt", sortDescending: true } })),
        ),
    );
    const failed = results.find((r) => !r.success);
    if (failed) return failed;
    return { success: true, message: null, errors: null, data: { items: results.flatMap((r) => r.data.items) } };
};

export const getInvoices = () => call(() => api.get("/api/invoices", { params: { pageSize: 50, sortBy: "createdAt", sortDescending: true } }));

export const recordPayment = (invoiceId, request) => call(() => api.post(`/api/invoices/${invoiceId}/payments`, request));

// ----- follow-up (M9, receptionist only) -----
export const getFollowUps = () =>
    call(() => api.get("/api/examinations/follow-ups", { params: { fromDate: clinicToday(), toDate: clinicToday(3), pageSize: 50 } }));

export const remindFollowUp = (examinationId) => call(() => api.post(`/api/examinations/${examinationId}/remind-follow-up`));

export const remindDueFollowUps = () => call(() => api.post("/api/examinations/follow-ups/remind-due"));

// ----- reports -----
// Confirmed collections per clinic day, cash vs transfer (at most 31 days)
export const getRevenueByDay = ({ from, to }) => call(() => api.get("/api/invoice-reports/revenue-by-day", { params: { from, to } }));

// ----- doctors on duty -----
// Doctors with a shift today: room, time and status (NotStarted, Working, Ended, OnLeave)
export const getDoctorsOnDuty = (date = clinicToday()) => call(() => api.get("/api/schedules/doctors-on-duty", { params: { date } }));

// ----- lists for the receptionist pages -----
// Appointments of a date range (or one date), newest filters on the server; pageSize up to 100
export const getAppointments = ({ fromDate, toDate, date, doctorId, status, keyword, pageSize = 100 } = {}) =>
    call(() =>
        api.get("/api/appointments", {
            params: { fromDate, toDate, date, doctorId: doctorId || undefined, status: status || undefined, searchKeyword: keyword || undefined, pageSize },
        }),
    );

export const getInvoice = (id) => call(() => api.get(`/api/invoices/${id}`));

// A bank or QR payment the receptionist has seen arrive in the account
export const confirmPayment = (paymentId) => call(() => api.post(`/api/payments/${paymentId}/confirm`));

// Free slots of one doctor on a day for the services of the appointment (ASP.NET reads repeated keys as a list)
export const getAvailableSlots = ({ date, doctorId, serviceIds = [], variantIds = [] }) => {
    const params = new URLSearchParams({ Date: date });
    if (doctorId) params.append("DoctorId", doctorId);
    serviceIds.forEach((id) => params.append("ServiceId", id));
    variantIds.forEach((id) => params.append("VariantId", id));
    return call(() => api.get(`/api/appointments/available-slots?${params}`));
};

export const rescheduleAppointment = (id, { date, slotStart, doctorId }) =>
    call(() => api.post(`/api/appointments/${id}/reschedule`, { date, slotStart, doctorId: doctorId || null }));

// ----- invoices from an examination (F-PAY-01) -----
export const createInvoice = (request) => call(() => api.post("/api/invoices", request));

// Recent invoices of every status, to know which visits already have one
export const getRecentInvoices = () => call(() => api.get("/api/invoices", { params: { pageSize: 100, sortBy: "createdAt", sortDescending: true } }));

export const getPaidInvoices = async () => {
    const results = await Promise.all(
        ["PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED"].map((paymentStatus) =>
            call(() => api.get("/api/invoices", { params: { paymentStatus, pageSize: 100, sortBy: "createdAt", sortDescending: true } })),
        ),
    );
    const failed = results.find((r) => !r.success);
    if (failed) return failed;
    return { success: true, message: null, errors: null, data: { items: results.flatMap((r) => r.data.items) } };
};

// The refund amount is worked out by the system (paid minus work done); the manager approves it
export const requestRefund = (invoiceId, reason) => call(() => api.post(`/api/invoices/${invoiceId}/refund-requests`, { reason }));

// ----- patient debts and payment reminders -----
export const getDebts = ({ keyword, overdueOnly, page = 1, pageSize = 10 } = {}) =>
    call(() => api.get("/api/debts", { params: { searchKeyword: keyword || undefined, overdueOnly: overdueOnly || undefined, pageNumber: page, pageSize } }));

export const remindPayment = (invoiceId, force = false) => call(() => api.post(`/api/debts/${invoiceId}/remind`, { force }));

export const getPaymentReminders = (invoiceId) => call(() => api.get(`/api/debts/${invoiceId}/reminders`));

// ----- follow-up care -----
export const getFollowUpList = ({ fromDate, toDate, hasAppointment, keyword, pageSize = 100 }) =>
    call(() =>
        api.get("/api/examinations/follow-ups", {
            params: { fromDate, toDate, hasAppointment, searchKeyword: keyword || undefined, pageSize },
        }),
    );

export const recordFollowUpContact = (examinationId, { outcome, note, callBackDate }) =>
    call(() => api.post(`/api/examinations/${examinationId}/follow-up/contacts`, { outcome, note: note || null, callBackDate: callBackDate || null }));

export const getFollowUpContacts = (examinationId) => call(() => api.get(`/api/examinations/${examinationId}/follow-up/contacts`));

export const scheduleFollowUpAppointment = (examinationId, { date, slotStart, doctorId }) =>
    call(() => api.post(`/api/examinations/${examinationId}/follow-up/schedule`, { date, slotStart, doctorId: doctorId || null }));

// ----- booking on behalf (F-APT-09) -----
export const getBookableServices = () => call(() => api.get("/api/appointments/bookable-services"));

// patientId for a known record, or fullName + phoneNumber (+ email) for a new one; confirmed at once
export const bookForPatient = (request) => call(() => api.post("/api/appointments/reception-booking", request));

// ----- patient records -----
export const getPatients = ({ keyword, gender, page = 1, pageSize = 10 } = {}) =>
    call(() => api.get("/api/patients", { params: { searchKeyword: keyword || undefined, gender: gender || undefined, pageNumber: page, pageSize } }));

export const getPatient = (id) => call(() => api.get(`/api/patients/${id}`));

export const createPatient = (request) => call(() => api.post("/api/patients", request));

export const updatePatient = (id, request) => call(() => api.put(`/api/patients/${id}`, request));

export const getPatientAppointments = (patientId) => call(() => api.get("/api/appointments", { params: { patientId, pageSize: 50, sortBy: "appointmentDate", sortDescending: true } }));

export const getPatientInvoices = (patientId) => call(() => api.get("/api/invoices", { params: { patientId, pageSize: 50 } }));

export const getPatientTreatmentPlans = (patientId) => call(() => api.get(`/api/patients/${patientId}/treatment-plans`));

export const approveTreatmentPlan = (planId) => call(() => api.post(`/api/treatment-plans/${planId}/approve`));

// ----- consultation requests from the public site -----
export const getConsultations = ({ status, keyword, page = 1, pageSize = 10 } = {}) =>
    call(() => api.get("/api/consultation-requests", { params: { status: status || undefined, searchKeyword: keyword || undefined, pageNumber: page, pageSize } }));

export const handleConsultation = (id, { status, note }) => call(() => api.post(`/api/consultation-requests/${id}/handle`, { status, note: note || null }));

// ----- invoice list and payment history (search by day) -----
export const searchInvoices = ({ keyword, status, fromDate, toDate, page = 1, pageSize = 15 } = {}) =>
    call(() =>
        api.get("/api/invoices", {
            params: {
                searchKeyword: keyword || undefined,
                paymentStatus: status || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                pageNumber: page,
                pageSize,
                sortBy: "createdAt",
                sortDescending: true,
            },
        }),
    );

export const getPaymentHistory = ({ keyword, method, status, fromDate, toDate, page = 1, pageSize = 15 } = {}) =>
    call(() =>
        api.get("/api/payment-history", {
            params: {
                searchKeyword: keyword || undefined,
                paymentMethod: method || undefined,
                paymentStatus: status || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                pageNumber: page,
                pageSize,
            },
        }),
    );

// Active entries of every room queue (Examination, Imaging, Treatment): WAITING, CALLED, IN_PROGRESS
export const getQueueEntries = (queueType) => call(() => api.get("/api/queues", { params: { queueType: queueType || undefined } }));
