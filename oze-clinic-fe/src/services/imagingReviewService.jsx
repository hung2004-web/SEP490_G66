import { MOCK_IMAGING_REVIEWS } from "../utils/data/mockImagingReviews";

// TODO(api): mock only, swap for the imaging request endpoints (ImagingRequestsController) once the doctor review is there.
const MOCK_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (message) => ({ success: false, message, data: null, errors: null });

const copy = (review) => ({ ...review, patient: { ...review.patient }, images: review.images.map((image) => ({ ...image })) });

const reviews = MOCK_IMAGING_REVIEWS.map(copy);

const updatePending = (id, changes) => {
    const review = reviews.find((item) => item.id === id);
    if (!review) return failure("Không tìm thấy kết quả chụp.");
    if (review.status !== "pending") return failure("Kết quả này không còn chờ duyệt.");
    Object.assign(review, changes);
    return success(copy(review));
};

// All X-ray results of the doctor, newest first.
export const getImagingReviews = async () => {
    await wait(MOCK_DELAY_MS);
    return success(reviews.map(copy));
};

export const approveImagingReview = async (id) => {
    await wait(MOCK_DELAY_MS);
    return updatePending(id, { status: "approved" });
};

// The request goes back to the technician with the doctor's reason.
export const requestImagingRetake = async (id, reason) => {
    await wait(MOCK_DELAY_MS);
    return updatePending(id, { status: "retake", retakeReason: reason });
};
