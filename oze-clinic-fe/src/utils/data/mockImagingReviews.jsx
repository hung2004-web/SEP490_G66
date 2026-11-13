import bitewingLeftMolar from "@/assets/mock/xray/bw_left_molar_01.png";
import periapicalMolar from "@/assets/mock/xray/pa_molar_quad4.png";
import panoramicAdult from "@/assets/mock/xray/pano_full_adult_01.png";
import panoramicPediatric from "@/assets/mock/xray/pano_pediatric_01.png";

// X-ray results waiting for the doctor's review ("Duyệt kết quả chụp"), from the Figma frame 532:4487.
// status: IMAGING_REVIEW_STATUS key. images: [{ id, url? }]; the sample films come from oze-xray-simulator.
export const MOCK_IMAGING_REVIEWS = [
    {
        id: 318,
        code: "YC000318",
        type: "X-quang toàn cảnh",
        time: "08:40",
        orderedAt: "08:40",
        capturedAt: "08:58",
        technician: "KTV. Phạm Quốc Bảo",
        status: "pending",
        patient: { name: "Đỗ Mai Khanh", code: "BN000120", gender: "female", age: 25, allergies: ["Penicillin"] },
        images: [
            { id: "318-1", url: panoramicAdult },
            { id: "318-2", url: bitewingLeftMolar },
        ],
    },
    {
        id: 314,
        code: "YC000314",
        type: "X-quang toàn cảnh",
        time: "08:50",
        orderedAt: "08:50",
        capturedAt: "09:05",
        technician: "KTV. Phạm Quốc Bảo",
        status: "retake",
        patient: { name: "Phan Gia Bảo", code: "BN000117", gender: "male", age: 31, allergies: [] },
        images: [{ id: "314-1", url: panoramicPediatric }],
    },
    {
        id: 301,
        code: "YC000301",
        type: "X-quang quanh chóp 36",
        time: "01/10",
        orderedAt: "01/10 14:20",
        capturedAt: "01/10 14:35",
        technician: "KTV. Lê Thu Hà",
        status: "approved",
        patient: { name: "Phạm Minh Tuấn", code: "BN000098", gender: "male", age: 42, allergies: [] },
        images: [{ id: "301-1", url: periapicalMolar }],
    },
    {
        id: 296,
        code: "YC000296",
        type: "X-quang quanh chóp 36",
        time: "01/10",
        orderedAt: "01/10 09:10",
        capturedAt: null,
        technician: null,
        status: "cancelled",
        patient: { name: "Phạm Minh Tuấn", code: "BN000098", gender: "male", age: 42, allergies: [] },
        images: [],
    },
];
