import { QUEUE_STATUS } from "./messages";

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
