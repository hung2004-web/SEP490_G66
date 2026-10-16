import {
    Activity,
    AlignCenter,
    BadgeCheck,
    Bandage,
    Brush,
    CalendarCheck,
    ClipboardList,
    Clock,
    Gem,
    HeartPulse,
    Layers,
    MessageCircle,
    Ruler,
    ScanLine,
    ShieldCheck,
    Smile,
    Sparkles,
    Stethoscope,
    Sun,
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
            { number: 1, icon: Smile, title: "Khôi phục khả năng ăn nhai", description: "Răng Implant có độ ổn định cao, giúp khách hàng cắn và nhai thức ăn thuận tiện hơn, từ đó cải thiện chất lượng bữa ăn hằng ngày." },
            { number: 2, icon: ShieldCheck, title: "Hạn chế tiêu xương hàm", description: "Trụ Implant thay thế chân răng đã mất và truyền lực nhai xuống xương hàm, góp phần duy trì mật độ xương tại vị trí mất răng." },
            { number: 3, icon: HeartPulse, title: "Bảo tồn răng thật kế cận", description: "Khác với cầu răng sứ, cấy ghép Implant thường không cần mài nhỏ các răng khỏe bên cạnh, giúp bảo tồn tối đa cấu trúc răng thật." },
            { number: 4, icon: Sparkles, title: "Cải thiện thẩm mỹ nụ cười", description: "Răng Implant được thiết kế hài hòa với cung hàm, giúp lấp đầy khoảng trống mất răng và khôi phục vẻ tự nhiên cho nụ cười." },
            { number: 5, icon: MessageCircle, title: "Hỗ trợ phát âm rõ hơn", description: "Việc phục hồi khoảng mất răng giúp luồng hơi trong khoang miệng được kiểm soát tốt hơn, hỗ trợ khách hàng nói chuyện rõ ràng và tự nhiên." },
            { number: 6, icon: AlignCenter, title: "Hạn chế răng xô lệch", description: "Trồng răng Implant phục hồi vị trí mất răng, giúp hạn chế các răng kế cận nghiêng hoặc dịch chuyển vào khoảng trống, góp phần duy trì khớp cắn ổn định." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám tổng quát và tư vấn" },
            { step: 2, icon: ScanLine, description: "Chụp phim X-quang CT Conebeam" },
            { step: 3, icon: ClipboardList, description: "Xây dựng phác đồ trồng răng" },
            { step: 4, icon: Syringe, description: "Tiến hành cấy ghép trụ Implant" },
            { step: 5, icon: Wrench, description: "Lấy dấu mẫu hàm & gắn răng tạm" },
            { step: 6, icon: BadgeCheck, description: "Tái khám và gắn mão sứ cố định trên Implant" },
        ],
        feedbacks: [
            { id: 1, imageUrl: cayGhepImplant, title: "Hành Trình Trồng Răng Implant Sau 20 Năm Cùng PGS.TS Đinh Vạn Trung", content: "Mất răng suốt 20 năm khiến việc ăn nhai của cô cực kỳ khổ sở, cơ mặt thì hóp lại trông già đi hẳn. Trước đây cứ sợ đau với tiêu xương không làm được, may mắn được PGS.TS Đinh Vạn Trung trực tiếp thăm khám và cấy ghép Implant. Bác sĩ tay nghề rất cao, cấy trụ nhẹ nhàng, nhanh chóng mà êm ru. Giờ cô ăn uống ngon miệng như xưa, nụ cười đầy đặn và thấy sức khỏe cải thiện rõ rệt." },
        ],
    },
    {
        id: 2,
        name: "Niềng răng chỉnh nha",
        imageUrl: niengRang,
        description:
            "Niềng răng giúp điều chỉnh răng mọc lệch, hô, móm, thưa bằng mắc cài hoặc khay trong suốt, mang lại khớp cắn chuẩn và nụ cười cân đối.",
        benefits: [
            { number: 1, icon: AlignCenter, title: "Răng đều và thẳng hàng", description: "Lực chỉnh nha được kiểm soát giúp dịch chuyển từng răng về đúng vị trí, khắc phục tình trạng răng mọc lệch, chen chúc hoặc thưa." },
            { number: 2, icon: ShieldCheck, title: "Khớp cắn chuẩn, ăn nhai hiệu quả", description: "Hai hàm răng khớp đúng với nhau giúp phân bổ lực nhai đều, giảm áp lực lên khớp thái dương hàm và hạn chế mòn răng." },
            { number: 3, icon: Sparkles, title: "Cải thiện đường nét khuôn mặt", description: "Khi tình trạng hô, móm được điều chỉnh, môi và cằm trở nên hài hòa hơn, giúp gương mặt cân đối khi nhìn thẳng và nghiêng." },
            { number: 4, icon: Brush, title: "Dễ vệ sinh răng miệng", description: "Răng thẳng hàng giúp việc chải răng và dùng chỉ nha khoa thuận tiện hơn, hạn chế mảng bám tích tụ ở các kẽ răng." },
            { number: 5, icon: HeartPulse, title: "Phòng ngừa bệnh lý răng miệng", description: "Giảm các vị trí khó làm sạch đồng nghĩa với việc hạn chế nguy cơ sâu răng, viêm nướu và viêm nha chu về lâu dài." },
            { number: 6, icon: Smile, title: "Tự tin với nụ cười mới", description: "Nụ cười đều đẹp giúp khách hàng thoải mái hơn khi giao tiếp, chụp ảnh và trong các hoạt động hằng ngày." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám và tư vấn chỉnh nha" },
            { step: 2, icon: ScanLine, description: "Chụp phim và lấy dấu mẫu hàm" },
            { step: 3, icon: ClipboardList, description: "Lên phác đồ và mô phỏng kết quả" },
            { step: 4, icon: Wrench, description: "Gắn mắc cài hoặc trao khay niềng" },
            { step: 5, icon: CalendarCheck, description: "Tái khám và điều chỉnh định kỳ" },
            { step: 6, icon: BadgeCheck, description: "Tháo niềng và đeo hàm duy trì" },
        ],
        feedbacks: [
            { id: 1, imageUrl: niengRang, title: "Hành Trình Niềng Răng Hô Sau 18 Tháng", content: "Từ nhỏ em đã bị răng hô nên rất ngại cười, lúc chụp ảnh lúc nào cũng phải mím môi. Sau khi được bác sĩ thăm khám và mô phỏng kết quả, em quyết định niềng răng mắc cài sứ. Lịch tái khám rõ ràng, mỗi lần siết răng đều được bác sĩ giải thích kỹ nên em không còn lo lắng. Sau 18 tháng, răng đều đẹp, khuôn mặt cũng thon gọn hơn và em tự tin cười thật tươi." },
        ],
    },
    {
        id: 3,
        name: "Bọc răng sứ, dán sứ Veneers",
        imageUrl: bocSuVeneers,
        description:
            "Bọc răng sứ và dán sứ Veneers cải thiện màu sắc, hình dáng răng bị ố, mẻ, thưa bằng mão sứ hoặc mặt dán sứ mỏng được chế tác riêng.",
        benefits: [
            { number: 1, icon: Sparkles, title: "Răng trắng sáng tự nhiên", description: "Màu sứ được lựa chọn phù hợp với tông da và răng thật, mang lại vẻ trắng sáng tự nhiên thay vì trắng bệt." },
            { number: 2, icon: Gem, title: "Khắc phục khuyết điểm hình dáng", description: "Mão sứ và mặt dán sứ che phủ hiệu quả các tình trạng răng mẻ, thưa, lệch nhẹ hoặc kích thước không đều." },
            { number: 3, icon: ShieldCheck, title: "Bền màu, hạn chế nhiễm màu", description: "Bề mặt sứ nhẵn bóng giúp hạn chế bám màu từ cà phê, trà hay thực phẩm, giữ màu răng ổn định trong thời gian dài." },
            { number: 4, icon: Layers, title: "Bảo tồn mô răng với Veneers", description: "Mặt dán sứ Veneers chỉ yêu cầu mài một lớp men rất mỏng, giúp giữ lại tối đa cấu trúc răng thật." },
            { number: 5, icon: Smile, title: "Ăn nhai ổn định", description: "Răng sứ có độ cứng tốt và được gắn chắc chắn, giúp khách hàng ăn nhai bình thường sau khi hoàn tất phục hình." },
            { number: 6, icon: HeartPulse, title: "Tương thích sinh học", description: "Vật liệu sứ cao cấp an toàn với nướu, hạn chế kích ứng và hiện tượng đen viền nướu theo thời gian." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám và tư vấn màu sứ" },
            { step: 2, icon: ScanLine, description: "Chụp phim và thiết kế nụ cười" },
            { step: 3, icon: Wrench, description: "Mài răng và lấy dấu mẫu hàm" },
            { step: 4, icon: Gem, description: "Chế tác răng sứ tại labo" },
            { step: 5, icon: BadgeCheck, description: "Thử và gắn răng sứ cố định" },
            { step: 6, icon: CalendarCheck, description: "Tái khám và hướng dẫn chăm sóc" },
        ],
        feedbacks: [
            { id: 1, imageUrl: bocSuVeneers, title: "Hành Trình Lấy Lại Nụ Cười Với Răng Sứ Veneers", content: "Răng cửa của chị bị ố và mẻ sau nhiều năm, đi làm hay gặp khách hàng đều ngại cười. Bác sĩ tư vấn dán sứ Veneers để giữ lại răng thật, còn cho chị xem trước thiết kế nụ cười trên máy. Chỉ sau vài buổi, hàm răng đã đều màu và rất tự nhiên, người quen còn không nhận ra chị làm răng. Giờ chị tự tin hơn hẳn mỗi khi giao tiếp." },
        ],
    },
    {
        id: 4,
        name: "Phục hình sứ Inlay - Onlay",
        imageUrl: phucHinhInlayOnlay,
        description:
            "Inlay - Onlay phục hồi phần răng bị sâu hoặc vỡ bằng miếng sứ chế tác riêng, giữ lại tối đa mô răng thật.",
        benefits: [
            { number: 1, icon: ShieldCheck, title: "Bảo tồn tối đa răng thật", description: "Chỉ loại bỏ phần mô răng bị tổn thương, không cần mài toàn bộ thân răng như khi bọc sứ, giúp giữ lại cấu trúc răng khỏe." },
            { number: 2, icon: Ruler, title: "Khít sát, chính xác", description: "Miếng trám sứ được chế tác theo dấu răng riêng của từng khách hàng, khít sát với thành răng và hạn chế khe hở." },
            { number: 3, icon: HeartPulse, title: "Hạn chế sâu răng tái phát", description: "Độ khít sát cao giúp ngăn vi khuẩn và thức ăn lọt vào bên dưới, giảm nguy cơ sâu răng thứ phát." },
            { number: 4, icon: Sparkles, title: "Thẩm mỹ như răng thật", description: "Màu sứ được lựa chọn tương đồng với răng thật, khó phân biệt bằng mắt thường khi giao tiếp." },
            { number: 5, icon: Smile, title: "Chịu lực nhai tốt", description: "Sứ có độ cứng cao hơn vật liệu trám thông thường, phù hợp với các răng hàm chịu lực nhai lớn." },
            { number: 6, icon: Clock, title: "Độ bền lâu dài", description: "Inlay - Onlay ít bị mòn và đổi màu theo thời gian, giúp kết quả phục hồi ổn định trong nhiều năm." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám và đánh giá mức độ tổn thương" },
            { step: 2, icon: ScanLine, description: "Chụp phim X-quang kiểm tra tủy răng" },
            { step: 3, icon: Wrench, description: "Làm sạch, tạo xoang và lấy dấu răng" },
            { step: 4, icon: Gem, description: "Chế tác miếng sứ Inlay - Onlay" },
            { step: 5, icon: BadgeCheck, description: "Gắn miếng sứ và điều chỉnh khớp cắn" },
        ],
        feedbacks: [
            { id: 1, imageUrl: phucHinhInlayOnlay, title: "Hành Trình Phục Hồi Răng Hàm Bị Vỡ", content: "Chiếc răng hàm của anh bị vỡ một mảng lớn sau khi cắn phải đồ cứng, ăn uống rất khó chịu. Anh lo phải bọc sứ cả răng nhưng bác sĩ tư vấn làm Onlay để giữ lại phần răng còn khỏe. Miếng sứ gắn vào rất khít, màu giống hệt răng thật. Đến nay anh ăn nhai bình thường, không còn ê buốt hay giắt thức ăn nữa." },
        ],
    },
    {
        id: 5,
        name: "Tẩy trắng răng",
        imageUrl: tayTrangRang,
        description:
            "Tẩy trắng răng làm sáng màu răng bị ố vàng do thực phẩm, thuốc lá hoặc tuổi tác bằng công nghệ an toàn, không làm hại men răng.",
        benefits: [
            { number: 1, icon: Sun, title: "Răng trắng sáng rõ rệt", description: "Răng có thể sáng lên nhiều tông màu chỉ sau một buổi điều trị tại phòng khám, cải thiện ngay vẻ ngoài của nụ cười." },
            { number: 2, icon: ShieldCheck, title: "Không mài, không xâm lấn", description: "Tẩy trắng tác động lên sắc tố bên trong men răng mà không cần mài hay làm thay đổi cấu trúc răng thật." },
            { number: 3, icon: Clock, title: "Thời gian thực hiện nhanh", description: "Quy trình tẩy trắng tại phòng khám chỉ kéo dài khoảng 60 – 90 phút, phù hợp với người bận rộn." },
            { number: 4, icon: HeartPulse, title: "Hạn chế ê buốt", description: "Bác sĩ bảo vệ nướu và sử dụng thuốc chống ê buốt trước và sau khi tẩy, giúp quá trình điều trị dễ chịu hơn." },
            { number: 5, icon: Sparkles, title: "Màu trắng tự nhiên", description: "Nồng độ thuốc được điều chỉnh theo tình trạng răng, mang lại màu trắng tự nhiên, hài hòa với gương mặt." },
            { number: 6, icon: Smile, title: "Tự tin khi giao tiếp", description: "Nụ cười trắng sáng giúp khách hàng tự tin hơn trong công việc, giao tiếp và những dịp quan trọng." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám và kiểm tra màu răng" },
            { step: 2, icon: Brush, description: "Cạo vôi và làm sạch răng" },
            { step: 3, icon: ShieldCheck, description: "Bảo vệ nướu và bôi thuốc tẩy trắng" },
            { step: 4, icon: Sun, description: "Chiếu đèn kích hoạt thuốc tẩy trắng" },
            { step: 5, icon: CalendarCheck, description: "Hướng dẫn chăm sóc sau tẩy trắng" },
        ],
        feedbacks: [
            { id: 1, imageUrl: tayTrangRang, title: "Hành Trình Lấy Lại Hàm Răng Trắng Sáng", content: "Do uống cà phê nhiều năm nên răng mình bị ố vàng, cười lên trông rất thiếu sức sống. Mình đặt lịch tẩy trắng tại phòng khám và được bác sĩ kiểm tra, làm sạch răng rất kỹ trước khi tẩy. Cả quá trình chỉ hơn một tiếng, gần như không ê buốt. Răng trắng lên rõ rệt, mình còn được hướng dẫn cách ăn uống để giữ màu lâu hơn." },
        ],
    },
    {
        id: 6,
        name: "Nhổ răng khôn",
        imageUrl: nhoRangKhon,
        description:
            "Nhổ răng khôn mọc lệch hoặc mọc ngầm theo chỉ định của bác sĩ, giảm đau nhức và ngăn biến chứng cho răng lân cận.",
        benefits: [
            { number: 1, icon: HeartPulse, title: "Chấm dứt đau nhức, sưng viêm", description: "Loại bỏ răng khôn mọc lệch giúp chấm dứt các cơn đau nhức, sưng nướu và khó há miệng kéo dài." },
            { number: 2, icon: ShieldCheck, title: "Bảo vệ răng số 7", description: "Răng khôn mọc lệch dễ đâm vào răng số 7 gây sâu và tiêu chân răng; nhổ sớm giúp bảo vệ chiếc răng quan trọng này." },
            { number: 3, icon: AlignCenter, title: "Hạn chế xô lệch hàm răng", description: "Răng khôn mọc chen chúc có thể đẩy các răng phía trước, nhổ bỏ giúp duy trì sự đều đặn của cung răng." },
            { number: 4, icon: Brush, title: "Dễ vệ sinh răng miệng", description: "Không còn vùng răng khôn khó chải tới, thức ăn ít bị giắt lại, giảm nguy cơ hôi miệng và viêm lợi trùm." },
            { number: 5, icon: Activity, title: "Nhổ nhẹ nhàng, ít sang chấn", description: "Sử dụng máy siêu âm Piezotome và gây tê kỹ giúp giảm sang chấn mô xung quanh, hạn chế đau trong khi nhổ." },
            { number: 6, icon: Bandage, title: "Lành thương nhanh", description: "Ổ răng được xử lý sạch sẽ và khâu đóng cẩn thận, giúp vết thương mau lành và giảm sưng sau nhổ." },
        ],
        treatmentSteps: [
            { step: 1, icon: Stethoscope, description: "Thăm khám và kiểm tra sức khỏe tổng quát" },
            { step: 2, icon: ScanLine, description: "Chụp phim X-quang xác định vị trí răng" },
            { step: 3, icon: Syringe, description: "Sát khuẩn và gây tê tại chỗ" },
            { step: 4, icon: Wrench, description: "Tiến hành nhổ răng khôn" },
            { step: 5, icon: Bandage, description: "Khâu đóng và cầm máu" },
            { step: 6, icon: CalendarCheck, description: "Hướng dẫn chăm sóc và tái khám cắt chỉ" },
        ],
        feedbacks: [
            { id: 1, imageUrl: nhoRangKhon, title: "Hành Trình Nhổ Răng Khôn Mọc Ngầm Không Còn Đáng Sợ", content: "Chiếc răng khôn mọc ngầm làm em sưng đau mấy lần, nhưng vì nghe nhiều người kể nhổ răng khôn rất đau nên em cứ trì hoãn. Đến phòng khám, bác sĩ cho chụp phim, giải thích rõ vị trí răng và cách nhổ nên em yên tâm hơn. Cả quá trình nhẹ nhàng hơn em nghĩ, sau nhổ chỉ hơi sưng một chút. Một tuần sau tái khám cắt chỉ là em ăn uống bình thường." },
        ],
    },
];
