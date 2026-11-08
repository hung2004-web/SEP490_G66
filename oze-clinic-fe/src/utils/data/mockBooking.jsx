import { MOCK_DOCTORS } from "./mockPatientDashboard";
import { MOCK_SERVICES } from "./mockService";
import { addDays, parseDateOnly, toClinicDateTime, toDateOnly } from "../format";
import { APPOINTMENT_STATUS, BOOKING_MIN_HOURS_AHEAD } from "../messages";

const HOUR_MS = 60 * 60 * 1000;
const SLOT_MINUTES = 30;
const KHOA_ID = 7;
const HA_ID = 9;
const FULL_DAY_OFFSET = 2;
const BLOCKED_DAY_OFFSET = 21;

const GENERAL_EXAM = { id: 100, name: "Khám tổng quát & tư vấn", isMandatory: true, variants: [] };

const SERVICE_VARIANTS = {
    1: [
        { id: 11, name: "Implant Hàn Quốc" },
        { id: 12, name: "Implant Thụy Sĩ" },
    ],
    2: [
        { id: 21, name: "Mắc cài kim loại" },
        { id: 22, name: "Mắc cài sứ" },
        { id: 23, name: "Khay trong suốt" },
    ],
    3: [
        { id: 31, name: "Sứ Zirconia" },
        { id: 32, name: "Sứ Emax" },
        { id: 33, name: "Dán sứ Veneers" },
    ],
    5: [
        { id: 51, name: "Tại phòng khám" },
        { id: 52, name: "Tại nhà" },
    ],
};

export const MOCK_GONE_VARIANT_ID = 22;

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;

const buildStarts = (from, to) => Array.from({ length: (to - from) / SLOT_MINUTES }, (_, index) => toTime(from + index * SLOT_MINUTES));

const SLOT_STARTS = [...buildStarts(8 * 60, 12 * 60), ...buildStarts(13 * 60 + 30, 17 * 60 + 30)];

const isMorning = (start) => toMinutes(start) < 12 * 60;

const worksAt = (doctorId, weekday, start) => {
    if (doctorId === KHOA_ID) return weekday >= 1 && weekday <= 6 && !(weekday === 3 && !isMorning(start));
    if (doctorId === HA_ID) return (weekday >= 1 && weekday <= 5) || (weekday === 0 && isMorning(start));
    return false;
};

const hash = (text) => {
    let value = 2166136261;
    for (const char of text) {
        value ^= char.charCodeAt(0);
        value = Math.imul(value, 16777619);
    }
    value ^= value >>> 15;
    value = Math.imul(value, 2246822507);
    value ^= value >>> 13;
    return value >>> 0;
};

const sessionTaken = new Set();

let bookedAppointment = null;

const shiftDate = (date, days) => toDateOnly(addDays(parseDateOnly(date), days));

const isTaken = (date, doctorId, start, today) =>
    sessionTaken.has(`${date}|${start}`) || date === shiftDate(today, FULL_DAY_OFFSET) || hash(`${date}-${doctorId}-${start}`) % 5 < 3;

const doctorsFor = (doctorId) => MOCK_DOCTORS.filter((doctor) => !doctorId || doctor.doctorId === doctorId);

export const getMockBookingServices = (goneVariantIds) => [
    GENERAL_EXAM,
    ...MOCK_SERVICES.map((service) => ({
        id: service.id,
        name: service.name,
        isMandatory: false,
        variants: (SERVICE_VARIANTS[service.id] ?? []).filter((variant) => !goneVariantIds.has(variant.id)),
    })),
];

export const getMockBookingDoctors = () => MOCK_DOCTORS.map(({ doctorId, doctorName }) => ({ doctorId, doctorName }));

const freeDoctorsAt = (date, start, doctorId, now, today) => {
    const startAt = toClinicDateTime(date, start);
    if (!startAt || startAt.getTime() - now.getTime() < BOOKING_MIN_HOURS_AHEAD * HOUR_MS) return [];
    const weekday = parseDateOnly(date).getDay();
    return doctorsFor(doctorId).filter((doctor) => worksAt(doctor.doctorId, weekday, start) && !isTaken(date, doctor.doctorId, start, today));
};

export const getMockFreeStarts = (date, doctorId, now, today) =>
    SLOT_STARTS.filter((start) => freeDoctorsAt(date, start, doctorId, now, today).length > 0);

export const getMockBookingDay = (date, doctorId, now, today) => {
    const weekday = parseDateOnly(date).getDay();
    const starts = getMockFreeStarts(date, doctorId, now, today);
    return {
        date,
        freeSlotCount: starts.length,
        isWorkingDay: doctorsFor(doctorId).some((doctor) => SLOT_STARTS.some((start) => worksAt(doctor.doctorId, weekday, start))),
        firstSlotStart: starts[0] ?? null,
    };
};

export const toMockSlotEnd = (start) => toTime(toMinutes(start) + SLOT_MINUTES);

export const markMockSlotTaken = (date, start) => sessionTaken.add(`${date}|${start}`);

export const pickMockDoctor = (date, start, doctorId, now, today) => freeDoctorsAt(date, start, doctorId, now, today)[0] ?? null;

export const getMockBookedAppointment = () => bookedAppointment;

export const saveMockBookedAppointment = (appointment) => {
    bookedAppointment = appointment;
};

export const getMockBlockingAppointment = (today) => ({
    id: null,
    code: "LH000901",
    date: shiftDate(today, BLOCKED_DAY_OFFSET),
    slotStart: "14:00:00",
    status: APPOINTMENT_STATUS.PENDING,
});
