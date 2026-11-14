import { Plus, X } from "lucide-react";
import { BOOKING_IDS, canAddSelection, findService, isServiceFull, itemLabel } from "@/utils/booking";
import { cx } from "@/utils/cx";
import { BOOKING_TEXT } from "@/utils/messages";

const SERVICE_ID = BOOKING_IDS.SERVICE;
const VARIANT_ID = BOOKING_IDS.VARIANT;
const ADD_SERVICE_ID = BOOKING_IDS.ADD_SERVICE;
const LABEL_ID = "booking-service-label";
const HELP_ID = "booking-service-help";
const ERROR_ID = "booking-service-error";
const CHIPS_ID = "booking-service-chips";
const GONE_ID = "booking-service-gone";

const SUB_LABEL = "mb-1.5 block text-label text-body";

const toVariantPick = (value) => (value ? Number(value) : null);

const VariantOptions = ({ service }) => {
    if (!service) return <option value="">{BOOKING_TEXT.VARIANT_NEED_SERVICE}</option>;
    if (!service.variants.length) return <option value="">{BOOKING_TEXT.VARIANT_NOT_NEEDED}</option>;
    return (
        <>
            <option value="">{BOOKING_TEXT.VARIANT_PLACEHOLDER}</option>
            {service.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                    {variant.name}
                </option>
            ))}
        </>
    );
};

const BookingServicePicker = ({ services, items, pickService, pickVariant, error, goneMessages, onPickService, onPickVariant, onAdd, onRemove }) => {
    const service = findService(services, pickService);
    const hasVariants = Boolean(service?.variants.length);
    const canAdd = canAddSelection(service, pickVariant, items);
    const describedBy = [error && ERROR_ID, goneMessages.length > 0 && GONE_ID].filter(Boolean).join(" ") || undefined;

    return (
        <div role="group" aria-labelledby={LABEL_ID} aria-describedby={HELP_ID}>
            <span id={LABEL_ID} className="mt-7 mb-2.5 block font-heading text-heading-3 text-ink">
                {BOOKING_TEXT.SERVICE}
                <span className="text-danger" aria-hidden="true">
                    {" *"}
                </span>
            </span>
            <span id={HELP_ID} className="sr-only">
                {BOOKING_TEXT.SERVICE_HELP}
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="sm:min-w-0 sm:flex-1">
                    <label htmlFor={SERVICE_ID} className={SUB_LABEL}>
                        {BOOKING_TEXT.SERVICE_SELECT}
                    </label>
                    <select
                        id={SERVICE_ID}
                        className={cx("input *:text-ink", !service && "text-muted")}
                        value={pickService ?? ""}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy}
                        onChange={(event) => onPickService(event.target.value ? Number(event.target.value) : null)}
                    >
                        <option value="">{BOOKING_TEXT.SERVICE_PLACEHOLDER}</option>
                        {services.map((option) => {
                            const full = isServiceFull(option, items);
                            return (
                                <option key={option.id} value={option.id} disabled={full}>
                                    {option.name}
                                    {full && BOOKING_TEXT.CHOSEN_SUFFIX}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div className="sm:min-w-0 sm:flex-1">
                    <label htmlFor={VARIANT_ID} className={SUB_LABEL}>
                        {BOOKING_TEXT.VARIANT_SELECT}
                    </label>
                    <select
                        id={VARIANT_ID}
                        className={cx("input *:text-ink", pickVariant === null && "text-muted")}
                        value={hasVariants ? (pickVariant ?? "") : ""}
                        disabled={!hasVariants}
                        aria-describedby={error ? ERROR_ID : undefined}
                        onChange={(event) => onPickVariant(toVariantPick(event.target.value))}
                    >
                        <VariantOptions service={service} />
                    </select>
                </div>
                <div>
                    <span className={cx(SUB_LABEL, "max-sm:hidden")} aria-hidden="true">
                        &nbsp;
                    </span>
                    <button type="button" id={ADD_SERVICE_ID} className="btn btn-secondary max-sm:w-full" disabled={!canAdd} aria-describedby={error ? ERROR_ID : undefined} onClick={onAdd}>
                        <Plus className="size-4" aria-hidden="true" />
                        {BOOKING_TEXT.ADD_SERVICE}
                    </button>
                </div>
            </div>
            <p id={CHIPS_ID} className="mt-4 text-label text-body">
                {BOOKING_TEXT.CHOSEN_SERVICES}
                {items.length > 0 && <span className="font-normal text-muted"> ({items.length})</span>}
            </p>
            {items.length ? (
                <ul className="mt-2 flex flex-wrap gap-2" aria-labelledby={CHIPS_ID}>
                    {items.map((item) => {
                        const label = itemLabel(services, item);
                        return (
                            <li
                                key={`${item.serviceId}-${item.variantId}`}
                                className="inline-flex items-center gap-0.5 rounded-full border border-border-strong bg-canvas py-0.5 pr-0.5 pl-3 text-body-sm font-medium text-ink"
                            >
                                {label}
                                <button
                                    type="button"
                                    className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-muted hover:text-ink"
                                    aria-label={BOOKING_TEXT.REMOVE_SERVICE(label)}
                                    onClick={() => onRemove(item)}
                                >
                                    <X className="size-3" aria-hidden="true" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="mt-2 text-body-sm text-muted">{BOOKING_TEXT.NO_SERVICE}</p>
            )}
            {goneMessages.length > 0 && (
                <div id={GONE_ID} className="alert alert-warning mt-3 flex-col gap-1">
                        {goneMessages.map((message, index) => (
                            <p key={index}>{message}</p>
                    ))}
                </div>
            )}
            {error && (
                <p id={ERROR_ID} className="mt-2 text-body-sm font-medium text-danger">
                    {error}
                </p>
            )}
        </div>
    );
};

export default BookingServicePicker;
