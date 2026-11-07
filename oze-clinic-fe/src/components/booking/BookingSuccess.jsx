import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import { BOOKING_IDS, dayText, slotRange } from "@/utils/booking";
import { BOOKING_TEXT, PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";
import BookingStateBox from "./BookingStateBox";

const Row = ({ label, children }) => (
    <>
        <dt className="text-muted sm:col-span-1">{label}</dt>
        <dd className="font-medium text-ink sm:col-span-3">{children}</dd>
    </>
);

const BookingSuccess = ({ result }) => (
    <BookingStateBox
        tone="success"
        icon={Check}
        title={BOOKING_TEXT.SUCCESS_TITLE}
        headingLevel={2}
        headingId={BOOKING_IDS.STATE_TITLE}
        action={
            <div className="flex flex-wrap justify-center gap-2.5">
                <Link to={ROUTES.APPOINTMENTS} className="btn btn-primary">
                    {BOOKING_TEXT.MY_APPOINTMENTS}
                </Link>
                <Link to={ROUTES.HOME} className="btn btn-secondary">
                    {BOOKING_TEXT.HOME}
                </Link>
            </div>
        }
    >
        <p>{BOOKING_TEXT.SUCCESS_TEXT}</p>
        <dl className="mt-4.5 grid gap-x-4 gap-y-2 rounded-lg border border-border p-4 text-left sm:grid-cols-4">
            <Row label={BOOKING_TEXT.SUCCESS_CODE}>
                <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="num">{result.code}</span>
                    <StatusBadge status={result.status} labels={PATIENT_APPOINTMENT_STATUS} />
                </span>
            </Row>
            <Row label={BOOKING_TEXT.SUCCESS_TIME}>
                <span className="num">
                    {dayText(result.date, true)} · {slotRange(result.slotStart, result.slotEnd)}
                </span>
            </Row>
            <Row label={BOOKING_TEXT.SUCCESS_DOCTOR}>{result.doctorName || BOOKING_TEXT.CLINIC_ASSIGNS}</Row>
            <Row label={BOOKING_TEXT.SUCCESS_SERVICES}>{(result.services ?? []).join("; ")}</Row>
            {result.note && <Row label={BOOKING_TEXT.SUCCESS_NOTE}>{result.note}</Row>}
        </dl>
    </BookingStateBox>
);

export default BookingSuccess;
