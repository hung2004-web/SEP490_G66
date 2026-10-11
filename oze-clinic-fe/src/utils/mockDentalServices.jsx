import bocSuVeneers from "@/assets/mock/services/boc-su-veneers.webp";
import cayGhepImplant from "@/assets/mock/services/cay-ghep-implant.webp";
import nhoRangKhon from "@/assets/mock/services/nho-rang-khon.webp";
import niengRang from "@/assets/mock/services/nieng-rang.webp";
import phucHinhInlayOnlay from "@/assets/mock/services/phuc-hinh-inlay-onlay.webp";
import tayTrangRang from "@/assets/mock/services/tay-trang-rang.webp";

export const MOCK_DENTAL_SERVICES = [
    {
        id: 1,
        name: "Cấy ghép Implant",
        description: "Thay thế răng đã mất bằng trụ Implant và mão sứ, giúp phục hồi chức năng ăn nhai.",
        imageUrl: cayGhepImplant,
    },
    {
        id: 2,
        name: "Niềng răng chỉnh nha",
        description: "Điều chỉnh răng mọc lệch, hô, móm bằng mắc cài hoặc khay trong suốt.",
        imageUrl: niengRang,
    },
    {
        id: 3,
        name: "Bọc răng sứ, dán sứ Veneers",
        description: "Cải thiện màu sắc và hình dáng răng bằng mão sứ hoặc mặt dán sứ mỏng.",
        imageUrl: bocSuVeneers,
    },
    {
        id: 4,
        name: "Phục hình sứ Inlay - Onlay",
        description: "Phục hồi phần răng bị sâu hoặc vỡ bằng miếng sứ được chế tác riêng.",
        imageUrl: phucHinhInlayOnlay,
    },
    {
        id: 5,
        name: "Tẩy trắng răng",
        description: "Làm sáng màu răng bị ố vàng do thực phẩm, thuốc lá hoặc tuổi tác.",
        imageUrl: tayTrangRang,
    },
    {
        id: 6,
        name: "Nhổ răng khôn",
        description: "Nhổ răng khôn mọc lệch hoặc mọc ngầm theo chỉ định của bác sĩ.",
        imageUrl: nhoRangKhon,
    },
];
