import { Phone } from "lucide-react";
import DashboardSection from "@/components/dashboard/DashboardSection";
import { CLINIC_HOTLINE, CLINIC_OPENING_HOURS } from "@/utils/messages";

const AppointmentSupportCard = () => (
    <DashboardSection id="appointment-support" title="Cần hỗ trợ?">
        <div>
            <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="btn btn-link num">
                <Phone aria-hidden="true" className="size-4" />
                {CLINIC_HOTLINE.DISPLAY}
            </a>
            <p className="text-body-sm text-muted">{CLINIC_OPENING_HOURS}</p>
        </div>
    </DashboardSection>
);

export default AppointmentSupportCard;
