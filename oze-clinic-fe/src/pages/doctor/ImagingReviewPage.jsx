import { useMemo, useState } from "react";
import { CheckCircle2, ImageOff, TriangleAlert } from "lucide-react";
import ApproveResultDialog from "@/components/imagingReview/ApproveResultDialog";
import ImagingResultCard from "@/components/imagingReview/ImagingResultCard";
import RetakeRequestDialog from "@/components/imagingReview/RetakeRequestDialog";
import ReviewActionBar from "@/components/imagingReview/ReviewActionBar";
import ReviewPatientStrip from "@/components/imagingReview/ReviewPatientStrip";
import ReviewRequestList from "@/components/imagingReview/ReviewRequestList";
import useAsync from "@/hooks/useAsync";
import { approveImagingReview, getImagingReviews, requestImagingRetake } from "@/services/imagingReviewService";
import { IMAGING_REVIEW_STATUS } from "@/utils/messages";

// Status order of the list (Chờ duyệt first), so the first result shown is one to review.
const STATUS_ORDER = Object.keys(IMAGING_REVIEW_STATUS);
const statusRank = (status) => {
    const rank = STATUS_ORDER.indexOf(status);
    return rank === -1 ? STATUS_ORDER.length : rank;
};

const normalize = (value) => value.normalize("NFC").trim().toLocaleLowerCase("vi");

const matchesSearch = (review, search) =>
    !search || [review.patient.name, review.patient.code, review.code].some((field) => normalize(field).includes(search));

const resultSubtitle = (review) =>
    [`Chỉ định ${review.orderedAt}`, review.capturedAt && `Chụp xong ${review.capturedAt}${review.technician ? ` bởi ${review.technician}` : ""}`]
        .filter(Boolean)
        .join(" · ");

const ImagingReviewPage = () => {
    const [search, setSearch] = useState("");
    // "" = Tất cả, otherwise an IMAGING_REVIEW_STATUS key.
    const [filter, setFilter] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    // Results changed on this page (approve / retake), applied over the loaded list by id.
    const [updated, setUpdated] = useState({});

    const { loading, value: result } = useAsync(getImagingReviews, []);
    const reviews = useMemo(() => (result?.success ? result.data.map((review) => updated[review.id] ?? review) : []), [result, updated]);

    const visible = useMemo(() => {
        const keyword = normalize(search);
        return reviews
            .filter((review) => (!filter || review.status === filter) && matchesSearch(review, keyword))
            .sort((a, b) => statusRank(a.status) - statusRank(b.status));
    }, [reviews, filter, search]);

    // Count per status tab, "" = Tất cả.
    const counts = { "": reviews.length };
    STATUS_ORDER.forEach((status) => {
        counts[status] = reviews.filter((review) => review.status === status).length;
    });

    // Keep the chosen result while it is in the list, otherwise show the first one.
    const selected = visible.find((review) => review.id === selectedId) ?? visible[0] ?? null;
    const dialogSubtitle = selected ? `${selected.code} · ${selected.type} · ${selected.patient.name}` : "";

    const runAction = async (action, message) => {
        setBusy(true);
        const response = await action();
        setBusy(false);
        setDialog(null);
        setNotice(response.success ? { tone: "success", text: message } : { tone: "danger", text: response.message });
        if (response.success) setUpdated((current) => ({ ...current, [response.data.id]: response.data }));
    };

    const NoticeIcon = notice?.tone === "danger" ? TriangleAlert : CheckCircle2;

    return (
        <div className="flex flex-col gap-5">
            <h1 className="page-title">Duyệt kết quả chụp</h1>

            <div role="status">
                {notice && (
                    <p className={`alert alert-${notice.tone}`}>
                        <NoticeIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{notice.text}</span>
                        <button type="button" className="btn btn-link h-auto text-caption" onClick={() => setNotice(null)}>
                            Đóng
                        </button>
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                {loading ? (
                    <div className="flex w-full flex-col gap-3 lg:w-90 lg:shrink-0" aria-hidden="true">
                        <div className="skeleton h-10 w-full" />
                        <div className="skeleton h-9 w-64" />
                        <div className="skeleton h-21 w-full" />
                        <div className="skeleton h-21 w-full" />
                    </div>
                ) : (
                    <ReviewRequestList
                        requests={visible.map((review) => ({ ...review, patientName: review.patient.name }))}
                        selectedId={selected?.id}
                        onSelect={setSelectedId}
                        search={search}
                        onSearchChange={setSearch}
                        filter={filter}
                        onFilterChange={setFilter}
                        counts={counts}
                    />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-4" aria-busy={loading}>
                    {loading ? (
                        <>
                            <div className="skeleton h-18 w-full" />
                            <div className="skeleton h-110 w-full" />
                        </>
                    ) : selected ? (
                        <>
                            <ReviewPatientStrip patient={selected.patient} status={selected.status} />
                            <ImagingResultCard
                                key={selected.id}
                                title={`${selected.type} · ${selected.code}`}
                                subtitle={resultSubtitle(selected)}
                                typeLabel={selected.type}
                                images={selected.images}
                            />
                            {selected.retakeReason && (
                                <p className="alert alert-warning">
                                    <span>
                                        <b className="font-semibold">Lý do chụp lại:</b> {selected.retakeReason}
                                    </span>
                                </p>
                            )}
                            <ReviewActionBar
                                disabled={selected.status !== "pending"}
                                onRetake={() => setDialog("retake")}
                                onApprove={() => setDialog("approve")}
                            />
                        </>
                    ) : (
                        <div className="card-app empty-state">
                            <ImageOff className="empty-state-icon" aria-hidden="true" />
                            <p className="empty-state-title">Chưa chọn kết quả chụp</p>
                            <p className="empty-state-text">Không có kết quả nào khớp với bộ lọc hiện tại.</p>
                        </div>
                    )}
                </div>
            </div>

            {dialog === "approve" && selected && (
                <ApproveResultDialog
                    subtitle={dialogSubtitle}
                    busy={busy}
                    onClose={() => setDialog(null)}
                    onConfirm={() => runAction(() => approveImagingReview(selected.id), `Đã duyệt kết quả ${selected.code}.`)}
                />
            )}
            {dialog === "retake" && selected && (
                <RetakeRequestDialog
                    subtitle={dialogSubtitle}
                    busy={busy}
                    onClose={() => setDialog(null)}
                    onSubmit={(reason) => runAction(() => requestImagingRetake(selected.id, reason), `Đã gửi yêu cầu chụp lại ${selected.code} cho KTV.`)}
                />
            )}
        </div>
    );
};

export default ImagingReviewPage;
