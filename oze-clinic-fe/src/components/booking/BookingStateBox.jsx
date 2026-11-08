import { cx } from "@/utils/cx";

const TONES = {
    info: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
};

const BookingStateBox = ({ tone = "info", icon: Icon, title, headingLevel = 3, headingId, children, action }) => {
    const Heading = `h${headingLevel}`;
    return (
        <div className="flex flex-col items-center px-3 py-8 text-center">
            <span className={cx("grid size-14 place-items-center rounded-full", TONES[tone])} aria-hidden="true">
                <Icon className="size-6.5" />
            </span>
            <Heading id={headingId} tabIndex={-1} className="section-title mt-3 mb-1.5">
                {title}
            </Heading>
            {children && <div className="mx-auto mb-4 max-w-145 text-body-sm text-body">{children}</div>}
            {action}
        </div>
    );
};

export default BookingStateBox;
