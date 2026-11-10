# F-TP-10 Phiên bản mới khi phải sửa kế hoạch đã duyệt

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7, câu hỏi Q7. Mã quy tắc `BR-...` lấy từ đó.
> **Chưa làm.** Mọi nội dung API/luồng dưới đây là **ĐỀ XUẤT**, chưa có trong code.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ⬜ Chưa làm |
| Vai trò được dùng | `Doctor` (đề xuất) |
| API | ĐỀ XUẤT: `POST api/TreatmentPlans/{id}/new-version` |
| Code chính | ĐỀ XUẤT: `TreatmentPlansController.CreateNewVersionAsync` → `TreatmentPlanService.CreateNewVersionAsync` → `TreatmentPlanRepository` |

## 1. Chức năng này làm gì

Khi kế hoạch đã `Approved`/`InProgress` cần thay đổi (phát sinh trong lúc điều trị), bác sĩ không sửa trực tiếp (BR-TP-08) mà tạo một phiên bản mới ở `Draft`. Bản cũ chuyển `Superseded` khi bản mới được bệnh nhân duyệt lại (theo mặc định tạm của Q7).

## 2. Tiền điều kiện

- Đã có trong code: `TreatmentPlan.PlanVersion` (mặc định 1), trạng thái `Superseded` trong `TreatmentPlanConstants.cs:12` và check constraint `CK_TreatmentPlans_Status`.
- ĐỀ XUẤT: kế hoạch gốc `Approved` hoặc `InProgress`, không có giai đoạn `InProgress`, bác sĩ có quyền (`EnsureAccessAsync`).

## 3. API

ĐỀ XUẤT **Request** `POST api/TreatmentPlans/{id}/new-version`, quyền `Doctor`, body giống `UpdateTreatmentPlanRequest` (danh sách giai đoạn mong muốn của bản mới) kèm `reason` (lý do thay đổi).

ĐỀ XUẤT **Response**: `ApiResponse<TreatmentPlanProgressResponse>` của bản mới (`status = "Draft"`, `planVersion = bản cũ + 1`).

ĐỀ XUẤT **Lỗi**: 404 không có kế hoạch; 403 không có quyền; 400 kế hoạch không `Approved`/`InProgress`; 400 còn giai đoạn `InProgress`; 400 đã có một bản mới đang mở cho kế hoạch này.

## 4. Luồng xử lý trong code

Chưa có code. ĐỀ XUẤT:
1. Đọc kế hoạch gốc có tracking, kiểm quyền và trạng thái.
2. Tạo `TreatmentPlan` mới cùng `ExaminationId`, `PatientId`, `PlanVersion + 1`, `Status = Draft`; giai đoạn `Completed` của bản cũ **không** chép lại (giữ ở bản cũ làm lịch sử) hoặc chép sang ở trạng thái `Completed` — cần chốt.
3. Validate giai đoạn bằng `ValidateStagesAsync` hiện có.
4. Khi bản mới được duyệt ([F-TP-07](F-TP-07_duyet-ke-hoach.md)): bản cũ → `Superseded`, giai đoạn `Scheduled` của bản cũ → `Cancelled`, trong cùng một `SaveChanges`.
5. Cần thêm cột liên kết bản cũ (ví dụ `PreviousPlanId`) và nới `HasOpenPlanAsync` (hiện một lượt khám chỉ có một kế hoạch mở — BR-TP-01).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-08 | Kế hoạch đã duyệt không sửa trực tiếp | `TreatmentPlanService.cs:109-110` (chặn sửa); phần phiên bản chưa có |
| Q7 | Mặc định tạm: tạo phiên bản mới, bản cũ `Superseded`, bệnh nhân duyệt lại | Chưa có |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` (bản cũ) | `Approved` / `InProgress` | `Superseded` (khi bản mới duyệt) | ĐỀ XUẤT |
| `TreatmentPlans` (bản mới) | — | `Draft`, `PlanVersion + 1` | ĐỀ XUẤT |

## 7. Liên quan

- Trước đó: [F-TP-07](F-TP-07_duyet-ke-hoach.md), [F-TP-09](F-TP-09_giai-doan-dieu-tri.md).
- Sau đó: [F-TP-06](F-TP-06_de-xuat-ke-hoach.md), [F-TP-07](F-TP-07_duyet-ke-hoach.md) cho bản mới; hóa đơn của bản cũ ([F-PAY-01](../M8-thu-ngan/F-PAY-01_lap-hoa-don.md)) cần quy tắc chuyển công nợ / tiền ứng trước.

## 8. Kiểm thử

- Test hiện có: Chưa có (chưa có code).

## 9. Còn thiếu / câu hỏi mở

- Q7 chưa chốt: phiên bản mới hay thêm "giai đoạn phát sinh".
- Chưa xác định cách xử lý tiền ứng trước / hóa đơn của bản cũ khi chuyển sang bản mới.
- `HasOpenPlanAsync` hiện chặn hai kế hoạch mở cùng lượt khám — cần đổi khi làm.
- `ToProgressResponse` đã trả `planVersion` nhưng không trả liên kết tới bản trước/sau.
