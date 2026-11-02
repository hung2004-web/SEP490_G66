import { ROOM_TYPES } from "./mockRooms";

// Services as the clinic manager sees them (shape close to ServiceDto in the backend).
// TODO(api): the backend has no required room type, duration or "price from" yet.

const room = ROOM_TYPES;

// price: reference price in VND (0 = free); priceFrom: true when the price is a starting price ("Từ ...");
// roomType: the kind of room the service needs (ROOM_TYPES); durationMinutes: expected time for one visit.
export const MOCK_ADMIN_SERVICES = [
    { id: 1, code: "DV001", name: "Khám tổng quát & tư vấn", description: "Khám, tư vấn, lập kế hoạch điều trị", roomType: room.GENERAL, price: 0, priceFrom: false, durationMinutes: 30, isActive: true },
    { id: 2, code: "DV002", name: "Lấy cao răng", description: "Làm sạch cao răng, đánh bóng", roomType: room.GENERAL, price: 150000, priceFrom: true, durationMinutes: 30, isActive: true },
    { id: 3, code: "DV003", name: "Điều trị tủy", description: "Lấy tủy, làm sạch và trám bít ống tủy", roomType: room.GENERAL, price: 800000, priceFrom: true, durationMinutes: 60, isActive: true },
    { id: 4, code: "DV004", name: "Nhổ răng khôn", description: "Nhổ răng khôn mọc lệch, mọc ngầm", roomType: room.MINOR_SURGERY, price: 1500000, priceFrom: false, durationMinutes: 60, isActive: true },
    { id: 5, code: "DV005", name: "Cấy ghép Implant", description: "Cấy trụ titan, phục hình mão sứ", roomType: room.MINOR_SURGERY, price: 18000000, priceFrom: false, durationMinutes: 90, isActive: true },
    { id: 6, code: "DV006", name: "Niềng răng thẩm mỹ", description: "Chỉnh nha răng hô, móm, thưa, khấp khểnh", roomType: room.SPECIALIZED, price: 18000000, priceFrom: true, durationMinutes: 60, isActive: true },
    { id: 7, code: "DV007", name: "Chụp Panorama", description: "Phim toàn cảnh hai hàm", roomType: room.XRAY, price: 250000, priceFrom: false, durationMinutes: 15, isActive: true },
    { id: 8, code: "DV008", name: "Scan răng iTero", description: "Quét dấu răng kỹ thuật số", roomType: room.SPECIALIZED, price: 800000, priceFrom: false, durationMinutes: 30, isActive: false },
];

// Service types (the options a patient actually books). serviceId points to MOCK_ADMIN_SERVICES; price in VND;
// durationMinutes: time for one visit; sortOrder: position in the list. Services without types are booked as they are.
export const MOCK_SERVICE_TYPES = [
    { id: 1, serviceId: 2, code: "DV002-01", name: "Một hàm", price: 150000, durationMinutes: 20, sortOrder: 1, description: "Lấy cao răng và đánh bóng một hàm.", isActive: true },
    { id: 2, serviceId: 2, code: "DV002-02", name: "Toàn hàm", price: 300000, durationMinutes: 30, sortOrder: 2, description: "Lấy cao răng cả hai hàm, đánh bóng.", isActive: true },
    { id: 8, serviceId: 2, code: "DV002-03", name: "Nửa hàm (cũ)", price: 100000, durationMinutes: 15, sortOrder: 3, description: "Gói cũ, không còn nhận lịch mới.", isActive: false },
    { id: 3, serviceId: 3, code: "DV003-01", name: "Răng một chân", price: 800000, durationMinutes: 45, sortOrder: 1, description: "Điều trị tủy răng cửa, răng nanh.", isActive: true },
    { id: 4, serviceId: 3, code: "DV003-02", name: "Răng nhiều chân", price: 1500000, durationMinutes: 60, sortOrder: 2, description: "Điều trị tủy răng hàm.", isActive: true },
    { id: 5, serviceId: 6, code: "DV006-01", name: "Mắc cài kim loại", price: 18000000, durationMinutes: 60, sortOrder: 1, description: "Mắc cài kim loại truyền thống, chi phí thấp, hiệu quả ổn định.", isActive: true },
    { id: 6, serviceId: 6, code: "DV006-02", name: "Mắc cài sứ", price: 30000000, durationMinutes: 60, sortOrder: 2, description: "Mắc cài cùng màu răng, khó nhận thấy khi giao tiếp.", isActive: true },
    { id: 7, serviceId: 6, code: "DV006-03", name: "Khay trong suốt", price: 45000000, durationMinutes: 30, sortOrder: 3, description: "Khay nhựa trong suốt tháo lắp, thay khay định kỳ.", isActive: true },
];
