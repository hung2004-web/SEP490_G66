import {
    CalendarCheck,
    ClipboardList,
    HeartPulse,
    ScanLine,
    ShieldCheck,
    Smile,
    Sparkles,
    Stethoscope,
    Syringe,
    Wrench,
} from "lucide-react";
import bocSuVeneers from "@/assets/mock/services/boc-su-veneers.webp";
import cayGhepImplant from "@/assets/mock/services/cay-ghep-implant.webp";
import nhoRangKhon from "@/assets/mock/services/nho-rang-khon.webp";
import niengRang from "@/assets/mock/services/nieng-rang.webp";
import phucHinhInlayOnlay from "@/assets/mock/services/phuc-hinh-inlay-onlay.webp";
import tayTrangRang from "@/assets/mock/services/tay-trang-rang.webp";

export const MOCK_SERVICES = [
    {
        id: 1,
        name: "Cấy ghép Implant",
        imageUrl: cayGhepImplant,
        description:
            "Cấy ghép Implant là giải pháp thay thế răng đã mất bằng trụ Titanium đặt vào xương hàm và mão sứ phía trên, giúp phục hồi chức năng ăn nhai và thẩm mỹ như răng thật.",
        benefits: [
            { number: 1, icon: Smile, description: "Phục hồi chức năng ăn nhai gần như răng thật" },
            { number: 2, icon: ShieldCheck, description: "Ngăn ngừa tiêu xương hàm sau khi mất răng" },
            { number: 3, icon: Sparkles, description: "Thẩm mỹ tự nhiên, không ảnh hưởng răng bên cạnh" },
            { number: 4, icon: HeartPulse, description: "Độ bền cao, có thể sử dụng lâu dài" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ScanLine },
            { step: 3, icon: Syringe },
            { step: 4, icon: Wrench },
            { step: 5, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: cayGhepImplant, content: "Sau khi cấy Implant tôi ăn nhai thoải mái, không còn ngại khi cười nữa." },
            { id: 2, imageUrl: cayGhepImplant, content: "Bác sĩ tư vấn kỹ, quá trình cấy ghép nhẹ nhàng hơn tôi nghĩ." },
        ],
    },
    {
        id: 2,
        name: "Niềng răng chỉnh nha",
        imageUrl: niengRang,
        description:
            "Niềng răng giúp điều chỉnh răng mọc lệch, hô, móm, thưa bằng mắc cài hoặc khay trong suốt, mang lại khớp cắn chuẩn và nụ cười cân đối.",
        benefits: [
            { number: 1, icon: Smile, description: "Răng đều đẹp, nụ cười cân đối" },
            { number: 2, icon: ShieldCheck, description: "Khớp cắn chuẩn, giảm áp lực lên khớp thái dương hàm" },
            { number: 3, icon: Sparkles, description: "Cải thiện đường nét khuôn mặt" },
            { number: 4, icon: HeartPulse, description: "Dễ vệ sinh, hạn chế sâu răng và viêm nướu" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ScanLine },
            { step: 3, icon: ClipboardList },
            { step: 4, icon: Wrench },
            { step: 5, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: niengRang, content: "Sau 18 tháng niềng, răng tôi đều hẳn, tự tin hơn rất nhiều." },
            { id: 2, imageUrl: niengRang, content: "Lịch tái khám rõ ràng, bác sĩ theo dõi rất sát." },
        ],
    },
    {
        id: 3,
        name: "Bọc răng sứ, dán sứ Veneers",
        imageUrl: bocSuVeneers,
        description:
            "Bọc răng sứ và dán sứ Veneers cải thiện màu sắc, hình dáng răng bị ố, mẻ, thưa bằng mão sứ hoặc mặt dán sứ mỏng được chế tác riêng.",
        benefits: [
            { number: 1, icon: Sparkles, description: "Răng trắng sáng, đều màu tự nhiên" },
            { number: 2, icon: Smile, description: "Khắc phục răng mẻ, thưa, lệch nhẹ" },
            { number: 3, icon: ShieldCheck, description: "Sứ bền màu, chống bám màu thực phẩm" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ScanLine },
            { step: 3, icon: Wrench },
            { step: 4, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: bocSuVeneers, content: "Màu sứ rất tự nhiên, người quen không nhận ra tôi đã làm răng." },
            { id: 2, imageUrl: bocSuVeneers, content: "Chỉ sau vài buổi đã có nụ cười như ý." },
        ],
    },
    {
        id: 4,
        name: "Phục hình sứ Inlay - Onlay",
        imageUrl: phucHinhInlayOnlay,
        description:
            "Inlay - Onlay phục hồi phần răng bị sâu hoặc vỡ bằng miếng sứ chế tác riêng, giữ lại tối đa mô răng thật.",
        benefits: [
            { number: 1, icon: ShieldCheck, description: "Bảo tồn tối đa mô răng thật" },
            { number: 2, icon: HeartPulse, description: "Khít sát, hạn chế sâu răng tái phát" },
            { number: 3, icon: Sparkles, description: "Màu sứ tương đồng răng thật" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ScanLine },
            { step: 3, icon: Wrench },
            { step: 4, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: phucHinhInlayOnlay, content: "Răng vỡ được phục hồi gọn gàng, ăn nhai bình thường." },
        ],
    },
    {
        id: 5,
        name: "Tẩy trắng răng",
        imageUrl: tayTrangRang,
        description:
            "Tẩy trắng răng làm sáng màu răng bị ố vàng do thực phẩm, thuốc lá hoặc tuổi tác bằng công nghệ an toàn, không làm hại men răng.",
        benefits: [
            { number: 1, icon: Sparkles, description: "Răng trắng sáng sau một buổi điều trị" },
            { number: 2, icon: ShieldCheck, description: "An toàn, không mài răng" },
            { number: 3, icon: Smile, description: "Tự tin giao tiếp với nụ cười rạng rỡ" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ClipboardList },
            { step: 3, icon: Sparkles },
            { step: 4, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: tayTrangRang, content: "Răng trắng lên rõ rệt, gần như không ê buốt." },
            { id: 2, imageUrl: tayTrangRang, content: "Nhân viên hướng dẫn chăm sóc sau tẩy trắng rất chu đáo." },
        ],
    },
    {
        id: 6,
        name: "Nhổ răng khôn",
        imageUrl: nhoRangKhon,
        description:
            "Nhổ răng khôn mọc lệch hoặc mọc ngầm theo chỉ định của bác sĩ, giảm đau nhức và ngăn biến chứng cho răng lân cận.",
        benefits: [
            { number: 1, icon: HeartPulse, description: "Hết đau nhức, sưng viêm do răng khôn" },
            { number: 2, icon: ShieldCheck, description: "Bảo vệ răng số 7 khỏi sâu và xô lệch" },
            { number: 3, icon: Smile, description: "Lành thương nhanh, ít sưng" },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope },
            { step: 2, icon: ScanLine },
            { step: 3, icon: Syringe },
            { step: 4, icon: CalendarCheck },
        ],
        feedbacks: [
            { id: 1, imageUrl: nhoRangKhon, content: "Nhổ răng khôn mọc ngầm mà không đau như tôi lo lắng." },
        ],
    },
];
