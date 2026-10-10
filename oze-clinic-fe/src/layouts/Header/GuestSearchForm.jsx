import { useId } from "react";
import { cx } from "../../utils/cx";
import { GUEST_HEADER_TEXT as TEXT } from "../../utils/messages";

const preventSubmit = (event) => event.preventDefault();

const GuestSearchForm = ({ compact = false, className }) => {
    const inputId = useId();

    return (
        <form role="search" className={cx("items-center gap-2", className)} onSubmit={preventSubmit}>
            <label htmlFor={inputId} className="sr-only">
                {TEXT.SEARCH_LABEL}
            </label>
            <input
                id={inputId}
                type="search"
                placeholder={TEXT.SEARCH_PLACEHOLDER}
                className={cx("input min-w-0 flex-1", compact && "h-8")}
            />
            <button type="submit" className={cx("btn btn-secondary shrink-0", compact && "h-8")}>
                {TEXT.SEARCH_BUTTON}
            </button>
        </form>
    );
};

export default GuestSearchForm;
