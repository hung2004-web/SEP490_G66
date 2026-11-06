import { displayText } from "@/utils/medicalRecord";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";

const VALUE_CLASS = "font-medium text-ink";

const InfoList = ({ rows, className }) => (
    <dl className={cx("flex flex-col gap-1.5 text-body-sm", className)}>
        {rows.map(([label, value, valueClass]) => (
            <div key={label} className="flex gap-2.5">
                <dt className="w-24 shrink-0 text-muted sm:w-30">{label}</dt>
                <dd className={cx("min-w-0", valueClass ?? VALUE_CLASS)}>{displayText(value)}</dd>
            </div>
        ))}
    </dl>
);

const startTime = (time) => displayText(time).split(" ")[0];

const ExaminationSheet = ({ visit, clinic, profile, patient }) => (
    <section className="card-app p-5">
        <div className="rounded-lg border border-border px-4.5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
                <b className="text-ink">{displayText(clinic.name).toUpperCase()}</b>
                <span className="text-caption">
                    Mã hồ sơ: <b className="num">{displayText(visit.code)}</b>
                </span>
            </div>
            <p className="mb-3.5 mt-2.5 text-center font-heading text-heading-3 font-bold tracking-wider text-ink">PHIẾU KHÁM BỆNH</p>
            <InfoList
                rows={[
                    ["Họ và tên", displayText(profile.name).toUpperCase(), "font-semibold text-ink"],
                    ["Giới tính", profile.gender],
                    ["Ngày sinh", profile.dob, `num ${VALUE_CLASS}`],
                    ["Địa chỉ", profile.addr],
                    ["Điện thoại", profile.phone, `num ${VALUE_CLASS}`],
                ]}
            />
            <div className="my-3 border-t border-dashed border-border" />
            <div className="flex items-start gap-4">
                <InfoList
                    className="flex-1"
                    rows={[
                        ["Bác sĩ", visit.doctor, "font-semibold text-ink"],
                        ["Dịch vụ", visit.service],
                        ["Đơn giá", Number.isFinite(visit.fee) ? formatCurrency(visit.fee) : "—", `num ${VALUE_CLASS}`],
                        ["Thời gian", `${startTime(visit.time)} ngày ${displayText(visit.date)}`, `num ${VALUE_CLASS}`],
                        ["Người tiếp đón", visit.recep],
                    ]}
                />
                <div className="min-w-18 rounded-lg border border-border px-2.5 py-1.5 text-center">
                    <span className="block text-caption font-bold tracking-wide text-muted">STT</span>
                    <b className="num text-stat leading-tight text-ink">{displayText(visit.stt)}</b>
                </div>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <p className="mb-1.5 text-caption text-muted">Bác sĩ ghi</p>
            <div className="flex flex-col gap-1 rounded-md bg-surface-tint px-3 py-2.5 text-body-sm">
                <p>{displayText(visit.diag)}</p>
                {visit.done.map((item, index) => (
                    <p key={index}>{item}</p>
                ))}
                <p>Hẹn: {displayText(visit.next?.text)}</p>
            </div>
            <p className="mt-3 text-right text-caption">
                Mã NB: <b className="num">{displayText(patient.code)}</b>
            </p>
        </div>
    </section>
);

export default ExaminationSheet;
