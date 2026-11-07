import { Inbox } from "lucide-react";

const RecordEmptyCard = ({ title, text, children }) => (
    <section className="card-app empty-state py-10">
        <Inbox className="mb-3 size-6 text-placeholder" aria-hidden="true" />
        <p className="empty-state-title">{title}</p>
        <p className="empty-state-text">{text}</p>
        {children}
    </section>
);

export default RecordEmptyCard;
