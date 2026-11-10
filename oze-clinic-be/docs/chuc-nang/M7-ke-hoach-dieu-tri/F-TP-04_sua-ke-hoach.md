# F-TP-04 Sửa kế hoạch điều trị

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `PUT api/TreatmentPlans/{id}` |
| Code chính | `TreatmentPlansController.UpdateAsync` → `TreatmentPlanService.UpdateAsync` → `TreatmentPlanRepository` |

## 1. Chức năng này làm gì

Bác sĩ gửi lại **toàn bộ** kế hoạch như mong muốn (tên, mô tả, danh sách giai đoạn). Giai đoạn có `id` được giữ và sửa, giai đoạn không có `id` là mới, giai đoạn cũ không gửi lên bị xóa; tất cả đánh số lại 1..n. Kế hoạch đang `Proposed` bị sửa thì quay về `Draft` để bệnh nhân xem lại.

## 2. Tiền điều kiện

- Role `Doctor`, có hồ sơ nhân viên, có quyền với kế hoạch (người tạo, hoặc đã khám / có lịch hẹn hợp lệ với bệnh nhân — xem F-TP-02 mục 2).
- Kế hoạch `Draft` hoặc `Proposed`.
- Kế hoạch chưa có hóa đơn nào (trên kế hoạch hoặc trên giai đoạn).

## 3. API

**Request** `PUT api/TreatmentPlans/{id:long}`, quyền `[Authorize(Roles = "Doctor")]`

Body `UpdateTreatmentPlanRequest` — giống [F-TP-01](F-TP-01_tao-ke-hoach-nhap.md) mục 3, thêm:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `stages[].id` | long? | Không | Phải là id giai đoạn của chính kế hoạch này, không lặp | Có: giữ và sửa giai đoạn đó. Không: tạo giai đoạn mới |

Ví dụ (giữ giai đoạn 14, bỏ giai đoạn 15, thêm một giai đoạn mới):

```json
{
  "planName": "Điều trị sâu răng 26 (sửa)",
  "stages": [
    { "id": 14, "serviceId": 12, "estimatedCost": 450000, "scheduledDate": "2026-11-12" },
    { "serviceId": 8, "scheduledDate": "2026-11-20" }
  ]
}
```

**Response thành công** (`ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, message `"Update treatment plan success!"`). Cấu trúc xem [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md); `status` luôn là `"Draft"` sau khi sửa.

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 400 | Body sai annotation | ProblemDetails mặc định |
| 404 | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 / 403 | Không có hồ sơ bác sĩ / không có quyền | "Doctor profile not found" / "You do not have access to this patient's treatment plan" |
| 400 | Kế hoạch không `Draft`/`Proposed` | `TreatmentPlanMessage.PlanNotEditable`: "Only a draft or proposed treatment plan can be edited." |
| 400 | Kế hoạch đã có hóa đơn | `TreatmentPlanMessage.PlanInvoiced`: "This treatment plan already has an invoice, so it can no longer be changed." |
| 400 / 404 | Lỗi giai đoạn (rỗng, dịch vụ, chi phí, ngày) | Như F-TP-01 |
| 400 | Một `id` giai đoạn xuất hiện hai lần | `TreatmentPlanMessage.DuplicateStage`: "A treatment stage is listed more than once." |
| 404 | `id` giai đoạn không thuộc kế hoạch | `TreatmentPlanMessage.StageNotFound`: "Treatment stage not found." |
| 409 | Người khác lưu kế hoạch cùng lúc (`TreatmentPlans.RowVersion`) | "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller — `TreatmentPlansController.cs:69-78`.
2. Đọc kế hoạch **có tracking** kèm giai đoạn — `TreatmentPlanService.cs:104`, `TreatmentPlanRepository.cs:30-38`; không có → 404 (`:105`).
3. `EnsureAccessAsync` (luôn kiểm, không có ngoại lệ cho lễ tân vì endpoint chỉ cho `Doctor`) — `TreatmentPlanService.cs:106`, `:31-39`.
4. Trạng thái `Draft` hoặc `Proposed` — `TreatmentPlanService.cs:109-110`.
5. `IsInvoicedAsync`: có `Invoice.TreatmentPlanId = id` **hoặc** có `InvoiceItem` trỏ tới giai đoạn của kế hoạch → 400 — `TreatmentPlanService.cs:111-112`, `TreatmentPlanRepository.cs:98-103`. Không loại hóa đơn `CANCELLED`.
6. `ValidateStagesAsync` như F-TP-01 (dịch vụ, chi phí, ngày) — `TreatmentPlanService.cs:114`, `:513-548`.
7. Lấy `keptIds` từ các giai đoạn có `id`; kiểm tra không trùng (400) và đều thuộc kế hoạch (404) — `TreatmentPlanService.cs:117-120`.
8. Xóa khỏi `plan.Stages` mọi giai đoạn không có trong `keptIds` — `TreatmentPlanService.cs:122-125`.
9. Duyệt theo thứ tự gửi: có `id` → lấy giai đoạn cũ, `UpdatedAt = now`; không `id` → tạo giai đoạn `Scheduled` mới. `ApplyStage(stage, ..., i + 1)` ghi đè số thứ tự, tên, mô tả, dịch vụ, chi phí, ngày — `TreatmentPlanService.cs:127-148`, `:550-558`.
10. Cập nhật `PlanName`, `Description`, `SetTotals` (tính lại `TotalStages`, `EstimatedTotalCost`) — `TreatmentPlanService.cs:150-152`.
11. Nếu đang `Proposed` → `Draft` — `TreatmentPlanService.cs:155-158`.
12. `plan.UpdatedAt = now`, `SaveChangesAsync` (EF kiểm `RowVersion` của `TreatmentPlans`) — `TreatmentPlanService.cs:160-162`, `TreatmentPlanConfiguration.cs:25`.
13. Đọc lại và map response — `TreatmentPlanService.cs:164-165`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-04 | Sửa khi `Draft`/`Proposed` và chưa có hóa đơn; `Proposed` → `Draft`; giữ/thêm/xóa giai đoạn, đánh số lại | `TreatmentPlanService.cs:109-158` |
| BR-TP-02, BR-TP-03 | Như F-TP-01 | `TreatmentPlanService.cs:513-548` |
| BR-TP-08 | Kế hoạch đã duyệt không sửa trực tiếp | `TreatmentPlanService.cs:109-110` |
| BR-C10 | Hai người sửa cùng lúc → 409 | `RowVersion` của `TreatmentPlans` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` | `Draft` / `Proposed` | `Draft` | `PlanName`, `Description`, `TotalStages`, `EstimatedTotalCost`, `UpdatedAt` đổi |
| `TreatmentPlanStages` | n dòng | m dòng | Dòng bị bỏ: xóa cứng; dòng giữ: cập nhật; dòng mới: `Scheduled` |

## 7. Liên quan

- Trước đó: [F-TP-01](F-TP-01_tao-ke-hoach-nhap.md); có thể sau [F-TP-06](F-TP-06_de-xuat-ke-hoach.md) khi bệnh nhân muốn đổi.
- Sau đó: [F-TP-06](F-TP-06_de-xuat-ke-hoach.md) đề xuất lại.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: giữ/thêm/xóa giai đoạn và đánh số lại; `Proposed` → `Draft`; `Approved` → 400; có hóa đơn → 400; `id` trùng → 400; `id` của kế hoạch khác → 404; giữ giai đoạn có ngày đã qua → 400 (xem mục 9); sửa đồng thời → 409.

## 9. Còn thiếu / câu hỏi mở

- Không chạm `Examination.UpdatedAt` và không kiểm lượt khám còn `InProgress`: kế hoạch `Draft` vẫn sửa được sau khi lượt khám đã khóa. Tài liệu không nói rõ có cho phép không.
- Bất kỳ bác sĩ nào có quyền với bệnh nhân (không chỉ người lập) đều sửa được.
- Giai đoạn giữ lại có `scheduledDate` đã qua sẽ làm sửa thất bại ("Scheduled date is invalid...") vì kiểm lại ngày ≥ hôm nay cho mọi giai đoạn.
- `IsInvoicedAsync` tính cả hóa đơn `CANCELLED`; BR-PAY-02 nói bỏ qua hóa đơn đã hủy — chưa thống nhất nên hiểu "đã lập hóa đơn" thế nào.
- Phần sửa kế hoạch đã duyệt chờ [F-TP-10](F-TP-10_phien-ban-moi.md) (Q7).
