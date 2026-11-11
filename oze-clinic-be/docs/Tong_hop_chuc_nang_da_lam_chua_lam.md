# Tổng hợp chức năng OZE: đã làm và chưa làm

Cập nhật ngày 04/11/2026 (đối chiếu source backend + frontend). Cột "Kiểm chứng" cho biết mức đã thử phía **máy chủ** (`oze-clinic-be`):

- **Chạy thật**: gọi API thật với database local.
- **Unit test**: có test tự động.
- **Chỉ code**: đã có API/service trong source, chưa ghi nhận chạy tay trong đợt này.
- **Mock / ComingSoon**: phía giao diện (`oze-clinic-fe`) chưa nối API thật.

Luồng chính của phòng khám: đặt lịch → xác nhận → check-in → hàng chờ → bắt đầu khám → (chụp X-quang nếu cần) → ghi nội dung / chẩn đoán / kê đơn → hoàn tất khám → thanh toán.

## 1. Đã làm (backend)

| Nhóm | Chức năng | Kiểm chứng |
|---|---|---|
| Tài khoản | Đăng ký (OTP), đăng nhập, làm mới token, đăng xuất, đổi mật khẩu, quên và đặt lại mật khẩu | Chạy thật: đăng ký, OTP, đăng nhập. Unit test Auth nhiều |
| Hồ sơ | Bệnh nhân tự xem và sửa hồ sơ (`api/me`, đổi số điện thoại qua OTP). Nhân viên tạo, xem, xóa mềm hồ sơ bệnh nhân, thêm hồ sơ y tế | Chạy thật: `api/me` |
| Quản trị | Nhân viên, vai trò, phòng (3 loại `GeneralTreatment`, `MinorSurgery`, `XRay`), dịch vụ, ca làm việc, lịch bác sĩ, trang chủ | Chạy thật: tạo nhân viên, phòng, ca làm |
| Dịch vụ | Dịch vụ có biến thể (`ServiceVariants`), giá và thời lượng chốt lúc đặt | Chạy thật |
| Đặt lịch | Danh sách dịch vụ đặt được, xem slot trống, khách vãng lai đặt (`guest-booking`), bệnh nhân đăng nhập đặt, quy tắc một loại phòng cho một lịch | Chạy thật |
| Lịch của tôi | `GET api/appointments/my` | Chạy thật |
| Xử lý lịch | Xác nhận, hủy, đổi lịch (nhân viên và bệnh nhân), kiểm tra hạn hủy/đổi (`Booking.CancelCutoffHours`) | Chạy thật |
| Check-in | Chỉ lịch đã xác nhận, đúng ngày hẹn, kèm mức ưu tiên và lý do | Chạy thật, unit test |
| Danh sách chờ | Theo bác sĩ, luật 3 nhóm (đúng giờ, đến trễ, vãng lai) và mức ưu tiên | Chạy thật, unit test |
| Mức ưu tiên | Đặt lúc check-in, đổi sau đó (`POST api/appointments/{id}/priority`) | Chạy thật, unit test |
| Hàng chờ gọi số | `GET/POST api/queues`, `call-next`, `call`, `skip` | Chỉ code, unit test (priority return / queue) |
| Ca bác sĩ | `GET api/doctor-schedules`, bắt đầu / kết thúc ca; quản lý mở lại ca (`POST api/work-shifts/{id}/reopen`) | Chỉ code |
| Khách vãng lai | `POST api/appointments/walk-in` (check-in ngay, vào hàng chờ) | Chỉ code |
| Kết thúc ca / NO_SHOW | Kết thúc ca: lịch quá giờ chưa đến → `NO_SHOW` (lý do ghi audit, không có cột `NoShowReason`). Đánh dấu NO_SHOW tay cho lịch đang chờ. Danh sách cần xử lý sau hết ca (`GET needs-attention`), đổi bác sĩ (`reassign-doctor`) | Chỉ code |
| **Khám bệnh** | **Bắt đầu khám** (`POST .../start-examination`: tạo phiếu, lịch `IN_SERVICE`). **Hoàn tất khám** (`POST .../complete-examination`: lịch `COMPLETED`, khóa phiếu) | Unit test bắt đầu khám |
| Nội dung khám | Ghi lý do / ghi chú lâm sàng (`PUT .../content`), dịch vụ trên phiếu, sơ đồ răng (`dental-chart`) | Chỉ code |
| Chẩn đoán | Thêm / sửa / xóa chẩn đoán; `DiagnosisCode` tùy chọn (nhập tự do, chưa có catalog ICD-10) | Chỉ code |
| Kê đơn | CRUD đơn và dòng thuốc, finalize / reopen (`api/examinations/{id}/prescription...`) | Chỉ code |
| Chỉ định / hàng chờ phim | Tạo chỉ định, hàng chờ kỹ thuật viên, hủy, hoàn thành. Khi chờ phim: lịch về `CHECKED_IN`, ẩn khỏi waiting list khám; khi xong phim: ưu tiên Urgent và đẩy lại hàng chờ | Unit test Imaging |
| Audit | Ghi sự kiện lịch hẹn: đặt, xác nhận, hủy, check-in, đổi lịch, đổi ưu tiên, bắt đầu/hoàn tất khám, NO_SHOW, đổi bác sĩ, … | Chạy thật (nhóm cũ); nhóm mới chỉ code |
| Theo dõi kế hoạch có sẵn | Xem tiến độ, bắt đầu / cập nhật / hoàn tất giai đoạn (`api/treatmentplans/...`) | Chỉ build / code từ trước |
| Hồ sơ y tế đọc | Xem theo bệnh nhân / phiếu khám (`MedicalRecordsController`) | Chỉ code |
| Dữ liệu | Migration đã có (ưu tiên, skip queue, cutoff hủy, cancel reason imaging, 1 đơn/phiếu, …). ~257 unit test trong project | Đã đếm trong source |

## 2. Chưa làm / còn thiếu

| Nhóm | Chức năng | Ghi chú |
|---|---|---|
| **Khám bệnh (còn lại)** | Tải file kết quả X-quang lên | Có entity `ImagingResult`, xem được trong chi tiết hồ sơ nếu đã có dữ liệu; **chưa có** API upload / tạo kết quả. `complete` chỉ đổi trạng thái chỉ định (+ webhook simulator) |
| | Lập kế hoạch điều trị **mới**, bệnh nhân xác nhận, sửa có lưu phiên bản | Hiện chỉ theo dõi giai đoạn của kế hoạch có sẵn; cột `PlanVersion` chưa dùng để version |
| | Phụ lục sau khi khóa phiếu (`ClinicalRecordAddendum`) | Khóa phiếu khi hoàn tất khám đã có; **chưa có** API addendum |
| | Danh mục mã ICD-10 để chọn | Chưa có, tùy chọn |
| **Tiếp đón** | Lễ tân đặt hộ khách (endpoint staff riêng, auto-confirm) | Hiện dùng chung `guest-booking` (anonymous) rồi confirm tay |
| | Hạn xác nhận lịch PENDING và cảnh báo quá hạn xác nhận | Có cutoff hủy/đổi lịch; **chưa** deadline / cảnh báo quá hạn xác nhận |
| **Tiền** | Hóa đơn, thanh toán, hoàn tiền | Có bảng `Invoice` / `Payment` / `RefundAdjustmentRequest`, chưa có API |
| **Quản trị** | Nhân viên tự sửa hồ sơ của mình (`PUT api/me` chỉ Patient) | Staff sửa qua `PUT api/staff/{userId}` |
| | API quản lý biến thể dịch vụ cho admin, API CRUD cấu hình hệ thống, duyệt đơn nghỉ phép | Config chỉ đọc nội bộ (`SystemConfiguration`); chưa có LeaveRequest |
| **Khác** | Nhắc tái khám, đối soát cuối ngày, API đọc thông báo trong hệ thống | `Notification` đã ghi khi tạo chỉ định phim (báo kỹ thuật viên); chưa có API đọc / follow-up / đối soát |
| **Giao diện** | Nối API thật cho hầu hết màn hình | FE: Auth login/register/OTP đăng ký/logout/refresh = thật. Quên MK / đặt lại MK / đổi MK / hồ sơ / admin (phòng, DV, NV, ca) / lịch hẹn / dashboard bác sĩ = **mock**. Đặt lịch, hàng chờ, khám, phim, tiếp đón, hóa đơn… = **ComingSoon** hoặc chưa có UI |

## 3. Việc tồn và rủi ro

- **Khóa bí mật trong repo** (JWT, mật khẩu `sa` trong `appsettings*.json`) cần xoay / đưa ra biến môi trường. SendGrid/Twilio key đang trống.
- **Múi giờ**: nghiệp vụ lịch/check-in đã dùng `ClinicClock` (`Asia/Ho_Chi_Minh`). Không còn phụ thuộc `DateTime.Now` của server như bản ghi 31/10.
- **CI/CD** (nếu chưa đổi): cần xác nhận lại có chạy test và migration trên nhánh feature hay chưa.
- Unit test đã phủ Auth, check-in, waiting list, start examination, imaging, ownership, patients, services (~257). Vẫn mỏng hoặc thiếu cho đặt lịch bệnh nhân, `/my`, đổi lịch, walk-in, end-shift, examination content / prescription / diagnoses.
- Tài liệu cũ có thể còn lệch (ví dụ `Tong_quan_he_thong_OZE.md`) — nên đồng bộ sau.
- Đã thêm lại `PUT api/patients/{id}` (11/11/2026) cho lễ tân và quản lý để sửa hồ sơ bệnh nhân (tên, ngày sinh, giới tính, nhóm máu, bảo hiểm, liên hệ khẩn cấp...). Bệnh nhân có tài khoản thì SĐT và email chỉ do bệnh nhân tự đổi qua `PUT api/me` (có OTP); để trống SĐT/email thì giữ giá trị cũ. Giao diện FE chưa gọi API này.
- **Lệch FE–BE lớn**: nhiều API khám / hàng chờ / walk-in / imaging đã có trên máy chủ nhưng giao diện chưa gọi.

## 4. Các quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Hàng chờ | Không có trạng thái riêng; danh sách chờ tính từ các lịch `CHECKED_IN` của bác sĩ trong ngày (có kết hợp queue call/skip) |
| Thứ tự chờ | Mức ưu tiên giảm dần, rồi: đã đặt lịch đúng giờ (theo giờ hẹn), đã đặt lịch đến trễ (theo giờ check-in), khách vãng lai (theo giờ check-in) |
| Check-in | Chỉ lịch `CONFIRMED`, đúng ngày hẹn, đến sớm hay trễ đều được |
| Hết ca | Lịch quá giờ chưa đến → `NO_SHOW` (lý do qua audit). Người đã check-in còn chờ → đưa vào `needs-attention` để lễ tân đổi bác sĩ, không tự NO_SHOW |
| Loại phòng | `GeneralTreatment`, `MinorSurgery`, `XRay` |
| Phiếu khám | Giữ riêng khỏi lịch hẹn, tạo khi bác sĩ bấm bắt đầu khám; khóa khi hoàn tất khám |
| Chờ phim | Chỉ định đang mở: bệnh nhân ra khỏi waiting list khám; hoàn thành chỉ định → ưu tiên Urgent, vào lại hàng chờ |
| Mã ICD-10 | Không bắt buộc, chỉ ghi ở bước chẩn đoán (free text) |
| Audit | Làm cho lịch hẹn; thanh toán và hoàn tiền khi có API |

## 5. Thứ tự đề xuất tiếp theo

1. Nối FE với API đã có: quên/đặt lại mật khẩu, `api/me`, admin (phòng / dịch vụ / nhân viên / ca), đặt lịch và lịch của tôi.
2. UI tiếp đón + bác sĩ: check-in, walk-in, hàng chờ (`queues` / waiting-list), bắt đầu / hoàn tất khám.
3. UI nội dung khám (ghi chú, sơ đồ răng, chẩn đoán, kê đơn) và luồng chỉ định / hoàn thành phim.
4. Upload kết quả X-quang; lập / xác nhận kế hoạch điều trị mới (kèm version nếu cần).
5. Hóa đơn và thanh toán; API đọc thông báo; (tùy chọn) catalog ICD-10, CRUD config, nghỉ phép.
6. Bổ sung unit test cho các luồng mới (walk-in, end-shift, examination, prescription).
