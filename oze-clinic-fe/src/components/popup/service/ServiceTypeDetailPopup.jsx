import { useRef } from "react";
import Modal from "@/components/ui/Modal";
import { cx } from "@/utils/cx";

const priceFormatter = new Intl.NumberFormat("vi-VN");

// "2026-10-20" -> "20/10/2026"
const formatDate = (value) => value.split("-").reverse().join("/");

const DetailItem = ({ label, className, children }) => (
    <div className={className}>
        <dt className="text-caption text-muted">{label}</dt>
        <dd className="mt-1 text-body-sm text-ink">{children}</dd>
    </div>
);

// "Chi tiết loại dịch vụ" popup, read only. service: the service the type belongs to.
const ServiceTypeDetailPopup = ({ type, service, onClose }) => {
    const closeRef = useRef(null);

    return (
        <Modal title="Chi tiết loại dịch vụ" onClose={onClose} initialFocusRef={closeRef}>
            <div className="mt-6">
                <p className="num text-caption text-muted">{type.code}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-heading-3 text-ink">{type.name}</p>
                    <span className={cx("badge", type.isActive ? "badge-success" : "badge-neutral")}>
                        {type.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
                <DetailItem label="Thuộc dịch vụ" className="sm:col-span-2">
                    {service.name} <span className="num text-muted">({service.code})</span>
                </DetailItem>
                <DetailItem label="Giá">
                    <span className="num font-semibold">{priceFormatter.format(type.price)} ₫</span>
                </DetailItem>
                <DetailItem label="Thời gian thực hiện">
                    <span className="num">{type.durationMinutes ? `${type.durationMinutes} phút` : "—"}</span>
                </DetailItem>
                {type.isActive && type.deactivateFrom && (
                    <DetailItem label="Ngừng hoạt động từ" className="sm:col-span-2">
                        <span className="num">{formatDate(type.deactivateFrom)}</span>
                        {type.deactivateReason && <span className="text-muted"> · {type.deactivateReason}</span>}
                    </DetailItem>
                )}
                <DetailItem label="Mô tả" className="sm:col-span-2">
                    {type.description || <span className="text-muted">Chưa có mô tả.</span>}
                </DetailItem>
            </dl>

            <div className="modal-actions -mx-6 border-t border-border px-6 pt-4">
                <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose}>
                    Đóng
                </button>
            </div>
        </Modal>
    );
};

export default ServiceTypeDetailPopup;
