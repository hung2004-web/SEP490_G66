import { displayText } from "@/utils/medicalRecord";
import { Link } from "react-router-dom";
import { ChevronDown, Lock } from "lucide-react";
import { cx } from "@/utils/cx";
import { CLINIC_HOTLINE, CLINIC_HOTLINES_TEXT } from "@/utils/messages";
import { ROUTES } from "@/utils/routes";

const HistorySection = ({ item, collapsed, onToggle }) => (
    <div className="overflow-hidden rounded-lg border border-border">
        <button
            type="button"
            aria-expanded={!collapsed}
            className="flex w-full items-center gap-2.5 bg-surface-tint px-3.5 py-2.5 text-left outline-none focus-visible:shadow-focus"
            onClick={onToggle}
        >
            <span className="flex-1 text-caption font-bold uppercase tracking-wide text-body">{displayText(item.title)}</span>
            {typeof item.badge === "string" && item.badge && <span className="badge badge-success">{item.badge}</span>}
            <ChevronDown className={cx("size-4 text-muted transition-transform", !collapsed && "rotate-180")} aria-hidden="true" />
        </button>
        {!collapsed && (
            <div className="border-t border-border px-3.5 py-3">
                <p className="font-semibold text-ink">{displayText(item.text)}</p>
                <p className="mb-1 text-caption text-muted">{displayText(item.by)}</p>
            </div>
        )}
    </div>
);

const MedicalHistoryPanel = ({ history, collapsed, onToggle }) => (
    <div className="flex flex-col gap-4 xl:grid xl:grid-cols-3 xl:items-start">
        <section className="card-app p-0 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 className="card-title">Tiền sử (bác sĩ ghi nhận)</h2>
                <span className="badge badge-neutral">
                    <Lock className="size-3" aria-hidden="true" />
                    Chỉ xem
                </span>
            </div>
            <div className="flex flex-col gap-2.5 p-5">
                {history.map((item, index) => {
                    const key = item.key ?? String(index);
                    return <HistorySection key={key} item={item} collapsed={collapsed[key] === true} onToggle={() => onToggle(key)} />;
                })}
            </div>
        </section>
        <section className="card-app p-0">
            <div className="border-b border-border px-5 py-4">
                <h2 className="card-title">Thông tin chưa đúng?</h2>
            </div>
            <p className="p-5 text-body-sm">
                Báo bác sĩ ở lần khám tới hoặc gọi{" "}
                <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="font-semibold text-primary hover:underline">
                    {CLINIC_HOTLINES_TEXT}
                </a>
                . Thông tin hành chính (họ tên, ngày sinh, địa chỉ, người nhà) xem và sửa ở{" "}
                <Link to={ROUTES.PROFILE} className="font-semibold text-primary hover:underline">
                    Hồ sơ cá nhân
                </Link>
                .
            </p>
        </section>
    </div>
);

export default MedicalHistoryPanel;
