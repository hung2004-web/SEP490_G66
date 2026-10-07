import React from "react";
import { MapPin, Phone, Clock, ChevronRight } from "lucide-react";
import { FaFacebookF, FaTiktok, FaYoutube } from "react-icons/fa";
import LogoOze from "@/assets/Logo-OZE-ngang.png";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

const Footer = () => {
    return (
        <footer className="bg-canvas py-16 px-4">
            <div className="w-full grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1.5fr] gap-12">

                {/* Column 1: Logo & Info */}
                <div className="flex flex-col gap-8">
                    <div className="w-56 h-auto">
                        <img
                            src={LogoOze}
                            alt="OZE Dental Logo"
                            className="w-full h-auto object-contain"
                            style={{ filter: "brightness(0) saturate(100%) invert(32%) sepia(87%) saturate(3015%) hue-rotate(213deg) brightness(97%) contrast(93%)" }}
                        />
                    </div>
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                                <MapPin className="size-5 text-primary" />
                            </div>
                            <span className="text-[#323232] pt-2">Số nhà 55-59, tổ 4, quốc lộ 3, Đông Anh, Hà Nội</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                                <Phone className="size-5 text-primary" />
                            </div>
                            <span className="text-[#323232] pt-2">0866 866 010</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                                <Clock className="size-5 text-primary" />
                            </div>
                            <span className="text-[#323232] pt-2">Mở cửa: Thứ 2 - Chủ Nhật</span>
                        </div>
                    </div>
                </div>

                {/* Column 2: Services */}
                <div className="flex flex-col gap-6">
                    <h3 className="font-heading text-heading-2 font-bold text-ink">Dịch vụ nha khoa</h3>
                    <ul className="flex flex-col gap-4 mt-1">
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Cấy ghép Implant</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Niềng răng chỉnh nha</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Thẩm mỹ răng sứ</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Phục hình sứ Inlay - Onlay - Overlay</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Tẩy Trắng Răng</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" className="group flex items-center gap-2">
                                <ChevronRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                                <span className="text-body-md text-[#323232] group-hover:text-primary transition-colors">Phục hồi tủy nhân tạo</span>
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Column 3: Consultation & Social */}
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-5">
                        <h3 className="font-heading text-heading-2 font-bold text-ink">Đăng ký tư vấn</h3>
                        <div className="flex flex-col gap-2">
                            <label className="text-label text-ink">Số điện thoại</label>
                            <div className="flex gap-3">
<<<<<<< HEAD
                                <Input placeholder="0123456789" className="flex-1" />
=======
                                <Input
                                    placeholder="0123456789"
                                    className="flex-1"
                                />
>>>>>>> origin/main
                                <Button className="px-7 shrink-0 text-[#ffffff]">
                                    Send
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <h3 className="font-heading text-heading-2 font-bold text-ink">Theo dõi chúng tôi tại</h3>
                        <div className="flex items-center gap-4">
                            <a href="https://www.facebook.com/nhakhoaoze.vn%20" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[#e7e7e7] shadow-md hover:shadow-lg flex items-center justify-center hover:-translate-y-1 transition-all duration-300">
                                <FaFacebookF className="size-5 text-[#1877F2]" />
                            </a>
                            <a href="https://www.tiktok.com/@nhakhoaganday_" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[#e7e7e7] shadow-md hover:shadow-lg flex items-center justify-center hover:-translate-y-1 transition-all duration-300">
                                <FaTiktok className="size-5 text-black" />
                            </a>
                            <a href="https://www.youtube.com/@NhakhoaOze.official" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[#e7e7e7] shadow-md hover:shadow-lg flex items-center justify-center hover:-translate-y-1 transition-all duration-300">
                                <FaYoutube className="size-5 text-[#FF0000]" />
                            </a>
                        </div>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;