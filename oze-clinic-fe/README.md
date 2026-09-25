Các lệnh cơ bản của project:
npm run dev - chạy project
npm install - update package của project mỗi khi pull code mới về 
Cấu trúc của dự án:
assets: chứa hình ảnh, font chữ, icon và các file tĩnh khác
components: chứa các UI component có thể tái sử dụng ở nhiều nơi khác nhau (nút bấm, thẻ hiển thị, ô nhập liệu, ...)
pages: mỗi file đại diện cho 1 màn hình hoàn chỉnh, được ghép lại từ nhiều component nhỏ
layouts: chứa các khung bố cục dùng chung (header, sidebar, footer,...) để tránh lặp code giữa các trang
hooks: nơi lưu các custom hook (có thể có hoặc không, nên có khi logic phức tạp) thay vì dùng các hook có sẵn như useState, useEffect, ... 
services: xử lý các call API
utils: chứa các hàm tiện ích nhỏ, dùng đi dùng lại nhiều lần (định dạng ngày tháng, xử lý chuỗi, ...)
routes: khi project có nhiều trang, thì folder này có trách nhiệm tách cấu hình định tuyến ra khỏi App.jsx để file gọn gàng và dễ quản lý hơn
styles: chứa các file CSS toàn cục (folder này sẽ chứa các style được định nghĩa chung khi dùng Tailwind CSS)