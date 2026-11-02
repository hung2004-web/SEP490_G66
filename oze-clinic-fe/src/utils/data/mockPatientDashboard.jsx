import { APPOINTMENT_STATUS, EXAMINATION_STATUS, PAYMENT_STATUS, PLAN_STATUS, QUEUE_STATUS, STAGE_STATUS } from "../messages";
import { parseDateOnly, toDateOnly } from "../format";

export const MOCK_DASHBOARD_PATIENT_ID = "mock-patient";

const KHOA = { doctorId: 7, doctorName: "BS. Trần Minh Khoa" };
const HA = { doctorId: 9, doctorName: "BS. Lê Thu Hà" };

export const MOCK_DOCTORS = [KHOA, HA];

const SCALING = { serviceId: 1, serviceName: "Lấy cao răng" };
const ROOT_CANAL = { serviceId: 2, serviceName: "Lấy tủy, làm sạch ống tủy răng 46" };
const CANAL_FILLING = { serviceId: 3, serviceName: "Trám bít ống tủy răng 46" };
const CROWN = { serviceId: 4, serviceName: "Bọc mão sứ răng 46" };
const CROWN_CHECK = { serviceId: 5, serviceName: "Tái khám kiểm tra mão sứ răng 46" };
const BRACES_CONSULTATION = { serviceId: 6, serviceName: "Tư vấn niềng răng" };
const GENERAL_CHECKUP = { serviceId: 7, serviceName: "Khám tổng quát" };
const TOOTH_14_FILLING = { serviceId: 8, serviceName: "Trám răng 14" };

const ACTIVE_PLAN_ID = 31;

const PATIENT_NAME = "Nguyễn Văn A";

const addDays = (today, days) => toDateOnly(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));

const shiftDate = (dateOnly, days) => addDays(parseDateOnly(dateOnly), days);

const createdAt = (date) => `${date}T10:00:00+07:00`;

const at = (date, time) => `${date}T${time}:00+07:00`;

const appointment = ({ id, date, start, end, service, doctor, status, queue = null, examinationId = null, examinationStatus = null, bookedOn = shiftDate(date, -7), checkInAt = null, startedAt = null, completedAt = null, cancelledAt = null, cancellationReason = null }) => ({
    id,
    appointmentCode: `LH000${id}`,
    patientId: 123,
    patientCode: "BN000123",
    patientName: PATIENT_NAME,
    ...doctor,
    ...service,
    appointmentType: "BOOKED",
    appointmentDate: date,
    timeSlotStart: start,
    timeSlotEnd: end,
    status,
    notes: null,
    createdAt: at(bookedOn, "10:24"),
    confirmedAt: status === APPOINTMENT_STATUS.PENDING ? null : at(bookedOn, "14:05"),
    checkInAt,
    startedAt,
    completedAt,
    cancelledAt,
    cancellationReason,
    queue,
    examinationId,
    examinationStatus,
});

const stage = ({ id, stageNumber, stageName, stageStatus, scheduledDate = null, actualDate = null }) => ({
    id,
    stageNumber,
    stageName,
    description: null,
    serviceName: stageName,
    estimatedCost: 0,
    stageStatus,
    scheduledDate,
    actualDate,
});

const withCounters = (plan) => {
    const active = plan.stages.filter((item) => item.stageStatus !== STAGE_STATUS.CANCELLED);
    const completed = active.filter((item) => item.stageStatus === STAGE_STATUS.COMPLETED).length;
    return {
        ...plan,
        totalStages: plan.stages.length,
        completedStages: completed,
        cancelledStages: plan.stages.length - active.length,
        progressPercent: active.length ? Math.round((completed / active.length) * 10000) / 100 : 0,
    };
};

export const MOCK_VISIT_SUMMARIES = {
    9002: {
        diagnosis: "Sâu răng 46 lan vào tủy (viêm tủy không hồi phục).",
        procedures: "Khám, chụp X-quang quanh chóp 46 và toàn cảnh, lấy tủy răng 46 (giai đoạn 1 của kế hoạch điều trị tủy).",
        prescription: "Ibuprofen 400mg · 1 viên × 2 lần/ngày, 3 ngày, uống sau ăn no.",
        followUp: { appointmentId: 240, purpose: "Giai đoạn 2 – Trám bít ống tủy răng 46" },
    },
    9003: {
        diagnosis: "Răng 46 sau lấy tủy, ống tủy sạch, không viêm quanh chóp.",
        procedures: "Trám bít ống tủy răng 46 (giai đoạn 2 của kế hoạch điều trị tủy).",
        prescription: null,
        followUp: { appointmentId: 245, purpose: "Giai đoạn 3 – Bọc mão sứ răng 46" },
    },
};

export const buildPatientDashboardData = (today, mode) => {
    const day = (offset) => addDays(today, offset);
    const planDone = mode === "plan-done";
    const planInvoice = mode === "plan-invoice";
    const inService = mode === "in-service";
    const pastDeadline = mode === "deadline";
    const crownDate = planDone ? day(-2) : day(0);
    const crownCheckDate = planDone ? day(-1) : day(7);

    const crownVisit = planDone
        ? { status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9004, examinationStatus: EXAMINATION_STATUS.COMPLETED }
        : {
              status: inService ? APPOINTMENT_STATUS.IN_SERVICE : APPOINTMENT_STATUS.CHECKED_IN,
              checkInAt: at(crownDate, "09:05"),
              startedAt: inService ? at(crownDate, "09:12") : null,
              queue: {
                  queueNumber: 5,
                  status: mode === "called" ? QUEUE_STATUS.CALLED : QUEUE_STATUS.WAITING,
                  roomName: "Phòng khám 2",
                  peopleAhead: mode === "next" ? 0 : 2,
              },
          };

    const crownCheckVisit = planDone
        ? { status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9005, examinationStatus: EXAMINATION_STATUS.COMPLETED }
        : { status: APPOINTMENT_STATUS.CONFIRMED };

    const scalingSlot = pastDeadline
        ? { date: day(0), start: "16:30:00", end: "17:00:00" }
        : { date: day(21), start: "14:00:00", end: "14:30:00" };

    const appointments = [
        appointment({ id: 143, date: day(-274), start: "09:00:00", end: "09:30:00", service: GENERAL_CHECKUP, doctor: HA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9009, examinationStatus: EXAMINATION_STATUS.COMPLETED }),
        appointment({ id: 160, date: day(-213), start: "09:00:00", end: "09:30:00", service: GENERAL_CHECKUP, doctor: HA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9008, examinationStatus: EXAMINATION_STATUS.COMPLETED }),
        appointment({ id: 172, date: day(-160), start: "14:00:00", end: "14:30:00", service: TOOTH_14_FILLING, doctor: HA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9007, examinationStatus: EXAMINATION_STATUS.COMPLETED }),
        appointment({ id: 186, date: day(-78), start: "09:00:00", end: "09:30:00", service: GENERAL_CHECKUP, doctor: HA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9006, examinationStatus: EXAMINATION_STATUS.COMPLETED }),
        appointment({ id: 209, date: day(-39), start: "15:00:00", end: "15:30:00", service: GENERAL_CHECKUP, doctor: HA, status: APPOINTMENT_STATUS.CANCELLED, bookedOn: day(-45), cancelledAt: at(day(-40), "08:12"), cancellationReason: "Bận việc cá nhân" }),
        appointment({ id: 218, date: day(-25), start: "10:00:00", end: "10:30:00", service: SCALING, doctor: HA, status: APPOINTMENT_STATUS.NO_SHOW }),
        appointment({ id: 231, date: day(-21), start: "08:30:00", end: "09:00:00", service: SCALING, doctor: HA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9001, examinationStatus: EXAMINATION_STATUS.COMPLETED }),
        appointment({ id: 238, date: day(-18), start: "09:00:00", end: "09:30:00", service: ROOT_CANAL, doctor: KHOA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9002, examinationStatus: EXAMINATION_STATUS.COMPLETED, checkInAt: at(day(-18), "09:04"), startedAt: at(day(-18), "09:10"), completedAt: at(day(-18), "09:28") }),
        appointment({ id: 240, date: day(-11), start: "09:00:00", end: "09:30:00", service: CANAL_FILLING, doctor: KHOA, status: APPOINTMENT_STATUS.COMPLETED, examinationId: 9003, examinationStatus: EXAMINATION_STATUS.COMPLETED, checkInAt: at(day(-11), "09:03"), startedAt: at(day(-11), "09:08"), completedAt: at(day(-11), "09:29") }),
        mode === "two-today" && appointment({ id: 244, date: day(0), start: "08:00:00", end: "08:30:00", service: BRACES_CONSULTATION, doctor: HA, status: APPOINTMENT_STATUS.PENDING }),
        appointment({ id: 245, date: crownDate, start: "09:00:00", end: "09:30:00", service: CROWN, doctor: KHOA, bookedOn: day(-3), ...crownVisit }),
        mode !== "today-only" && appointment({ id: 252, date: crownCheckDate, start: "09:00:00", end: "09:30:00", service: CROWN_CHECK, doctor: KHOA, bookedOn: day(-2), ...crownCheckVisit }),
        mode !== "today-only" && appointment({ id: 260, ...scalingSlot, service: SCALING, doctor: HA, status: APPOINTMENT_STATUS.PENDING, bookedOn: day(-1) }),
    ].filter(Boolean);

    const laterStageStatus = planDone ? STAGE_STATUS.COMPLETED : STAGE_STATUS.SCHEDULED;

    const activePlan = withCounters({
        treatmentPlanId: ACTIVE_PLAN_ID,
        planName: "Điều trị tủy và bọc mão răng 46",
        status: PLAN_STATUS.IN_PROGRESS,
        planVersion: 1,
        estimatedTotalCost: null,
        doctorName: KHOA.doctorName,
        startDate: day(-18),
        proposedAt: null,
        stages: [
            stage({ id: 311, stageNumber: 1, stageName: ROOT_CANAL.serviceName, stageStatus: STAGE_STATUS.COMPLETED, scheduledDate: day(-18), actualDate: day(-18) }),
            stage({ id: 312, stageNumber: 2, stageName: CANAL_FILLING.serviceName, stageStatus: STAGE_STATUS.COMPLETED, scheduledDate: day(-11), actualDate: day(-11) }),
            stage({ id: 313, stageNumber: 3, stageName: CROWN.serviceName, stageStatus: laterStageStatus, scheduledDate: crownDate, actualDate: planDone ? crownDate : null }),
            stage({ id: 314, stageNumber: 4, stageName: CROWN_CHECK.serviceName, stageStatus: laterStageStatus, scheduledDate: crownCheckDate, actualDate: planDone ? crownCheckDate : null }),
        ],
    });

    const proposedPlan = withCounters({
        treatmentPlanId: 37,
        planName: "Niềng răng",
        status: PLAN_STATUS.PROPOSED,
        planVersion: 1,
        estimatedTotalCost: 26000000,
        doctorName: HA.doctorName,
        startDate: null,
        proposedAt: createdAt(day(-4)),
        stages: [1, 2, 3, 4].map((stageNumber) =>
            stage({ id: 370 + stageNumber, stageNumber, stageName: `Giai đoạn ${stageNumber}`, stageStatus: STAGE_STATUS.SCHEDULED }),
        ),
    });

    const invoices = [
        {
            id: 188,
            invoiceNumber: "HD000188",
            appointmentId: planInvoice ? null : 240,
            treatmentPlanId: planInvoice ? ACTIVE_PLAN_ID : null,
            totalAmount: 1250000,
            discountAmount: 0,
            finalAmount: 1250000,
            paidAmount: 0,
            paymentStatus: PAYMENT_STATUS.UNPAID,
            createdAt: createdAt(day(-11)),
            appointmentDate: planInvoice ? null : day(-11),
            lines: [{ serviceName: "Trám bít ống tủy răng 46 (GĐ2)", amount: 1250000 }],
            payment: null,
        },
        {
            id: 172,
            invoiceNumber: "HD000172",
            appointmentId: 238,
            treatmentPlanId: null,
            totalAmount: 2200000,
            discountAmount: 0,
            finalAmount: 2200000,
            paidAmount: 2200000,
            paymentStatus: PAYMENT_STATUS.PAID,
            createdAt: createdAt(day(-18)),
            appointmentDate: day(-18),
            lines: [
                { serviceName: "Khám tổng quát & tư vấn", amount: 200000 },
                { serviceName: "X-quang quanh chóp", amount: 150000 },
                { serviceName: "X-quang toàn cảnh", amount: 350000 },
                { serviceName: "Lấy tủy răng 46 (GĐ1)", amount: 1500000 },
            ],
            payment: { paymentMethod: "CASH", paidAt: at(day(-18), "09:40"), cashierName: "Lê Thị Mai" },
        },
    ];

    return { appointments, treatmentPlans: [activePlan, proposedPlan], invoices };
};
