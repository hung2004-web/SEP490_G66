# Tổng quan hệ thống OZE Dental Clinic (hiện tại)

Tài liệu tóm tắt hiện trạng hệ thống của nhóm SEP490_G66 tại ngày **29/10/2026**. Nội dung lấy từ code trong repo, database, biên bản họp với bác sĩ và Jira. Mục "Chưa làm" và "Rủi ro" ghi thẳng những chỗ còn thiếu, không tô vẽ.

---

## 1. Bài toán và người dùng

Hệ thống quản lý phòng khám nha khoa OZE: đặt lịch, tiếp đón, khám bệnh, chụp phim, kế hoạch điều trị, đơn thuốc, hóa đơn.

| Vai trò (role) | Việc chính |
|---|---|
| Patient (bệnh nhân) | Đặt lịch, xem và hủy lịch của mình, quản lý hồ sơ cá nhân |
| Receptionist (lễ tân, kiêm thu ngân) | Gọi điện xác nhận lịch, check-in, hủy hoặc đổi lịch, thu tiền |
| Doctor (bác sĩ) | Khám, hỏi tiền sử, chỉ định chụp phim, chẩn đoán, kế hoạch điều trị, kê đơn |
| DentalImagingTechnician (kỹ thuật viên chụp phim) | Chụp và tải ảnh lên, không chẩn đoán |
| ClinicManager (quản lý phòng khám) | Quản lý nhân viên, ca làm, dịch vụ, phòng, cấu hình |

## 2. Kiến trúc

**Backend:** ASP.NET Core 8, Clean Architecture, SQL Server, Entity Framework Core 8.

| Project | Vai trò |
|---|---|
| `OZE` | Controllers, Middlewares (`GlobalExceptionMiddleware`), Filters (`ApiResponseValidationFilter`), `Program.cs` |
| `OZE.Application` | Services, interfaces, helper (chuẩn hóa số điện thoại, `ConditionGuard`) |
| `OZE.Domain` | Entity (31 bảng) |
| `OZE.Persistence` | `AppIdentityDbContext`, Repositories, Configurations, Migrations |
| `OZE.Common` | DTO (request/response), Constants, Exceptions, `ApiResponse<T>` |
| `OZE.UnitTest` | xUnit, Moq, FluentAssertions |

**Luồng một request:** GlobalExceptionMiddleware → HTTPS → CORS → JWT Authentication → Authorization (theo role) → validation filter → Controller → Service (qua interface) → Repository → DbContext → SQL Server.

**Công nghệ đi kèm:** ASP.NET Identity, JWT kèm refresh token, SendGrid (email), Twilio (SMS), AutoMapper, OTP lưu tạm trong bộ nhớ (`IMemoryCache`) qua 3 interface (`IPendingRegistrationStore`, `IPasswordResetStore`, `IPendingProfileUpdateStore`), Swagger. **Redis đang có kế hoạch, chưa triển khai.**

**Frontend (repo `oze-clinic-fe`):** React 19, Vite, Tailwind 4, React Router 7, Axios. Trang chia theo vai trò (`admin`, `doctor`, `imagingTechnician`, `patient`, `receptionist`, `common`), có `RequireRole`. Trang bác sĩ, lễ tân, kỹ thuật viên hiện mới là dashboard tạm.

**Triển khai:** `Dockerfile` (nhiều tầng, .NET 8), `docker-compose.yml` (chỉ chạy API, SQL Server nằm ngoài), GitHub Actions `deploy.yml` (build, tự deploy lên server self-hosted).

## 3. Cơ sở dữ liệu

Database `OzeDatabase`, 9 migration (mới nhất `AddCancelCutoffHoursConfig`).

**Nhóm bảng chính:** tài khoản và vai trò (Identity, `StaffProfile`, `UserRefreshToken`), bệnh nhân (`Patient`, `PatientMedicalProfile`, `PatientDocument`), lịch hẹn (`Appointment`, `AppointmentServices`, `QueueEntry`, `StaffSchedule`, `Room`), dịch vụ (`ServiceCategory`, `Service`), khám (`Examination`, `ClinicalDiagnosis`, `DentalChartEntry`, `ClinicalRecordAddendum`), cận lâm sàng (`ImagingRequest`, `ImagingResult`), điều trị (`TreatmentPlan`, `TreatmentPlanStage`), đơn thuốc (`Prescription`, `PrescriptionItem`), tài chính (`Invoice`, `InvoiceItem`, `Payment`, `RefundAdjustmentRequest`), khác (`SystemConfiguration`, `AuditLog`, `Notification`).

**Số điện thoại** lưu dạng E.164 (`+84xxxxxxxxx`).

**Trạng thái quan trọng:**

| Đối tượng | Giá trị |
|---|---|
| Lịch hẹn | `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_SERVICE`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| Hàng chờ | `WAITING`, `CALLED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED` |
| Lần khám | `InProgress`, `Completed`, `Locked` |
| Yêu cầu chụp phim | `Pending`, `InProgress`, `Completed`, `Cancelled` |
| Kế hoạch điều trị | `Draft`, `Proposed`, `Approved`, `InProgress`, `Completed`, `Cancelled`, `Superseded` |
| Giai đoạn điều trị | `Scheduled`, `InProgress`, `Completed`, `Cancelled` |

**Cấu hình trong bảng `SystemConfigurations`** (sửa trong DB, không cần sửa code): `Booking.MaxDaysAhead` (30), `Booking.MinHoursAhead` (2), `Booking.CancelCutoffHours` (24), `Clinic.SlotDurationMinutes` (30), `CheckIn.EarlyMinutes` (30), `CheckIn.LateMinutes` (15), `Queue.AutoExpireMinutes` (60), `Clinic.WorkStartTime` (08:00), `Clinic.WorkEndTime` (17:00). Riêng `Booking.GeneralExamServiceCode` chưa được seed, phải thêm tay.

## 4. API hiện có

| Nhóm | Endpoint chính |
|---|---|
| Auth | register, verify-otp, resend-otp, login (bằng email hoặc số điện thoại), refresh-token, logout, change-password, confirm-email, forgot-password, verify-reset-otp, reset-password |
| Me | xem và sửa hồ sơ, xác thực số điện thoại bằng OTP |
| Appointments | bookable-services, available-slots, guest-booking (ẩn danh), danh sách, chi tiết, confirm, cancel, check-in |
| Patients | danh sách, chi tiết, theo mã, tạo, sửa, xóa, thêm hồ sơ y tế |
| Services | danh sách, active, chi tiết, theo mã, tạo, sửa, đổi trạng thái, xóa |
| Rooms, Roles, Staff, WorkShift | CRUD tương ứng (Staff có activate và deactivate) |
| DoctorSchedules | xem lịch bác sĩ |
| MedicalRecords | xem theo bệnh nhân và theo lần khám |
| ImagingRequests | tạo và xem chỉ định chụp phim theo lần khám |
| TreatmentPlans | xem tiến độ, bắt đầu, cập nhật, hoàn thành giai đoạn |
| Home | dữ liệu trang chủ |

## 5. Nghiệp vụ đặt lịch (đã chốt)

1. **Đăng ký tài khoản** mới xác thực bằng OTP. OTP chỉ dùng cho đăng ký (và quên mật khẩu).
2. **Đặt lịch:** khách chọn dịch vụ. "Khám tổng quát" luôn tự thêm, giá 0. Nhóm dịch vụ có cờ `AllowMultipleSelection`: nhóm "Nha khoa tổng quát" chọn nhiều, các nhóm khác (niềng răng...) chỉ chọn một. Giá nằm ở dịch vụ, nhóm không có giá. Thời lượng slot bằng tổng thời gian các dịch vụ, cùng một loại phòng.
3. **Mọi lịch mới ở trạng thái `PENDING`** và vẫn giữ chỗ. Lễ tân gọi điện xác nhận thì thành `CONFIRMED` (kèm SMS và email). Chỉ `CANCELLED` và `NO_SHOW` mới nhả chỗ.
4. **Check-in và hủy** chỉ nhận lịch `PENDING` hoặc `CONFIRMED`.
5. **Bệnh nhân hủy:** chỉ lịch của chính mình (người khác nhận 404), chỉ khi lịch còn `PENDING`, và trước giờ khám ít nhất 24 giờ. Lịch `CONFIRMED` hoặc sát giờ thì gọi lễ tân. Lễ tân và quản lý hủy mọi lúc, bắt buộc có lý do. Hủy xong các dịch vụ chưa làm chuyển `CANCELLED`.
6. **Đổi lịch** (chưa làm): bệnh nhân tự đổi lịch `PENDING` trong hạn, lịch `CONFIRMED` phải qua lễ tân. Có hướng dẫn chi tiết ở `docs/Huong_dan_reschedule_appointment.md`.

## 6. Căn cứ nghiệp vụ từ phòng khám

Biên bản họp với bác sĩ (41 câu hỏi đáp), các điểm chính: lễ tân kiêm thu ngân; bác sĩ trực tiếp hỏi tiền sử; bác sĩ chỉ định chụp phim, kỹ thuật viên không chẩn đoán; chụp lại do lỗi kỹ thuật thì phòng khám chịu phí; chụp xong quay lại được ưu tiên; xét nghiệm máu gửi ngoài; kế hoạch điều trị có ngày tái khám, lễ tân gọi chốt giờ; không bán thuốc, chỉ kê tên và liều; thanh toán không phải lúc đến; ứng trước 1/3 đến 1/2, "làm cái gì trả cái đó"; hoàn tiền bằng ứng trước trừ phần đã làm, do chủ phòng khám quyết; trễ hạn trả góp chỉ nhắc qua điện thoại. Phần báo cáo cuối ngày chưa rõ.

Góp ý hội đồng cần đáp ứng: có bằng chứng khảo sát thực tế, đăng ký nhiều dịch vụ một lúc, xử lý ảnh chụp chưa đạt, thông tin ngoài ảnh tự điền từ DICOM, thể hiện trạng thái bệnh nhân và hàng đợi khi đi chụp phim, bổ sung chăm sóc khách hàng (nhắc tái khám) và thu ngân, công nợ, hoàn tiền, chốt ca.

## 7. Kiểm thử

**212 unit test, đều qua** (lần chạy gần nhất): xác thực (`AuthService` và `AuthController`, phần lớn), bệnh nhân, dịch vụ, chỉ định chụp phim, kiểm tra chủ sở hữu lịch hẹn. **Chưa có test** cho đặt lịch, xác nhận, hủy theo hạn, check-in, kế hoạch điều trị, đơn thuốc.

## 8. Tiến độ Jira (dự án SCRUM, nhãn `sprint-N`)

- **Sprint 5:** phần xác thực, sửa lỗi đặt lịch, quên mật khẩu, xác minh OTP, hủy lịch, xác nhận lịch đã xong; còn dở: danh sách và chi tiết lịch hẹn, hóa đơn, chẩn đoán, kế hoạch điều trị, đơn thuốc, đơn nghỉ phép.
- **Sprint 6** (đã lập, Start date tạm 29/10): các task còn dở của sprint 5, kế hoạch điều trị và hồ sơ bệnh án (danh sách, chi tiết), đặt lịch khi đăng nhập, lịch của tôi, đổi lịch, hàng chờ khi check-in, NO_SHOW và walk-in, kết quả chụp phim, thanh toán và hoàn tiền (chờ họp đối tác), test cho lịch hẹn. Đã chia cho 5 thành viên và điền estimate.

## 9. Chưa làm

| Việc | Ghi chú |
|---|---|
| Đặt lịch cho bệnh nhân **đã đăng nhập** | Chỉ có `guest-booking`; số điện thoại đã có tài khoản bị yêu cầu đăng nhập nhưng chưa có endpoint nhận token. Lỗ hổng lớn nhất |
| `GET api/appointments/my` | Bệnh nhân chưa xem được lịch của mình |
| Đổi lịch | Chưa có API |
| Hàng chờ | Có entity `QueueEntry`, check-in chưa đưa bệnh nhân vào hàng chờ, chưa có API |
| Khám bệnh, chẩn đoán, tạo kế hoạch điều trị, kê đơn | Chưa có API tạo (chỉ xem tiến độ điều trị) |
| Kết quả chụp phim | Chỉ tạo và xem chỉ định, chưa có API tải ảnh lên |
| Hóa đơn, thanh toán, hoàn tiền | Có entity, chưa có API; còn chờ quy tắc từ phòng khám |
| Đánh dấu `NO_SHOW`, lịch walk-in cho khách đến quầy | Chưa có |
| Duyệt đơn nghỉ phép, API sửa cấu hình | Chưa có |
| Nhắc tái khám, đối soát cuối ngày | Chưa có |
| Ghi lịch sử thay đổi (`AuditLog`), thông báo trong hệ thống (`Notification`) | Entity có, chưa dùng |
| Màn hình FE cho bác sĩ, lễ tân, kỹ thuật viên | Mới có dashboard tạm; có màn hình mẫu `man_hinh_kham_benh.html` |

## 10. Rủi ro và việc cần xử lý

1. **Khóa bí mật nằm trong repo public** (khóa JWT, mật khẩu DB, khóa SendGrid trong `appsettings*.json` và `.env.example`): cần xoay (rotate) khóa và bỏ khỏi lịch sử git.
2. **Múi giờ:** code dùng `DateTime.Now`, server UTC sẽ lệch 7 giờ; cần đặt `TZ=Asia/Ho_Chi_Minh` khi deploy.
3. **CI/CD:** `deploy.yml` chạy cả trên nhánh `feat/**` và pull request, không chạy test, không có bước chạy migration. Nên tách job kiểm tra (build và test) khỏi job deploy, deploy chỉ khi merge vào `main`, và bật bảo vệ nhánh `main`.
4. **Migration production:** cần chạy migration `AddCancelCutoffHoursConfig` (và các migration mới) khi deploy.
5. **Dữ liệu mẫu:** DB local còn trống (chưa có danh mục dịch vụ và dòng `Booking.GeneralExamServiceCode`), chưa chạy thử đặt lịch end-to-end.
6. **OTP lưu trong bộ nhớ** sẽ mất khi khởi động lại hoặc chạy nhiều bản sao; cần Redis khi mở rộng.
7. Một số file có dấu cách ở cuối tên (`DoctorScheduleService .cs`, `MedicalRecordRepository .cs`) và một hàm chưa cài đặt (`WorkShiftRepository`), đã có task xử lý.

## 11. Tài liệu liên quan

- `docs/Huong_dan_reschedule_appointment.md`: hướng dẫn làm chức năng đổi lịch.
- `man_hinh_kham_benh.html`: màn hình mẫu bác sĩ khám và lập kế hoạch (dữ liệu mô phỏng).
- Sơ đồ kiến trúc: `Achitech System.drawio` (System Overview và System Architecture).
