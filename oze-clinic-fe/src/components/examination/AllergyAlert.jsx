import { TriangleAlert } from "lucide-react";
import { cx } from "@/utils/cx";

// Red banner with the patient's drug allergies. Renders nothing when there are none.
const AllergyAlert = ({ allergies = [], className }) => {
    const list = allergies.filter(Boolean);
    if (list.length === 0) return null;

    return (
        <p className={cx("alert alert-danger items-center", className)}>
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>
                <b className="font-semibold">Dị ứng {list.join(", ")}.</b> Tránh kê thuốc nhóm này.
            </span>
        </p>
    );
};

export default AllergyAlert;
