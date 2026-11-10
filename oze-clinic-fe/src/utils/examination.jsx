import { ICD10_DENTAL, QUEUE_STATUS } from "./messages";

// Queue number box colours: amber while the patient is called, blue when selected otherwise (e.g. being examined).
export const queueNumberTone = (status, selected) => {
    if (!selected) return "bg-surface-muted text-ink";
    return status === QUEUE_STATUS.CALLED ? "bg-warning text-on-primary" : "bg-primary text-on-primary";
};

// Only one patient can be called in or examined at a time.
export const isQueueBusy = (items) => items.some((item) => item.status === QUEUE_STATUS.CALLED || item.status === QUEUE_STATUS.IN_EXAMINATION);

const pad = (value) => String(value).padStart(2, "0");

// 754 s -> "12:34", 3723 s -> "1:02:03"
export const formatElapsed = (totalSeconds) => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = `${pad(minutes)}:${pad(seconds % 60)}`;
    return hours > 0 ? `${hours}:${rest}` : rest;
};

// "09:12" from a timestamp (ms).
export const formatClockTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Exam chart rows (FDI numbers), each split at the midline: [patient's right half, left half].
export const ADULT_CHART = {
    upper: [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]],
    lower: [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]],
};

export const CHILD_CHART = {
    upper: [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]],
    lower: [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]],
};

// Patients up to this age open on the primary-teeth chart.
export const CHILD_CHART_MAX_AGE = 12;

const PERMANENT_POSITIONS = ["", "Răng cửa giữa", "Răng cửa bên", "Răng nanh", "Răng cối nhỏ 1", "Răng cối nhỏ 2", "Răng cối lớn 1", "Răng cối lớn 2", "Răng khôn"];
const PRIMARY_POSITIONS = ["", "Răng cửa giữa sữa", "Răng cửa bên sữa", "Răng nanh sữa", "Răng cối sữa 1", "Răng cối sữa 2"];
const QUADRANTS = ["", "hàm trên phải", "hàm trên trái", "hàm dưới trái", "hàm dưới phải"];

// 11–48 (positions 1–8) or 51–85 (positions 1–5).
export const isValidToothCode = (code) => {
    if (!Number.isInteger(code)) return false;
    const quadrant = Math.floor(code / 10);
    const position = code % 10;
    if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
    if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
    return false;
};

export const isPrimaryTooth = (code) => Math.floor(code / 10) >= 5;

// 36 -> "Răng cối lớn 1 · hàm dưới trái"
export const toothLabel = (code) => {
    if (!isValidToothCode(code)) return "";
    const quadrant = Math.floor(code / 10);
    const position = code % 10;
    const name = isPrimaryTooth(code) ? PRIMARY_POSITIONS[position] : PERMANENT_POSITIONS[position];
    return `${name} · ${QUADRANTS[isPrimaryTooth(code) ? quadrant - 4 : quadrant]}`;
};

// ["O", "D"] -> "O, D"
export const surfacesText = (surfaces) => (surfaces?.length ? surfaces.join(", ") : "Cả răng");

const has = (text, ...words) => words.some((word) => text.includes(word));

// Chart colour of a free-text condition. Order matters: "Đã điều trị tủy" is not an inflamed pulp.
const conditionCategory = (condition) => {
    const text = (condition ?? "").normalize("NFC").toLocaleLowerCase("vi");
    if (has(text, "mất răng")) return "missing";
    if (has(text, "điều trị tủy", "trám bít")) return "rct";
    if (has(text, "mão", "cầu răng", "cầu sứ", "bọc sứ")) return "crown";
    if (has(text, "đã trám", "miếng trám")) return "filling";
    return "issue";
};

// Most important category of a tooth's entries: a problem to treat wins over past work.
const CATEGORY_ORDER = ["missing", "issue", "rct", "crown", "filling"];

export const toothCategory = (entries) => {
    if (entries.some((entry) => entry.replaced)) return "replaced";
    const categories = entries.map((entry) => conditionCategory(entry.condition));
    return CATEGORY_ORDER.find((category) => categories.includes(category)) ?? null;
};

export const CHART_TYPE = { ADULT: "adult", CHILD: "child" };

// "K02.1" -> "Sâu ngà răng" ("" when the code is not in the dental ICD-10 list).
export const icdName = (code) => ICD10_DENTAL.find((item) => item.code === String(code ?? "").trim().toUpperCase())?.name ?? "";
