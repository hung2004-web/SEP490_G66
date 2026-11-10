import { MapPin, Phone, Clock, ChevronRight } from "lucide-react";
import { FaFacebookF, FaTiktok, FaYoutube } from "react-icons/fa";
import LogoOze from "@/assets/logo/Logo-OZE-ngang.png";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PHONE_ID = "footer-consult-phone";

const CONTACTS = [
    { icon: MapPin, text: "Số nhà 55-59, tổ 4, quốc lộ 3, Đông Anh, Hà Nội" },
    { icon: Phone, text: "0866 866 010", href: "tel:0866866010" },
    { icon: Clock, text: "Mở cửa: Thứ 2 - Chủ Nhật" },
];

const SERVICES = [
    "Cấy ghép Implant",
    "Niềng răng chỉnh nha",
    "Thẩm mỹ răng sứ",
    "Phục hình sứ Inlay - Onlay - Overlay",
    "Tẩy Trắng Răng",
    "Phục hồi tủy nhân tạo",
];

const SOCIALS = [
    { label: "Facebook Nha khoa Oze", href: "https://www.facebook.com/nhakhoaoze.vn", icon: FaFacebookF, tone: "text-[#1877F2]" },
    { label: "TikTok Nha khoa Oze", href: "https://www.tiktok.com/@nhakhoaganday_", icon: FaTiktok, tone: "text-black" },
    { label: "YouTube Nha khoa Oze", href: "https://www.youtube.com/@NhakhoaOze.official", icon: FaYoutube, tone: "text-[#FF0000]" },
];

const HEADING = "font-heading text-heading-3 font-bold text-ink sm:text-heading-2";

// Site footer. Lays out by the width it gets (container query), so it also fits next to the app sidebar:
// one column on phones, two on tablets (the consultation block spans both), three from ~1024px of footer width.
const Footer = () => {
    return (
        <footer className="@container bg-canvas px-4 py-10 sm:px-6 sm:py-16">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 @2xl:grid-cols-2 @5xl:grid-cols-[1.5fr_1fr_1.5fr] @5xl:gap-12">
                {/* Column 1: Logo & Info */}
                <div className="flex flex-col gap-6 sm:gap-8">
                    <img
                        src={LogoOze}
                        alt="Nha khoa Oze"
                        className="h-auto w-44 object-contain sm:w-56"
                        style={{ filter: "brightness(0) saturate(100%) invert(32%) sepia(87%) saturate(3015%) hue-rotate(213deg) brightness(97%) contrast(93%)" }}
                    />
                    <ul className="flex flex-col gap-4">
                        {CONTACTS.map(({ icon: Icon, text, href }) => {
                            const content = (
                                <>
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft" aria-hidden="true">
                                        <Icon className="size-5 text-primary" />
                                    </span>
                                    <span className="min-w-0 pt-2 text-body">{text}</span>
                                </>
                            );
                            return (
                                <li key={text}>
                                    {href ? (
                                        <a href={href} className="group flex items-start gap-4 rounded-md pointer-coarse:min-h-11 [&>span:last-child]:group-hover:text-primary">
                                            {content}
                                        </a>
                                    ) : (
                                        <div className="flex items-start gap-4">{content}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Column 2: Services */}
                <nav aria-labelledby="footer-services-title" className="flex flex-col gap-4 sm:gap-6">
                    <h3 id="footer-services-title" className={HEADING}>
                        Dịch vụ nha khoa
                    </h3>
                    <ul className="flex flex-col gap-1 sm:gap-2">
                        {SERVICES.map((service) => (
                            <li key={service}>
                                <a href="#" className="group flex min-h-9 items-center gap-2 rounded-md py-1 pointer-coarse:min-h-11">
                                    <ChevronRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                    <span className="text-body-md text-body transition-colors group-hover:text-primary">{service}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Column 3: Consultation & Social — full row on tablets, own column on wide footers */}
                <div className="flex flex-col gap-8 @2xl:col-span-2 @2xl:grid @2xl:grid-cols-2 @2xl:gap-10 @5xl:col-span-1 @5xl:flex @5xl:gap-10">
                    <div className="flex flex-col gap-4 sm:gap-5">
                        <h3 className={HEADING}>Đăng ký tư vấn</h3>
                        <div className="flex flex-col gap-2">
                            <label htmlFor={PHONE_ID} className="text-label text-ink">
                                Số điện thoại
                            </label>
                            <div className="flex gap-3">
                                {/* Input renders its own full-width wrapper; this one lets it shrink beside the button. */}
                                <div className="min-w-0 flex-1">
                                    <Input id={PHONE_ID} type="tel" inputMode="tel" autoComplete="tel" placeholder="0123456789" />
                                </div>
                                <Button className="shrink-0 px-6 sm:px-7">Gửi</Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:gap-5">
                        <h3 className={HEADING}>Theo dõi chúng tôi tại</h3>
                        <ul className="flex items-center gap-4">
                            {SOCIALS.map(({ label, href, icon: Icon, tone }) => (
                                <li key={label}>
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        title={label}
                                        className="flex size-11 items-center justify-center rounded-full bg-surface-muted shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <Icon className={`size-5 ${tone}`} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
