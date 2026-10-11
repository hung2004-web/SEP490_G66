import React from 'react';
import { FaEye, FaHeart, FaShieldAlt, FaChartLine, FaSeedling, FaHandshake, FaBalanceScale, FaGem } from "react-icons/fa";
import { FiTarget } from "react-icons/fi";
import Breadcrumb from '../../components/navigation/Breadcrumb';
import bannerAboutUs from '../../assets/banner/banner_about_us.png';

const AboutUs = () => {
  const coreValues = [
    {
      title: "Tận tâm với khách hàng",
      desc: "Đặt sự hài lòng của khách hàng là ưu tiên số 1 trong mọi suy nghĩ và hành động.",
      icon: <FaHeart size={40} className="text-[#0032a0]" />
    },
    {
      title: "Integrity",
      desc: "Trân trọng lời nói của bạn và luôn nỗ lực giữ Integrity trong mọi hoàn cảnh.",
      icon: <FaShieldAlt size={40} className="text-[#0032a0]" />
    },
    {
      title: "Cầu tiến",
      desc: "\"Say yes\" với mọi mục tiêu, hành động quyết liệt và tin tưởng sẽ đạt được mục tiêu.",
      icon: <FaChartLine size={40} className="text-[#0032a0]" />
    },
    {
      title: "Coi mình là gốc rễ",
      desc: "Nhận mình là nguồn gốc khi có sự cố xảy ra và tìm giải pháp mới để khắc phục sự cố.",
      icon: <FaSeedling size={40} className="text-[#0032a0]" />
    },
    {
      title: "Đoàn kết",
      desc: "Hợp lực, đồng lòng và tôn trọng lẫn nhau vì lợi ích chung giúp tạo nên thành công lâu dài. Biết ơn, ghi nhận chân thành để giúp đồng đội tốt hơn.",
      icon: <FaHandshake size={40} className="text-[#0032a0]" />
    },
    {
      title: "Trung thực",
      desc: "Tôn trọng lẽ phải, không dối trá từ lời nói đến hành vi, không nói dối, sẵn sàng dũng cảm nói lên sự thật và sẵn sàng nhận lỗi khi phạm sai lầm.",
      icon: <FaBalanceScale size={40} className="text-[#0032a0]" />
    }
  ];

  return (
    <div className='w-full overflow-hidden bg-white'>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-4">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Về chúng tôi" }
          ]}
        />
      </div>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-16">
        
        {/* Page Header */}
        <div className="flex flex-col items-center text-center mt-6 mb-12">
          <div className="flex items-center justify-center gap-3 w-full max-w-sm m-auto mb-3">
            {/* Gradient line left */}
            <span className="grow h-px bg-gradient-to-r from-transparent to-[#0032a0]"></span>
            
            {/* Left star */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#0032a0">
              <path d="M12 0l2 10 10 2-10 2-2 10-2-10-10-2 10-2 2-10z" />
            </svg>
            
            <span className="text-[#0032a0] text-sm md:text-base font-semibold uppercase whitespace-nowrap tracking-widest">
              Giới thiệu về
            </span>

            {/* Right star */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#0032a0">
              <path d="M12 0l2 10 10 2-10 2-2 10-2-10-10-2 10-2 2-10z" />
            </svg>

            {/* Gradient line right */}
            <span className="grow h-px bg-gradient-to-l from-transparent to-[#0032a0]"></span>
          </div>
          
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-[#0032a0] uppercase tracking-tight">
            Nha Khoa OZE
          </h1>
        </div>

        {/* Main Content Grid: Text & Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center mb-16 lg:mb-24">
          <div className="flex flex-col gap-4 text-body-lg text-body text-justify leading-relaxed">
            <p>
              Với định vị là "Chuyên gia Răng Miệng cho Gia Đình Việt", Nha khoa Oze hướng tới xây dựng một hệ thống nha khoa uy tín — nơi mỗi gia đình đều có thể an tâm gửi trọn niềm tin chăm sóc sức khỏe nụ cười dài lâu.
            </p>
            <p>
              Trên hành trình ấy, chúng tôi không ngừng nâng cao chuyên môn, chuẩn hóa dịch vụ và ứng dụng công nghệ hiện đại nhằm mang đến giải pháp điều trị tối ưu, từ nha khoa tổng quát đến các dịch vụ chuyên sâu.
            </p>
            <p>
              Với phương châm "Luôn tận tâm – Luôn hoàn thiện", Nha khoa Oze đặt sự hài lòng của khách hàng và tinh thần đổi mới làm nền tảng phát triển, không ngừng nâng tầm trải nghiệm để kiến tạo những giá trị sức khoẻ bền vững.
            </p>
          </div>
          <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-border group">
            <img
              src={bannerAboutUs}
              alt="Banner Giới Thiệu Nha Khoa OZE"
              className="w-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>

        {/* Vision & Mission Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-16 lg:mb-24">
          {/* Vision Block */}
          <div className="flex-1 flex flex-col items-center text-center p-8 bg-[#f8fbff] rounded-2xl border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center size-20 rounded-full bg-[#0032a0] text-white shadow-sm mb-6">
              <FaEye size={36} />
            </div>
            <h3 className="font-heading text-2xl font-bold text-[#0032a0] uppercase mb-4">Tầm nhìn</h3>
            <p className="font-semibold text-ink mb-4 text-lg">Kiến tạo hệ sinh thái sức khoẻ nụ cười cho mọi người dân Việt.</p>
            <p className="text-body leading-relaxed text-justify">
              Nha khoa Oze hướng đến xây dựng một hệ thống phát triển bền vững, được khách hàng ghi nhận bằng niềm tin, sự hài lòng và lựa chọn lâu dài. Để hiện thực hóa tầm nhìn đó, chúng tôi không ngừng nâng cao năng lực chuyên môn, đầu tư công nghệ, chuẩn hóa chất lượng dịch vụ và kiến tạo trải nghiệm chăm sóc nhất quán tại mỗi cơ sở.
            </p>
          </div>

          {/* Mission Block */}
          <div className="flex-1 flex flex-col items-center text-center p-8 bg-[#f8fbff] rounded-2xl border border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center size-20 rounded-full bg-[#0032a0] text-white shadow-sm mb-6">
              <FiTarget size={36} />
            </div>
            <h3 className="font-heading text-2xl font-bold text-[#0032a0] uppercase mb-4">Sứ mệnh</h3>
            <p className="font-semibold text-ink mb-4 text-lg">Mang niềm vui, sức khỏe và sự tự tin đến tất cả khách hàng.</p>
            <p className="text-body leading-relaxed text-justify">
              Nha khoa Oze mang đến các giải pháp chăm sóc răng miệng toàn diện, được thực hiện bởi đội ngũ bác sĩ tận tâm và hỗ trợ bởi hệ thống công nghệ hiện đại. Qua mỗi hành trình thăm khám và điều trị, chúng tôi hướng tới việc giúp khách hàng cải thiện sức khỏe, hoàn thiện nụ cười và nâng cao chất lượng cuộc sống.
            </p>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <section className="w-full bg-[#f4f6f9] py-16 md:py-24 border-t border-gray-200">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
          <div className="text-center flex flex-col items-center mb-12">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#0032a0] text-white shadow-md">
              <FaGem size={28} />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#0032a0] uppercase tracking-tight">Giá trị cốt lõi</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {coreValues.map((val, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-8 text-center flex flex-col items-center shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="mb-6 flex justify-center items-center h-16 w-16">
                  {val.icon}
                </div>
                <h4 className="font-heading text-xl font-bold text-ink mb-4">{val.title}</h4>
                <p className="text-body text-justify leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default AboutUs;
