# F-TP-05 Xóa kế hoạch điều trị nháp

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `DELETE api/TreatmentPlans/{id}` |
| Code chính | `TreatmentPlansController.DeleteAsync` → `TreatmentPlanService.DeleteAsync` → `TreatmentPlanRepository.Remove` |

## 1. Chức năng này làm gì

Bác sĩ bỏ hẳn một kế hoạch còn nháp (bệnh nhân chưa thấy). Kế hoạch và các giai đoạn bị xóa cứng. Kế hoạch bệnh nhân đã thấy (`Proposed` trở đi) phải hủy bằng [F-TP-08](F-TP-08_huy-ke-hoach.md) để giữ lịch sử.

## 2. Tiền điều kiện

- Role `Doctor`, có hồ sơ, có quyền với kế hoạch (xem F-TP-02 mục 2).
- Kế hoạch `Draft`, chưa có hóa đơn.

## 3. API

**Request** `DELETE api/TreatmentPlans/{id:long}`, quyền `[Authorize(Roles = "Doctor")]`. Không có body.

**Response thành công** (`ApiResponse` không có `data`, HTTP 200, message `"Delete treatment plan success!"`)

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 / 403 | Không có hồ sơ bác sĩ / không có quyền | "Doctor profile not found" / "You do not have access to this patient's treatment plan" |
| 400 | Kế hoạch không `Draft` | `TreatmentPlanMessage.OnlyDraftCanBeDeleted`: "Only a draft treatment plan can be deleted." |
| 400 | Đã có hóa đơn | `TreatmentPlanMessage.PlanInvoiced`: "This treatment plan already has an invoice, so it can no longer be changed." |
| 409 | Kế hoạch bị sửa cùng lúc | "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller — `TreatmentPlansController.cs:83-91`.
2. Đọc kế hoạch có tracking kèm giai đoạn; không có → 404 — `TreatmentPlanService.cs:173-174`.
3. `EnsureAccessAsync` — `TreatmentPlanService.cs:175`.
4. `Status == "Draft"` — `TreatmentPlanService.cs:178`.
5. `IsInvoicedAsync` → 400 nếu có — `TreatmentPlanService.cs:179-180`, `TreatmentPlanRepository.cs:98-103`.
6. `Remove(plan)` rồi `SaveChangesAsync`; giai đoạn xóa theo cascade (`FK_TreatmentPlanStages_Plans` `OnDelete(Cascade)`) — `TreatmentPlanService.cs:182-183`, `TreatmentPlanRepository.cs:106-109`, `TreatmentPlanStageConfiguration.cs:24-28`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-05 | Xóa chỉ khi `Draft` và chưa lập hóa đơn | `TreatmentPlanService.cs:178-180` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` | 1 dòng `Draft` | Xóa cứng | |
| `TreatmentPlanStages` | n dòng | Xóa cứng | Cascade |

## 7. Liên quan

- Trước đó: [F-TP-01](F-TP-01_tao-ke-hoach-nhap.md), [F-TP-04](F-TP-04_sua-ke-hoach.md).
- Sau đó: lượt khám có thể tạo kế hoạch mới (F-TP-01) nếu còn `InProgress`.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: xóa `Draft` thành công và giai đoạn bị xóa; `Proposed` → 400; có hóa đơn → 400; bác sĩ không liên quan → 403.

## 9. Còn thiếu / câu hỏi mở

- Kế hoạch `Proposed` bị sửa ([F-TP-04](F-TP-04_sua-ke-hoach.md)) quay về `Draft`, nên sau đó xóa cứng được dù bệnh nhân đã từng thấy — chưa rõ có đúng ý "giữ lịch sử" không.
- Không có `AuditLog` cho xóa.
