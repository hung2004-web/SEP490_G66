import Avatar from "@/components/ui/Avatar";

// Table cell for a person: initial avatar, name, and a second line (email, phone...).
const PersonCell = ({ name, detail }) => (
    <div className="flex items-center gap-3">
        <Avatar fullName={name} className="avatar-soft" />
        <div className="min-w-0">
            <p className="truncate text-label text-ink">{name}</p>
            {detail && <p className="truncate text-caption text-muted">{detail}</p>}
        </div>
    </div>
);

export default PersonCell;
