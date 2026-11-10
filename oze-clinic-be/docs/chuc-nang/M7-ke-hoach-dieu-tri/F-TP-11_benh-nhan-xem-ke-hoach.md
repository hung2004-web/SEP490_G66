# F-TP-11 Bệnh nhân xem kế hoạch điều trị của mình

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7, câu hỏi Q14. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | `Patient` |
| API | ĐỀ XUẤT: `GET api/me/treatment-plans`, `GET api/me/treatment-plans/{id}` |
| Code chính | ĐỀ XUẤT: `TreatmentPlansController.GetMyPlansAsync` / `GetMyPlanDetailAsync` → `TreatmentPlanService` → `TreatmentPlanRepository.GetByPatientAsync` / `GetByIdWithStagesAsync` (dùng lại) |

## 1. Chức năng này làm gì

Bệnh nhân đăng nhập app xem các kế hoạch điều trị của chính mình: giai đoạn, chi phí dự kiến, ngày hẹn, tiến độ. Theo mặc định tạm Q14: xem trên app, **đồng ý tại quầy** (không có nút duyệt cho bệnh nhân).

## 2. Tiền điều kiện

- ĐỀ XUẤT: role `Patient`, tài khoản liên kết hồ sơ bệnh nhân (giống cách đặt lịch tìm hồ sơ, message có sẵn `AppointmentMessage.PatientProfileNotFound`: "No patient profile is linked to this account").
- ĐỀ XUẤT: chỉ trả kế hoạch `Proposed`, `Approved`, `InProgress`, `Completed`, `Cancelled`; **ẩn `Draft`** (bác sĩ chưa chốt) và có thể ẩn `Superseded`.

## 3. API

ĐỀ XUẤT **Request** `GET api/me/treatment-plans?includeClosed=false`, quyền `Patient`. Trả `List<TreatmentPlanSummaryResponse>` (đã có DTO, F-TP-03).

ĐỀ XUẤT **Request** `GET api/me/treatment-plans/{id}`, quyền `Patient`. Trả `TreatmentPlanProgressResponse` (F-TP-02); cân nhắc bỏ `notes` nội bộ của bác sĩ.

ĐỀ XUẤT **Lỗi**: 404 "No patient profile is linked to this account"; 404 `TreatmentPlanMessage.PlanNotFound` khi kế hoạch không thuộc bệnh nhân hoặc là `Draft` (trả 404, không 403, để không lộ sự tồn tại — BR-C07 "không phải chủ sở hữu 404").

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Lấy `userId` → hồ sơ bệnh nhân.
2. Danh sách: dùng lại `TreatmentPlanRepository.GetByPatientAsync` thêm điều kiện loại `Draft`; tính `ProgressPercent` như `TreatmentPlanService.cs:311-314`.
3. Chi tiết: `GetByIdWithStagesAsync`, kiểm `plan.PatientId == patient.Id` và `Status != Draft`, rồi `ToProgressResponse` (`TreatmentPlanService.cs:572-616`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| Q14 | Bệnh nhân xem trên app, đồng ý tại quầy | Chưa có |
| BR-C07 | Không phải chủ sở hữu → 404 | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| — | — | — | Chỉ đọc |

## 7. Liên quan

- Trước đó: [F-TP-06](F-TP-06_de-xuat-ke-hoach.md) đề xuất.
- Sau đó: bệnh nhân đến quầy, lễ tân [F-TP-07](F-TP-07_duyet-ke-hoach.md) ghi nhận đồng ý.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- Q14 chưa chốt cuối.
- Chưa xác định bệnh nhân có được xem ghi chú lâm sàng (`notes`) và chi phí thực tế không.
