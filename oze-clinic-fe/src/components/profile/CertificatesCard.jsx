import { useRef, useState } from "react";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { deleteCertificate, saveCertificate } from "@/services/profileService";
import { cx } from "@/utils/cx";
import { isRequiredEmpty, requiredMessage } from "@/utils/validation";

const EXPIRING_SOON_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const TEXT_MAX = 200;
const EMPTY_CERTIFICATE = { name: "", issuer: "", number: "", issuedAt: "", expiresAt: "" };
const ICON_BUTTON_CLASS = "btn btn-icon size-8 hover:bg-surface-tint";

// Local date as YYYY-MM-DD, the format of <input type="date">.
const today = () => new Date().toLocaleDateString("en-CA");

// "2020-06-15" -> "15/06/2020"
const formatDate = (value) => (value ? value.split("-").reverse().join("/") : "");

const getValidity = (expiresAt) => {
    if (!expiresAt) return { label: "Không thời hạn", badge: "badge-success" };
    const daysLeft = (Date.parse(expiresAt) - Date.parse(today())) / DAY_MS;
    if (daysLeft < 0) return { label: "Hết hạn", badge: "badge-danger" };
    if (daysLeft <= EXPIRING_SOON_DAYS) return { label: "Sắp hết hạn", badge: "badge-warning" };
    return { label: "Còn hiệu lực", badge: "badge-success" };
};

const validate = (values) => {
    const errors = {};
    if (isRequiredEmpty(values.name)) errors.name = requiredMessage("tên chứng chỉ");
    if (isRequiredEmpty(values.issuer)) errors.issuer = requiredMessage("nơi cấp");
    if (isRequiredEmpty(values.number)) errors.number = requiredMessage("số chứng chỉ");
    if (!values.issuedAt) errors.issuedAt = requiredMessage("ngày cấp");
    else if (values.issuedAt > today()) errors.issuedAt = "Ngày cấp không được lớn hơn ngày hiện tại.";
    if (values.expiresAt && values.issuedAt && values.expiresAt <= values.issuedAt) {
        errors.expiresAt = "Ngày hết hạn phải sau ngày cấp.";
    }
    return errors;
};

const CertificateModal = ({ certificate, onClose, onSaved }) => {
    const editing = Boolean(certificate);
    const [values, setValues] = useState(certificate ?? EMPTY_CERTIFICATE);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fieldProps = (name) => ({
        id: `certificate-${name}`,
        name,
        value: values[name],
        "aria-invalid": Boolean(errors[name]),
        "aria-describedby": errors[name] ? `certificate-${name}-error` : undefined,
        onChange: (event) => {
            setValues((current) => ({ ...current, [name]: event.target.value }));
            setErrors((current) => ({ ...current, [name]: undefined }));
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
        const nextErrors = validate(trimmed);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }

        setSaving(true);
        const result = await saveCertificate(trimmed);
        setSaving(false);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.success(result.message);
        onSaved(result.data);
    };

    return (
        <Modal title={editing ? "Chỉnh sửa chứng chỉ" : "Thêm chứng chỉ"} onClose={onClose} closeDisabled={saving}>
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <FormField id="certificate-name" label="Tên chứng chỉ" required error={errors.name}>
                    <input {...fieldProps("name")} className="input" maxLength={TEXT_MAX} placeholder="VD: Chứng chỉ hành nghề khám bệnh, chữa bệnh" />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="certificate-issuer" label="Nơi cấp" required error={errors.issuer}>
                        <input {...fieldProps("issuer")} className="input" maxLength={TEXT_MAX} placeholder="VD: Sở Y tế Hà Nội" />
                    </FormField>
                    <FormField id="certificate-number" label="Số chứng chỉ" required error={errors.number}>
                        <input {...fieldProps("number")} className="input" maxLength={50} placeholder="VD: 012345/HNO-CCHN" />
                    </FormField>
                    <FormField id="certificate-issuedAt" label="Ngày cấp" required error={errors.issuedAt}>
                        <input {...fieldProps("issuedAt")} type="date" className="input" max={today()} />
                    </FormField>
                    <FormField id="certificate-expiresAt" label="Ngày hết hạn" error={errors.expiresAt}>
                        <input {...fieldProps("expiresAt")} type="date" className="input" min={values.issuedAt || undefined} />
                    </FormField>
                </div>
                <p className="help-text">Để trống ngày hết hạn nếu chứng chỉ không có thời hạn.</p>
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        {editing ? "Lưu thay đổi" : "Thêm chứng chỉ"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const DeleteCertificateModal = ({ certificate, onClose, onDeleted }) => {
    const cancelRef = useRef(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        const result = await deleteCertificate(certificate.id);
        setDeleting(false);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.success(result.message);
        onDeleted(result.data);
    };

    return (
        <Modal size="sm" title="Xoá chứng chỉ?" onClose={onClose} initialFocusRef={cancelRef} closeDisabled={deleting}>
            <p className="mt-3">
                Chứng chỉ <strong className="text-ink">{certificate.name}</strong> sẽ bị xoá khỏi hồ sơ của bạn.
            </p>
            <div className="modal-actions">
                <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={deleting} onClick={onClose}>
                    Hủy
                </button>
                <button type="button" className="btn btn-danger" disabled={deleting} onClick={handleDelete}>
                    {deleting && <span className="btn-spinner" aria-hidden="true" />}
                    Xoá
                </button>
            </div>
        </Modal>
    );
};

// Doctor only: practising certificates and training certificates, with their validity.
const CertificatesCard = ({ certificates, onChange }) => {
    const [dialog, setDialog] = useState(null);

    const handleSaved = (profile) => {
        setDialog(null);
        onChange(profile);
    };

    return (
        <section aria-labelledby="certificates-title" className="card-app p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 id="certificates-title" className="card-title">
                    Chứng chỉ hành nghề
                </h2>
                <button type="button" className="btn btn-link gap-1 text-label" onClick={() => setDialog({ kind: "form", certificate: null })}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Thêm chứng chỉ
                </button>
            </div>

            {certificates.length === 0 ? (
                <div className="empty-state">
                    <Award className="empty-state-icon" aria-hidden="true" />
                    <p className="empty-state-title">Chưa có chứng chỉ nào</p>
                    <p className="empty-state-text">Thêm chứng chỉ để bệnh nhân và phòng khám tra cứu.</p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {certificates.map((certificate) => {
                        const validity = getValidity(certificate.expiresAt);
                        return (
                            <li key={certificate.id} className="flex gap-3 px-5 py-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-label text-ink">{certificate.name}</p>
                                    <p className="mt-0.5 text-caption text-muted">
                                        {certificate.issuer} · Số <span className="num">{certificate.number}</span>
                                    </p>
                                    <p className="num mt-0.5 text-caption text-muted">
                                        Cấp ngày {formatDate(certificate.issuedAt)}
                                        {certificate.expiresAt && ` · Hết hạn ${formatDate(certificate.expiresAt)}`}
                                    </p>
                                    <span className={cx("badge mt-2", validity.badge)}>{validity.label}</span>
                                </div>
                                <div className="flex shrink-0 items-start gap-1">
                                    <button
                                        type="button"
                                        className={ICON_BUTTON_CLASS}
                                        aria-label={`Chỉnh sửa ${certificate.name}`}
                                        title="Chỉnh sửa"
                                        onClick={() => setDialog({ kind: "form", certificate })}
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className={cx(ICON_BUTTON_CLASS, "hover:text-danger")}
                                        aria-label={`Xoá ${certificate.name}`}
                                        title="Xoá"
                                        onClick={() => setDialog({ kind: "delete", certificate })}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {dialog?.kind === "form" && (
                <CertificateModal certificate={dialog.certificate} onClose={() => setDialog(null)} onSaved={handleSaved} />
            )}
            {dialog?.kind === "delete" && (
                <DeleteCertificateModal certificate={dialog.certificate} onClose={() => setDialog(null)} onDeleted={handleSaved} />
            )}
        </section>
    );
};

export default CertificatesCard;
