import AllergyAlert from "./AllergyAlert";
import IntakeSummary from "./IntakeSummary";

// "Khám" tab before the exam starts (patient called, not yet in the room).
// intake: { allergies, reason, conditions, checkInAt, appointmentTime }.
const ExamPreStart = ({ intake = {} }) => (
    <section aria-label="Thông tin tiếp đón" className="card-app flex flex-col gap-4 p-5">
        <AllergyAlert allergies={intake.allergies} />
        <IntakeSummary reason={intake.reason} conditions={intake.conditions} checkInAt={intake.checkInAt} appointmentTime={intake.appointmentTime} />
        <p className="text-caption text-muted">Khi bệnh nhân vào phòng, bấm "Bắt đầu khám" ở hàng chờ để mở quy trình khám.</p>
    </section>
);

export default ExamPreStart;
