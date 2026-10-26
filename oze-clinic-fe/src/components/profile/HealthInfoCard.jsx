import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "react-toastify";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { updateHealthInfo } from "@/services/profileService";

const TEXT_MAX = 500;

const FIELDS = [
    { key: "medicalHistory", label: "Tiền sử bệnh", placeholder: "VD: Viêm nướu (2024), cao huyết áp..." },
    { key: "medications", label: "Thuốc đang sử dụng", placeholder: "VD: Không" },
    { key: "specialConditions", label: "Tình trạng đặc biệt", placeholder: "VD: Đang mang thai, hút thuốc..." },
];

const Empty = () => <span className="text-placeholder">Chưa khai báo</span>;

const HealthInfoModal = ({ health, onClose, onSaved }) => {
    const [values, setValues] = useState({ ...health, allergies: health.allergies.join(", ") });
    const [saving, setSaving] = useState(false);

    const handleChange = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        const result = await updateHealthInfo({
            medicalHistory: values.medicalHistory.trim(),
            allergies: values.allergies.split(",").map((item) => item.trim()).filter(Boolean),
            medications: values.medications.trim(),
            specialConditions: values.specialConditions.trim(),
        });
        setSaving(false);
        if (!result.success) {
            toast.error(result.message);
            return;
        }
        toast.success(result.message);
        onSaved(result.data);
    };

    return (
        <Modal
            title="Khai báo thông tin sức khoẻ"
            description="Bác sĩ sẽ xem thông tin này trước mỗi lần khám."
            onClose={onClose}
            closeDisabled={saving}
        >
            <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <FormField id="health-medicalHistory" label={FIELDS[0].label}>
                    <textarea
                        id="health-medicalHistory"
                        name="medicalHistory"
                        className="input"
                        rows={3}
                        maxLength={TEXT_MAX}
                        placeholder={FIELDS[0].placeholder}
                        value={values.medicalHistory}
                        onChange={handleChange}
                    />
                </FormField>
                <FormField id="health-allergies" label="Dị ứng">
                    <input
                        id="health-allergies"
                        name="allergies"
                        className="input"
                        maxLength={TEXT_MAX}
                        placeholder="VD: Penicillin, Lidocaine"
                        value={values.allergies}
                        onChange={handleChange}
                    />
                    <p className="help-text">Cách nhau bằng dấu phẩy. Để trống nếu không dị ứng.</p>
                </FormField>
                {FIELDS.slice(1).map((field) => (
                    <FormField key={field.key} id={`health-${field.key}`} label={field.label}>
                        <input
                            id={`health-${field.key}`}
                            name={field.key}
                            className="input"
                            maxLength={TEXT_MAX}
                            placeholder={field.placeholder}
                            value={values[field.key]}
                            onChange={handleChange}
                        />
                    </FormField>
                ))}
                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving && <span className="btn-spinner" aria-hidden="true" />}
                        Lưu thông tin
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Patient only: medical history, allergies, medications and special conditions.
const HealthInfoCard = ({ health, onChange }) => {
    const [editing, setEditing] = useState(false);

    return (
        <section aria-labelledby="health-title" className="card-app p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 id="health-title" className="card-title">
                    Thông tin sức khoẻ
                </h2>
                <button type="button" className="btn btn-link gap-1 text-label" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Khai báo thay đổi
                </button>
            </div>
            <dl className="flex flex-col gap-4 px-5 py-4">
                <div>
                    <dt className="text-caption text-muted">{FIELDS[0].label}</dt>
                    <dd className="mt-1 text-ink">{health.medicalHistory || <Empty />}</dd>
                </div>
                <div>
                    <dt className="text-caption text-muted">Dị ứng</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                        {health.allergies.length > 0 ? (
                            health.allergies.map((allergy) => (
                                <span key={allergy} className="badge badge-danger">
                                    {allergy}
                                </span>
                            ))
                        ) : (
                            <span className="text-ink">Không</span>
                        )}
                    </dd>
                </div>
                {FIELDS.slice(1).map((field) => (
                    <div key={field.key}>
                        <dt className="text-caption text-muted">{field.label}</dt>
                        <dd className="mt-1 text-ink">{health[field.key] || <Empty />}</dd>
                    </div>
                ))}
            </dl>
            {editing && (
                <HealthInfoModal
                    health={health}
                    onClose={() => setEditing(false)}
                    onSaved={(profile) => {
                        setEditing(false);
                        onChange(profile);
                    }}
                />
            )}
        </section>
    );
};

export default HealthInfoCard;
