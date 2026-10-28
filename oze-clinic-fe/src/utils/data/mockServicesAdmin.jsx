// Services as the clinic manager sees them (shape close to ServiceDto in the backend).
// TODO(api): the backend has no group or "price from" yet.

export const SERVICE_GROUPS = {
    EXAMINATION: "examination",
    ORTHODONTICS: "orthodontics",
    PROSTHODONTICS: "prosthodontics",
    PERIODONTICS: "periodontics",
    SURGERY: "surgery",
    COSMETIC: "cosmetic",
    IMAGING: "imaging",
};

// Group labels for dropdowns and the table.
export const SERVICE_GROUP_OPTIONS = [
    { value: SERVICE_GROUPS.EXAMINATION, label: "Khám" },
    { value: SERVICE_GROUPS.ORTHODONTICS, label: "Chỉnh nha" },
    { value: SERVICE_GROUPS.PROSTHODONTICS, label: "Phục hình" },
    { value: SERVICE_GROUPS.PERIODONTICS, label: "Nha chu" },
    { value: SERVICE_GROUPS.SURGERY, label: "Phẫu thuật" },
    { value: SERVICE_GROUPS.COSMETIC, label: "Thẩm mỹ" },
    { value: SERVICE_GROUPS.IMAGING, label: "Hình ảnh" },
];

const group = SERVICE_GROUPS;

// price: reference price in VND (0 = free); priceFrom: true when the price is a starting price ("Từ ...").
export const MOCK_ADMIN_SERVICES = [
    { id: 50, code: "DV050", name: "Niềng răng thẩm mỹ", description: "Chỉnh nha cho răng hô, móm, thưa, khấp khểnh", group: group.ORTHODONTICS, price: 18000000, priceFrom: true, isActive: true },
    { id: 60, code: "DV060", name: "Trồng răng Implant", description: "Cấy trụ titan, phục hình mão sứ", group: group.PROSTHODONTICS, price: 18000000, priceFrom: false, isActive: true },
    { id: 4, code: "DV004", name: "Lấy cao răng", description: "Làm sạch cao răng theo mức độ", group: group.PERIODONTICS, price: 30000, priceFrom: true, isActive: true },
    { id: 6, code: "DV006", name: "Nhổ răng khôn", description: "Nhổ răng khôn mọc lệch, mọc ngầm", group: group.SURGERY, price: 1500000, priceFrom: false, isActive: true },
    { id: 45, code: "DV045", name: "Tẩy trắng răng", description: "Làm trắng men răng", group: group.COSMETIC, price: 1500000, priceFrom: true, isActive: true },
    { id: 1, code: "DV001", name: "Khám tổng quát & tư vấn", description: "Khám, tư vấn, lập kế hoạch điều trị", group: group.EXAMINATION, price: 0, priceFrom: false, isActive: true },
    { id: 10, code: "DV010", name: "X-quang quanh chóp", description: "Chụp phim X-quang 1 vùng răng", group: group.IMAGING, price: 150000, priceFrom: false, isActive: true },
    { id: 30, code: "DV030", name: "Bọc răng sứ kim loại", description: "Phục hình răng bằng mão sứ", group: group.PROSTHODONTICS, price: 2000000, priceFrom: false, isActive: false },
    { id: 2, code: "DV002", name: "Khám định kỳ", description: "Kiểm tra răng miệng 6 tháng một lần", group: group.EXAMINATION, price: 100000, priceFrom: false, isActive: true },
    { id: 3, code: "DV003", name: "Khám cấp cứu răng", description: "Xử trí đau, sưng, chấn thương răng", group: group.EXAMINATION, price: 200000, priceFrom: false, isActive: true },
    { id: 11, code: "DV011", name: "X-quang toàn cảnh", description: "Chụp phim Panorama toàn hàm", group: group.IMAGING, price: 250000, priceFrom: false, isActive: true },
    { id: 12, code: "DV012", name: "Chụp CT Cone Beam", description: "Chụp phim 3D phục vụ cấy ghép, phẫu thuật", group: group.IMAGING, price: 800000, priceFrom: false, isActive: true },
    { id: 51, code: "DV051", name: "Niềng răng khay trong suốt", description: "Chỉnh nha bằng khay Invisalign", group: group.ORTHODONTICS, price: 45000000, priceFrom: true, isActive: true },
    { id: 52, code: "DV052", name: "Niềng răng mắc cài sứ", description: "Mắc cài cùng màu răng, thẩm mỹ cao", group: group.ORTHODONTICS, price: 30000000, priceFrom: true, isActive: true },
    { id: 31, code: "DV031", name: "Bọc răng sứ toàn sứ", description: "Mão sứ không kim loại, màu tự nhiên", group: group.PROSTHODONTICS, price: 5000000, priceFrom: true, isActive: true },
    { id: 32, code: "DV032", name: "Phục hình sứ Inlay - Onlay", description: "Phục hồi răng sâu, vỡ bằng miếng sứ", group: group.PROSTHODONTICS, price: 3000000, priceFrom: false, isActive: true },
    { id: 5, code: "DV005", name: "Điều trị viêm nướu", description: "Làm sạch túi nướu, điều trị viêm", group: group.PERIODONTICS, price: 500000, priceFrom: true, isActive: true },
    { id: 7, code: "DV007", name: "Điều trị nha chu", description: "Nạo túi nha chu, điều trị tiêu xương", group: group.PERIODONTICS, price: 2000000, priceFrom: true, isActive: false },
    { id: 8, code: "DV008", name: "Nhổ răng thường", description: "Nhổ răng lung lay, răng sữa", group: group.SURGERY, price: 300000, priceFrom: true, isActive: true },
    { id: 9, code: "DV009", name: "Ghép xương ổ răng", description: "Bổ sung xương trước khi cấy Implant", group: group.SURGERY, price: 6000000, priceFrom: true, isActive: true },
    { id: 46, code: "DV046", name: "Dán sứ Veneers", description: "Mặt dán sứ mỏng cải thiện hình dáng răng", group: group.COSMETIC, price: 7000000, priceFrom: false, isActive: true },
    { id: 47, code: "DV047", name: "Đính đá răng", description: "Gắn đá trang trí lên bề mặt răng", group: group.COSMETIC, price: 500000, priceFrom: false, isActive: false },
    { id: 48, code: "DV048", name: "Cạo vôi & đánh bóng", description: "Làm sạch, đánh bóng bề mặt răng", group: group.COSMETIC, price: 200000, priceFrom: false, isActive: true },
    { id: 13, code: "DV013", name: "Chụp phim cắn cánh", description: "Phát hiện sâu kẽ răng", group: group.IMAGING, price: 100000, priceFrom: false, isActive: true },
];
