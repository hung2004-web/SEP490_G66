import DashboardSection from "@/components/dashboard/DashboardSection";

const AppointmentQueueCard = ({ queueNumber, roomName }) => (
    <DashboardSection id="appointment-queue" title="Số thứ tự của bạn">
        <div>
            <p className="num font-heading text-display-lg text-ink">
                <span className="sr-only">Số thứ tự </span>
                {queueNumber}
            </p>
            {roomName && <p className="text-body-sm text-muted">{roomName}</p>}
        </div>
    </DashboardSection>
);

export default AppointmentQueueCard;
