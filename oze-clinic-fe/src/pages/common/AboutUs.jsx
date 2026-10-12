import { Eye, Gem, Handshake, HeartHandshake, Scale, ShieldCheck, Sparkle, Sprout, Target, TrendingUp } from "lucide-react";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import Card from "@/components/ui/Card";
import bannerAboutUs from "@/assets/banner/banner_about_us.png";
import { ROUTES } from "../../utils/routes";

const BREADCRUMB_ITEMS = [{ label: "Trang chủ", href: ROUTES.HOME }, { label: "Về chúng tôi" }];

const INTRO_PARAGRAPHS = [
    "Với định vị là \"Chuyên gia Răng Miệng cho Gia Đình Việt\", Nha khoa OZE hướng tới xây dựng một hệ thống nha khoa uy tín — nơi mỗi gia đình đều có thể an tâm gửi trọn niềm tin chăm sóc sức khỏe nụ cười dài lâu.",
    "Trên hành trình ấy, chúng tôi không ngừng nâng cao chuyên môn, chuẩn hóa dịch vụ và ứng dụng công nghệ hiện đại nhằm mang đến giải pháp điều trị tối ưu, từ nha khoa tổng quát đến các dịch vụ chuyên sâu.",
    "Với phương châm \"Luôn tận tâm – Luôn hoàn thiện\", Nha khoa OZE đặt sự hài lòng của khách hàng và tinh thần đổi mới làm nền tảng phát triển, không ngừng nâng tầm trải nghiệm để kiến tạo những giá trị sức khỏe bền vững.",
];

const DIRECTIONS = [
    {
        title: "Tầm nhìn",
        Icon: Eye,
        tagline: "Kiến tạo hệ sinh thái sức khỏe nụ cười cho mọi người dân Việt.",
        desc: "Nha khoa OZE hướng đến xây dựng một hệ thống phát triển bền vững, được khách hàng ghi nhận bằng niềm tin, sự hài lòng và lựa chọn lâu dài. Để hiện thực hóa tầm nhìn đó, chúng tôi không ngừng nâng cao năng lực chuyên môn, đầu tư công nghệ, chuẩn hóa chất lượng dịch vụ và kiến tạo trải nghiệm chăm sóc nhất quán tại mỗi cơ sở.",
    },
    {
        title: "Sứ mệnh",
        Icon: Target,
        tagline: "Mang niềm vui, sức khỏe và sự tự tin đến tất cả khách hàng.",
        desc: "Nha khoa OZE mang đến các giải pháp chăm sóc răng miệng toàn diện, được thực hiện bởi đội ngũ bác sĩ tận tâm và hỗ trợ bởi hệ thống công nghệ hiện đại. Qua mỗi hành trình thăm khám và điều trị, chúng tôi hướng tới việc giúp khách hàng cải thiện sức khỏe, hoàn thiện nụ cười và nâng cao chất lượng cuộc sống.",
    },
];

const CORE_VALUES = [
    {
        title: "Tận tâm với khách hàng",
        Icon: HeartHandshake,
        desc: "Đặt sự hài lòng của khách hàng là ưu tiên số 1 trong mọi suy nghĩ và hành động.",
    },
    {
        title: "Chính trực",
        Icon: ShieldCheck,
        desc: "Trân trọng lời nói của mình và luôn nỗ lực giữ sự chính trực trong mọi hoàn cảnh.",
    },
    {
        title: "Cầu tiến",
        Icon: TrendingUp,
        desc: "\"Say yes\" với mọi mục tiêu, hành động quyết liệt và tin tưởng sẽ đạt được mục tiêu.",
    },
    {
        title: "Coi mình là gốc rễ",
        Icon: Sprout,
        desc: "Nhận mình là nguồn gốc khi có sự cố xảy ra và tìm giải pháp mới để khắc phục sự cố.",
    },
    {
        title: "Đoàn kết",
        Icon: Handshake,
        desc: "Hợp lực, đồng lòng và tôn trọng lẫn nhau vì lợi ích chung giúp tạo nên thành công lâu dài. Biết ơn, ghi nhận chân thành để giúp đồng đội tốt hơn.",
    },
    {
        title: "Trung thực",
        Icon: Scale,
        desc: "Tôn trọng lẽ phải, không dối trá từ lời nói đến hành vi, sẵn sàng dũng cảm nói lên sự thật và nhận lỗi khi phạm sai lầm.",
    },
];

const SECTION_CLASS = "py-12 md:py-16 lg:py-24";

const AboutUs = () => {
    return (
        <div className="bg-canvas">
            <div className="container-public pt-6">
                <Breadcrumb items={BREADCRUMB_ITEMS} />
            </div>

            {/* Intro heading: eyebrow between two fading lines, then the clinic name (follows the team's About Us template) */}
            <header className="container-public pt-12 text-center md:pt-16">
                <div className="mx-auto flex max-w-4xl items-center gap-4 text-primary">
                    <span className="h-px flex-1 bg-linear-to-r from-transparent to-primary/60" aria-hidden="true" />
                    <Sparkle className="size-4 shrink-0 fill-current" aria-hidden="true" />
                    <p className="font-heading text-heading-2 font-bold uppercase tracking-wide md:text-[28px]">
                        Giới thiệu về
                    </p>
                    <Sparkle className="size-4 shrink-0 fill-current" aria-hidden="true" />
                    <span className="h-px flex-1 bg-linear-to-l from-transparent to-primary/60" aria-hidden="true" />
                </div>
                <h1 className="mt-6 text-display-md uppercase text-primary md:text-display-lg">Nha khoa OZE</h1>
            </header>

            {/* Intro text and photo, 6/6 split that stacks on mobile */}
            <section className={`container-public ${SECTION_CLASS} grid grid-cols-1 items-center gap-12 md:grid-cols-2`}>
                <div className="flex flex-col gap-3 text-justify text-caption leading-loose text-body md:text-body-sm md:leading-loose">
                    {INTRO_PARAGRAPHS.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
                <div className="overflow-hidden rounded-2xl shadow-md">
                    <img
                        src={bannerAboutUs}
                        alt="Không gian Nha khoa OZE"
                        className="hero-image w-full transition-transform duration-500 ease-out hover:scale-105"
                    />
                </div>
            </section>

            {/* Vision and mission */}
            <section className={`bg-surface-tint ${SECTION_CLASS}`}>
                <div className="container-public grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                    {DIRECTIONS.map(({ title, Icon, tagline, desc }) => (
                        <Card key={title} variant="public" className="card-hover flex flex-col">
                            <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                                <Icon className="size-7" aria-hidden="true" />
                            </span>
                            <h2 className="mt-6 text-heading-1">{title}</h2>
                            <p className="mt-3 font-semibold text-ink">{tagline}</p>
                            <p className="mt-3">{desc}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Core values */}
            <section className={`container-public ${SECTION_CLASS}`}>
                <div className="mb-12 flex flex-col items-center text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Gem className="size-7" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-display-md">Giá trị cốt lõi</h2>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {CORE_VALUES.map(({ title, Icon, desc }) => (
                        <Card key={title} variant="public" className="card-hover group flex flex-col">
                            <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-on-primary">
                                <Icon className="size-6" aria-hidden="true" />
                            </span>
                            <h3 className="mt-5 text-heading-2">{title}</h3>
                            <p className="mt-3">{desc}</p>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default AboutUs;
