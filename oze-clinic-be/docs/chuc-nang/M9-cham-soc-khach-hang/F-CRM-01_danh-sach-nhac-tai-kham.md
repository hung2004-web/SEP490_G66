# F-CRM-01 Danh sách bệnh nhân cần nhắc tái khám

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9 (BR-CRM-01), mục 4 "Khám mới hay tái khám", câu hỏi Q8.
>
> **Cập nhật 11/11/2026: đã làm, theo cách khác đề xuất ban đầu.** Ngày tái khám lấy từ **phiếu khám** (`Examination.FollowUpDate`, bác sĩ đặt qua `PUT api/examinations/{id}/follow-up`), không lấy từ giai đoạn kế hoạch. Bảng trên cùng là hiện trạng code; mục 1-9 bên dưới là đề xuất cũ theo giai đoạn kế hoạch, **giữ lại để tham khảo**, chưa viết lại.
>
> **BR-CRM-02:** chỉ lễ tân nhắc tái khám; quản lý không tham gia. Hệ thống tự nhắc (SMS, email, thông báo trong app) lúc 8h sáng cho người tái khám ngày hôm sau (`FollowUpReminder:RunHour = 8`, `DaysAhead = 1`, `FollowUpReminderBackgroundService`).

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng và thông báo |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | Nhắc từng người, nhắc hàng loạt: **chỉ `Receptionist`**. Xem danh sách, đặt lịch tái khám: `Receptionist`, `Doctor` (chỉ bệnh nhân của mình) |
| API | `GET api/examinations/follow-ups`, `POST api/examinations/{id}/remind-follow-up?force=`, `POST api/examinations/follow-ups/remind-due?targetDate=`, `POST api/examinations/{id}/follow-up/schedule`; bệnh nhân: `GET api/appointments/my-follow-ups` |
| Code chính | `FollowUpsController` → `ExaminationService.GetFollowUpsAsync` / `RemindFollowUpAsync` / `RemindDueFollowUpsAsync` / `ScheduleFollowUpAppointmentAsync` → `ExaminationRepository` |
| Kiểm thử | `OZE.UnitTest/Controllers/FollowUpsControllerTests.cs` (quyền), `Services/Examinations/*FollowUp*Tests.cs` |

## 1. Chức năng này làm gì

Lễ tân xem danh sách bệnh nhân có giai đoạn điều trị sắp đến ngày dự kiến (hoặc đã quá ngày mà chưa làm) thuộc kế hoạch đang hiệu lực, để gọi điện chốt giờ rồi đặt lịch tái khám cho giai đoạn đó (BR-CRM-01).

## 2. Tiền điều kiện

- Hiện trạng code có sẵn dữ liệu nguồn:
  - `TreatmentPlanStage.ScheduledDate` (`DateOnly?`), có index lọc `IX_TreatmentPlanStages_ScheduledDate` với `[StageStatus] = 'Scheduled'` (`TreatmentPlanStageConfiguration.cs:42-44`), rất hợp cho truy vấn này.
  - Ngày được nhập khi tạo/sửa kế hoạch (`ScheduledDate` của từng giai đoạn, `TreatmentPlanService.cs:536-557`) hoặc khi bác sĩ cập nhật giai đoạn đang làm với `NextStageScheduledDate` (`PATCH api/treatmentplans/{id}/stages/{stageId}`, `TreatmentPlanService.cs:411-443`).
  - `TreatmentPlanSummaryResponse` đã có `NextStageName`, `NextStageScheduledDate`.
- Kế hoạch `Approved` hoặc `InProgress` (định nghĩa tái khám, mục 4 tài liệu tổng).
- Q8 (tạm): nhắc **trước 2 ngày**, **lễ tân gọi điện**.

## 3. API

**ĐỀ XUẤT** `GET api/recall-reminders`, quyền `Receptionist`, `ClinicManager`

| Trường (query) | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `fromDate` | DateOnly | Không | Mặc định: không giới hạn dưới (lấy cả giai đoạn quá hạn) | Từ ngày dự kiến |
| `toDate` | DateOnly | Không | Mặc định `ClinicClock.Today` + `Recall.RemindDaysBefore` (2) | Đến ngày dự kiến |
| `doctorId` | int | Không | | Lọc theo bác sĩ lập kế hoạch |
| `includeContacted` | bool | Không | Mặc định `false` | Hiện cả bệnh nhân đã gọi xong (cần F-CRM-02) |
| `pageNumber`, `pageSize` | int | Không | | Phân trang (`PagedResult<T>` hiện có) |

**Response** (`ApiResponse<PagedResult<RecallReminderResponse>>`)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `PatientId`, `PatientCode`, `PatientName`, `PhoneNumber` | | Từ `Patients` |
| `TreatmentPlanId`, `PlanName`, `PlanStatus` | | Kế hoạch |
| `StageId`, `StageNumber`, `StageName`, `ServiceName` | | Giai đoạn cần làm |
| `ScheduledDate` | DateOnly | Ngày dự kiến |
| `DaysUntilDue` | int | Âm nếu quá hạn |
| `DoctorName` | string | Bác sĩ lập kế hoạch (`CreatedByDoctor`) |
| `HasUpcomingAppointment` | bool | Đã có lịch hẹn sắp tới chưa (xem mục 9) |
| `LastCallResult`, `LastCallAt`, `CallbackAt` | | Lần gọi gần nhất (từ F-CRM-02) |

**Lỗi đề xuất**

| HTTP | Khi nào | Message đề xuất |
|---|---|---|
| 400 | `fromDate` > `toDate` | mới, ví dụ `Date range is invalid. Please check again.` |
| 403 | Vai trò khác | (do ASP.NET Core) |

## 4. Luồng xử lý trong code

Chưa có code. Luồng đề xuất:

1. Đọc `Recall.RemindDaysBefore` từ `SystemConfigurations` (khóa mới, mặc định 2 theo Q8), tính `toDate` theo `ClinicClock.Today` (BR-C01).
2. Truy vấn giai đoạn: `StageStatus = 'Scheduled'`, `ScheduledDate` không null và trong khoảng; kế hoạch `Status` ∈ {`Approved`, `InProgress`}; bệnh nhân chưa xóa (`DeletedAt = null`).
3. Chỉ lấy giai đoạn **đầu tiên chưa làm** của mỗi kế hoạch (giống "giai đoạn kế tiếp" BR-TP-09), tránh nhắc nhiều giai đoạn cùng lúc.
4. Đánh dấu `HasUpcomingAppointment`: bệnh nhân có lịch `PENDING`/`CONFIRMED` từ hôm nay trở đi (tạm thời theo bệnh nhân, vì chưa có liên kết lịch–giai đoạn).
5. Ghép lần gọi gần nhất từ nhật ký F-CRM-02, ẩn bệnh nhân đã chốt lịch nếu `includeContacted = false`.
6. Xếp `ScheduledDate` tăng dần (quá hạn trước), phân trang.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-CRM-01 | Kế hoạch có ngày tái khám, lễ tân gọi chốt giờ rồi đặt lịch cho giai đoạn đó | Đề xuất: service này + F-CRM-02 |
| BR-TP-06 | Chỉ kế hoạch đã duyệt mới làm giai đoạn | Lọc `Approved`/`InProgress` |
| BR-TP-09 | Giai đoạn kế tiếp là giai đoạn đầu tiên đang làm hoặc chưa làm | Bước 3 |
| BR-C01 | Ngày tính theo giờ Việt Nam | Bước 1 |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| (không) | | | Chỉ đọc |
| `SystemConfigurations` | | thêm `Recall.RemindDaysBefore` = 2 | Seed mới (đề xuất) |

## 7. Liên quan

- Trước đó: F-TP-07 duyệt kế hoạch; F-TP-09 cập nhật giai đoạn với `NextStageScheduledDate`.
- Sau đó: F-CRM-02 ghi kết quả gọi; đặt lịch cho bệnh nhân (F-APT-09 lễ tân đặt hộ, chưa làm; hiện dùng `guest-booking` rồi xác nhận).

## 8. Kiểm thử

- **Test hiện có:** Đã triển khai đầy đủ bộ unit tests:
  - `Appointments/ScheduleFollowUpTests` (hẹn tái khám từ lượt khám).
  - `Examinations/SetFollowUpTests` (bác sĩ ghi nhận ngày và dặn dò tái khám).
  - `Examinations/RemindFollowUpTests` (nhắc thủ công từng bệnh nhân qua SMS/Email/InApp).
  - `Examinations/RemindDueFollowUpsTests` (nhắc tự động theo lô các ca tái khám đến hạn).
  - `Examinations/ScheduleFollowUpAppointmentTests` (đặt lịch hẹn tái khám chính thức).
- Ca kiểm thử trọng tâm:
  - Bác sĩ chỉ định ngày tái khám hợp lệ trong tương lai.
  - Phân quyền: Chỉ lễ tân hoặc bác sĩ phụ trách mới có quyền gửi nhắc nhở hoặc đặt lịch tái khám.
  - Xử lý gửi đồng thời đa kênh (In-App notification, SMS qua Twilio/mock, Email qua SMTP) non-blocking.
  - Xử lý tự động qua `FollowUpReminderBackgroundService` chạy nền hằng ngày lúc 08:00 (giờ VN).

## 9. Còn thiếu / câu hỏi mở

- Ghi nhận lịch sử cuộc gọi chi tiết (F-CRM-02) khi lễ tân gọi điện trực tiếp chốt lịch với bệnh nhân.
- Tích hợp thêm kênh Zalo ZNS / SMS Brandname chính thức khi triển khai môi trường production.
