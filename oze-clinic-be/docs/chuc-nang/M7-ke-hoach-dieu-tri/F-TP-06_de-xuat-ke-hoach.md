# F-TP-06 Đề xuất kế hoạch cho bệnh nhân

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/TreatmentPlans/{id}/propose` |
| Code chính | `TreatmentPlansController.ProposeAsync` → `TreatmentPlanService.ProposeAsync` → `TreatmentPlanRepository` |

## 1. Chức năng này làm gì

Bác sĩ chốt bản nháp và đưa cho bệnh nhân xem: `Draft` → `Proposed`. Sửa lại sau đó ([F-TP-04](F-TP-04_sua-ke-hoach.md)) sẽ đưa về `Draft`.

## 2. Tiền điều kiện

- Role `Doctor`, có hồ sơ, có quyền với kế hoạch (xem F-TP-02 mục 2).
- Kế hoạch `Draft`, có ít nhất một giai đoạn.

## 3. API

**Request** `POST api/TreatmentPlans/{id:long}/propose`, quyền `[Authorize(Roles = "Doctor")]`. Không có body.

**Response thành công** (`ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, message `"Propose treatment plan success!"`), `status = "Proposed"`. Cấu trúc xem [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md).

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|
| 404 | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 / 403 | Không có hồ sơ bác sĩ / không có quyền | "Doctor profile not found" / "You do not have access to this patient's treatment plan" |
| 400 | Không phải `Draft` | `TreatmentPlanMessage.OnlyDraftCanBeProposed`: "Only a draft treatment plan can be proposed to the patient." |
| 400 | Không có giai đoạn | `TreatmentPlanMessage.StagesRequired`: "Please add at least one treatment stage." |
| 409 | Kế hoạch bị lưu cùng lúc | "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

1. Controller — `TreatmentPlansController.cs:96-104`.
2. `LoadForStatusChangeAsync(..., canViewAll: false)`: đọc có tracking (404), luôn `EnsureAccessAsync` — `TreatmentPlanService.cs:192`, `:260-274`.
3. `Status == "Draft"` — `TreatmentPlanService.cs:193`.
4. `Stages.Count > 0` — `TreatmentPlanService.cs:194`.
5. `Status = "Proposed"`, `UpdatedAt = UtcNow`, lưu — `TreatmentPlanService.cs:196-199`.
6. Trả `ToProgressResponse(plan)` từ entity đang track (có `Patient`, `CreatedByDoctor`, `Stages.Service` đã include) — `TreatmentPlanService.cs:200`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-06 | `Draft` → `Proposed` do bác sĩ | `TreatmentPlanService.cs:193-196` |
| BR-TP-02 | Có ít nhất một giai đoạn | `TreatmentPlanService.cs:194` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlans` | `Draft` | `Proposed` | `UpdatedAt` |

## 7. Liên quan

- Trước đó: [F-TP-01](F-TP-01_tao-ke-hoach-nhap.md), [F-TP-04](F-TP-04_sua-ke-hoach.md).
- Sau đó: [F-TP-07](F-TP-07_duyet-ke-hoach.md) duyệt, [F-TP-04](F-TP-04_sua-ke-hoach.md) sửa (về `Draft`), [F-TP-08](F-TP-08_huy-ke-hoach.md) hủy, [F-TP-11](F-TP-11_benh-nhan-xem-ke-hoach.md) bệnh nhân xem (chưa làm).

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: `Draft` → `Proposed`; `Proposed`/`Approved` → 400; bác sĩ không liên quan → 403.

## 9. Còn thiếu / câu hỏi mở

- Không kiểm lại dịch vụ còn hoạt động hay ngày dự kiến còn hợp lệ tại thời điểm đề xuất.
- Không gửi thông báo cho bệnh nhân (Q14: bệnh nhân xem trên app, đồng ý tại quầy).
