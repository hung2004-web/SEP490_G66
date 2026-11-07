import { Receipt } from "lucide-react";

const RecordStateBox = ({ title, text, actionLabel, onAction, buttonRef }) => (
    <div className="mx-auto mt-30 flex max-w-105 flex-col items-center gap-2 rounded-xl border border-border bg-canvas p-7 text-center">
        <Receipt className="size-5.5 text-muted" aria-hidden="true" />
        <h2 className="font-heading text-heading-2 text-ink">{title}</h2>
        <p className="mb-2 text-body-sm text-muted">{text}</p>
        <button ref={buttonRef} type="button" className="btn btn-primary" onClick={onAction}>
            {actionLabel}
        </button>
    </div>
);

export default RecordStateBox;
