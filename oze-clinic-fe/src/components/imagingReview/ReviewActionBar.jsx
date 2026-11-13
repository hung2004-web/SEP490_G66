// Actions under the X-ray result: ask for a retake or approve. disabled once the result is no longer waiting for review.
const ReviewActionBar = ({ onRetake, onApprove, disabled = false }) => (
    <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn btn-secondary text-danger hover:text-danger" disabled={disabled} onClick={onRetake}>
            Yêu cầu chụp lại
        </button>
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={onApprove}>
            Duyệt kết quả
        </button>
    </div>
);

export default ReviewActionBar;
