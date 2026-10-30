import { FileText } from "lucide-react";
import DashboardSection from "@/components/dashboard/DashboardSection";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, formatTime, formatWeekday, toClinicDateTime } from "@/utils/format";
import { PATIENT_APPOINTMENT_STATUS } from "@/utils/messages";

const SUMMARY_ITEMS = [
    { key: "diagnosis", label: "Chẩn đoán" },
    { key: "procedures", label: "Đã thực hiện" },
    { key: "prescription", label: "Đơn thuốc" },
];

const getFollowUpLine = (followUp) => {
    const day = [formatWeekday(followUp.appointmentDate), formatDate(followUp.appointmentDate)].filter(Boolean).join(" ");
    const when = [formatTime(followUp.timeSlotStart), day].filter(Boolean).join(", ");
    return [when, followUp.appointmentCode, followUp.doctorName].filter(Boolean).join(" · ");
};

const FollowUp = ({ purpose, followUp, now }) => {
    const slotStart = toClinicDateTime(followUp.appointmentDate, followUp.timeSlotStart);
    const line = getFollowUpLine(followUp);

    return (
        <div className="rounded-lg bg-primary-softer p-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-title text-ink">Hẹn tái khám: {purpose}</p>
                {slotStart && slotStart < now && <StatusBadge status={followUp.status} labels={PATIENT_APPOINTMENT_STATUS} />}
            </div>
            {line && <p className="num text-body-sm text-muted">{line}</p>}
        </div>
    );
};

const AppointmentResult = ({ summary, followUp, now }) => (
    <DashboardSection id="appointment-result" title="Kết quả sau khám">
        {summary ? (
            <>
                <p className="text-body-sm text-muted">Tóm tắt từ bệnh án đã được bác sĩ khóa.</p>
                <dl className="flex flex-col gap-4">
                    {SUMMARY_ITEMS.filter((item) => summary[item.key]).map((item) => (
                        <div key={item.key}>
                            <dt className="text-caption text-muted">{item.label}</dt>
                            <dd className="mt-1 text-body-md text-ink">{summary[item.key]}</dd>
                        </div>
                    ))}
                </dl>
                {followUp && summary.followUp && <FollowUp purpose={summary.followUp.purpose} followUp={followUp} now={now} />}
            </>
        ) : (
            <div className="empty-state rounded-lg bg-surface-tint">
                <FileText aria-hidden="true" className="empty-state-icon" />
                <p className="empty-state-title">Chưa có kết quả khám</p>
                <p className="empty-state-text">Tóm tắt lần khám, hóa đơn và lịch tái khám sẽ hiển thị tại đây sau khi bác sĩ hoàn tất.</p>
            </div>
        )}
    </DashboardSection>
);

export default AppointmentResult;
