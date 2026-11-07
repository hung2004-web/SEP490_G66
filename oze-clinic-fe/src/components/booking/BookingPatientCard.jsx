import { PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { BOOKING_IDS, avatarLetter, formatPatientLine } from "@/utils/booking";
import { BOOKING_NOTE_MAX_LENGTH, BOOKING_TEXT } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const NOTE_ID = BOOKING_IDS.NOTE;
const COUNT_ID = "booking-note-count";

const BookingPatientCard = ({ patient, note, onNoteChange, showNote }) => (
    <>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface-tint p-4">
            <span className="avatar avatar-lg avatar-soft" aria-hidden="true">
                {avatarLetter(patient.fullName)}
            </span>
            <div className="min-w-50 flex-1">
                <p className="font-heading text-heading-3 text-ink">{patient.fullName}</p>
                <p className="text-body-sm text-body">{formatPatientLine(patient)}</p>
            </div>
            <Link to={ROUTES.PROFILE} className="inline-flex min-h-control items-center gap-1.5 font-medium text-primary">
                <PencilLine className="size-3.5" aria-hidden="true" />
                {BOOKING_TEXT.UPDATE_PROFILE}
            </Link>
        </div>
        {showNote && (
            <>
                <label htmlFor={NOTE_ID} className="mt-7 mb-2.5 block font-heading text-heading-3 text-ink">
                    {BOOKING_TEXT.NOTE} <span className="font-sans text-body-sm font-normal text-muted">{BOOKING_TEXT.OPTIONAL}</span>
                </label>
                <textarea
                    id={NOTE_ID}
                    className="input placeholder:text-muted"
                    value={note}
                    maxLength={BOOKING_NOTE_MAX_LENGTH}
                    placeholder={BOOKING_TEXT.NOTE_PLACEHOLDER}
                    aria-describedby={COUNT_ID}
                    onChange={(event) => onNoteChange(event.target.value)}
                />
                <p id={COUNT_ID} className="mt-1 text-right text-caption text-muted">
                    {note.length}/{BOOKING_NOTE_MAX_LENGTH}
                </p>
            </>
        )}
    </>
);

export default BookingPatientCard;
