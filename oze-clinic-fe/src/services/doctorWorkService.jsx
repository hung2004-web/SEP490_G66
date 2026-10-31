// TODO(api): mock only, swap for the doctor's queue / review endpoints once the backend has them.
const MOCK_DELAY_MS = 300;

const MOCK_PENDING_COUNTS = { waitingPatients: 4, pendingImagingReviews: 2, pendingRefundReviews: 2 };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Counts for the doctor's sidebar: patients waiting, imaging results and refund requests to review.
export const getDoctorPendingCounts = async () => {
    await wait(MOCK_DELAY_MS);

    return { success: true, message: null, data: { ...MOCK_PENDING_COUNTS }, errors: null };
};
