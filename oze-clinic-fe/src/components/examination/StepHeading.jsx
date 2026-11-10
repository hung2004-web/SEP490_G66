// "Bước 1/5  Bổ sung tiền sử bệnh ........ Tiếp theo: Khám & chẩn đoán"
const StepHeading = ({ index, total, title, nextLabel }) => (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1">
        <span className="num rounded-full bg-primary-soft px-2 py-0.5 text-caption font-semibold text-primary">
            Bước {index + 1}/{total}
        </span>
        <h2 className="font-heading text-heading-2 text-ink">{title}</h2>
        {nextLabel && (
            <p className="ml-auto text-caption text-muted">
                Tiếp theo: <b className="font-semibold text-ink">{nextLabel}</b>
            </p>
        )}
    </div>
);

export default StepHeading;
