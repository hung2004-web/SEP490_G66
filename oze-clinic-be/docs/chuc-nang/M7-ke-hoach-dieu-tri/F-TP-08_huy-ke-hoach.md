# F-TP-08 Hủy kế hoạch điều trị

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor`, `Receptionist` |
| API | `POST api/TreatmentPlans/{id}/cancel` |
| Code chính | `TreatmentPlansController.CancelAsync` → `TreatmentPlanService.CancelAsync` → `TreatmentPlanRepository` |

## 1. Chức năng này làm gì

Bác sĩ hoặc lễ tân dừng một kế hoạch bệnh nhân đã thấy (`Proposed`, `Approved`, `InProgress`) kèm lý do. Giai đoạn chưa làm chuyển `Cancelled`, giai đoạn đã xong giữ làm lịch sử; lưu người hủy, thời điểm hủy.

## 2. Tiền điều kiện

- Role `Doctor` hoặc `Receptionist`. Bác sĩ phải có quyền với kế hoạch (xem F-TP-02 mục 2); lễ tân không bị kiểm.
- Kế hoạch `Proposed`, `Approved` hoặc `InProgress`.
- Không có giai đoạn nào đang `InProgress`.
- Có lý do hủy.

## 3. API

**Request** `POST api/TreatmentPlans/{id:long}/cancel`, quyền `[Authorize(Roles = "Doctor,Receptionist")]`

Body `CancelTreatmentPlanRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `reason` | string | Có | `[Required]`, `MaxLength(500)`, được trim; chỉ khoảng trắng → lỗi | Lý do hủy |

```json
{ "reason": "Bệnh nhân chuyển sang phòng khám khác" }
```

**Response thành công** (`ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, message `"Cancel treatment plan success!"`), `status = "Cancelled"`, có `cancellationReason`, `cancelledAt`.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | `reason` thiếu/rỗng/quá 500 ký tự (annotation) | ProblemDetails mặc định |
| 404 | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 / 403 | (Bác sĩ) Không có hồ sơ / không có quyền | "Doctor profile not found" / "You do not have access to this patient's treatment plan" |
| 400 | `Draft`, `Completed`, `Cancelled`, `Superseded` | `TreatmentPlanMessage.PlanNotCancellable`: "This treatment plan is already completed or cancelled. A draft plan is deleted instead." |
| 400 | Lý do chỉ có khoảng trắng | `TreatmentPlanMessage.CancelReasonRequired`: "Please enter the reason for cancelling the treatment plan." |
| 400 | Còn giai đoạn `InProgress` | `TreatmentPlanMessage.StageStillInProgress`: "A treatment stage is still in progress. Please complete it before cancelling the plan." |
| 409 | Kế hoạch bị lưu cùng lúc | "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller truyền body và `CanViewAll()` — `TreatmentPlansController.cs:122-131`.
2. `LoadForStatusChangeAsync` (404; kiểm quyền nếu là bác sĩ) — `TreatmentPlanService.cs:230`, `:260-274`.
3. Trạng thái thuộc `Proposed`/`Approved`/`InProgress` — `TreatmentPlanService.cs:231-234`.
4. `reason = Clean(request.Reason)` (trim, rỗng → null), null → 400 — `TreatmentPlanService.cs:236-237`.
5. Có giai đoạn `InProgress` → 400 — `TreatmentPlanService.cs:240-241`.
6. Mọi giai đoạn `Scheduled` → `Cancelled`, `UpdatedAt = now`. Giai đoạn `Completed` giữ nguyên — `TreatmentPlanService.cs:243-248`.
7. Kế hoạch: `Status = "Cancelled"`, `CancellationReason`, `CancelledAt = now`, `CancelledByUserId = userId` (Id tài khoản Identity, không phải Id bác sĩ), `UpdatedAt` — `TreatmentPlanService.cs:250-254`.
8. Lưu, trả response — `TreatmentPlanService.cs:256-257`. `EstimatedTotalCost`, `TotalStages` không tính lại.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-07 | Hủy từ `Proposed`/`Approved`/`InProgress`, bắt buộc lý do, không hủy khi còn giai đoạn đang làm, giai đoạn chưa làm → `Cancelled`, lưu người hủy và thời điểm | `TreatmentPlanService.cs:231-254` |
| BR-TP-05 | `Draft` thì xóa ([F-TP-05](F-TP-05_xoa-ke-hoach-nhap.md)), không hủy | `TreatmentPlanService.cs:231-234` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` | `Proposed` / `Approved` / `InProgress` | `Cancelled` | `CancellationReason`, `CancelledAt`, `CancelledByUserId` (cột thêm bởi migration `20261109045352_AddTreatmentPlanCancellation`: `nvarchar(500)`, `datetimeoffset`, `nvarchar(450)`, đều nullable) |
| `TreatmentPlanStages` | `Scheduled` | `Cancelled` | `Completed` giữ nguyên |

## 7. Liên quan

- Trước đó: [F-TP-06](F-TP-06_de-xuat-ke-hoach.md), [F-TP-07](F-TP-07_duyet-ke-hoach.md), [F-TP-09](F-TP-09_giai-doan-dieu-tri.md).
- Sau đó: hoàn tiền phần ứng trước chưa dùng [F-PAY-05](../M8-thu-ngan/F-PAY-05_huy-hoa-don-hoan-tien.md) (chưa làm); lượt khám mới có thể tạo kế hoạch mới.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: hủy `Approved` → giai đoạn `Scheduled` thành `Cancelled`; hủy `InProgress` có giai đoạn `Completed` → giữ `Completed`; còn giai đoạn `InProgress` → 400; `Draft` → 400; lý do toàn khoảng trắng → 400; lễ tân hủy kế hoạch bệnh nhân bất kỳ; `progressPercent` sau hủy.

## 9. Còn thiếu / câu hỏi mở

- Không kiểm tra hóa đơn/tiền đã thu: hủy kế hoạch có hóa đơn chưa thanh toán hoặc tiền ứng trước không kích hoạt gì ở M8 (BR-PAY-07 chưa làm).
- Không ghi `AuditLog` dù BR-C11 yêu cầu ghi khi hủy.
- `CancelledByUserId` không có FK tới `AspNetUsers` (migration chỉ thêm cột) và không có trong response.
- Sau khi hủy, `progressPercent` có thể thành 100% nếu mọi giai đoạn còn lại đã xong (vì mẫu số bỏ giai đoạn hủy).
