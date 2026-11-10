# F-TP-09 Bắt đầu / cập nhật / hoàn thành giai đoạn, xem tiến độ

> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M7. Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M7 Kế hoạch điều trị |
| Trạng thái | ✅ Đã có API |
| Vai trò được dùng | `Doctor` |
| API | `POST api/TreatmentPlans/{id}/stages/{stageId}/start`, `PATCH api/TreatmentPlans/{id}/stages/{stageId}`, `POST api/TreatmentPlans/{id}/stages/{stageId}/complete`, `GET api/TreatmentPlans/{id}/progress` |
| Code chính | `TreatmentPlansController.StartStageAsync` / `UpdateStageAsync` / `CompleteStageAsync` / `GetProgressAsync` → `TreatmentPlanService` cùng tên → `TreatmentPlanRepository` |

## 1. Chức năng này làm gì

Bác sĩ thực hiện kế hoạch đã duyệt theo từng giai đoạn: bắt đầu giai đoạn kế tiếp (kế hoạch thành `InProgress` ở lần đầu), ghi chú và chi phí thực tế trong lúc làm, hẹn ngày cho giai đoạn sau, rồi hoàn thành giai đoạn (kế hoạch thành `Completed` khi hết việc). API tiến độ trả % hoàn thành và giai đoạn kế tiếp.

## 2. Tiền điều kiện

- Role `Doctor`, có hồ sơ, có quyền với kế hoạch (người tạo, hoặc đã khám / có lịch hẹn hợp lệ với bệnh nhân).
- **start**: kế hoạch `Approved` hoặc `InProgress`; giai đoạn `Scheduled`; mọi giai đoạn có `stageNumber` nhỏ hơn đã `Completed` hoặc `Cancelled`.
- **PATCH**: giai đoạn `InProgress` (không kiểm trạng thái kế hoạch).
- **complete**: kế hoạch `InProgress`, giai đoạn `InProgress`.

## 3. API

### 3.1 Bắt đầu giai đoạn

**Request** `POST api/TreatmentPlans/{id:long}/stages/{stageId:long}/start`, quyền `Doctor`. Không có body.
**Response** `ApiResponse<TreatmentPlanProgressResponse>`, HTTP 200, message `"Start treatment stage success!"`.

### 3.2 Cập nhật giai đoạn đang làm

**Request** `PATCH api/TreatmentPlans/{id:long}/stages/{stageId:long}`, quyền `Doctor`, body `UpdateTreatmentStageRequest`:

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `notes` | string? | Không | Không gửi (`null`) → giữ cũ; chuỗi rỗng/khoảng trắng → xóa ghi chú | Ghi chú điều trị |
| `actualCost` | decimal? | Không | ≥ 0; không gửi → giữ cũ | Chi phí thực tế |
| `nextStageScheduledDate` | DateOnly? | Không | ≥ hôm nay và ≥ `scheduledDate` của giai đoạn hiện tại (nếu có) | Ngày hẹn cho giai đoạn `Scheduled` kế tiếp |

Ràng buộc chung: nếu sau khi áp dụng `actualCost` có giá trị và khác `estimatedCost` thì phải có ghi chú.

```json
{ "notes": "Trám thêm mặt nhai", "actualCost": 550000, "nextStageScheduledDate": "2026-11-17" }
```

**Response** HTTP 200, message `"Update treatment stage success!"`.

### 3.3 Hoàn thành giai đoạn

**Request** `POST api/TreatmentPlans/{id:long}/stages/{stageId:long}/complete`, quyền `Doctor`, body `CompleteTreatmentStageRequest` **không bắt buộc** (`EmptyBodyBehavior.Allow`):

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|
| `notes` | string? | Không | Như PATCH | Ghi chú cuối |
| `actualCost` | decimal? | Không | ≥ 0 | Chi phí thực tế |

**Response** HTTP 200, message `"Complete treatment stage success!"`.

### 3.4 Xem tiến độ

**Request** `GET api/TreatmentPlans/{id:long}/progress`, quyền `Doctor`. **Response** HTTP 200, không message.

Mọi response là `TreatmentPlanProgressResponse` (xem [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md)).

**Lỗi**

| HTTP | API | Khi nào | Message (`ErrorConstants`) |
|---|---|---|---|
| 404 | tất cả | Không có kế hoạch | `TreatmentPlanMessage.PlanNotFound`: "Treatment plan not found." |
| 404 / 403 | tất cả | Không có hồ sơ bác sĩ / không có quyền | "Doctor profile not found" / "You do not have access to this patient's treatment plan" |
| 404 | start, PATCH, complete | `stageId` không thuộc kế hoạch | `TreatmentPlanMessage.StageNotFound`: "Treatment stage not found." |
| 400 | start | Kế hoạch không `Approved`/`InProgress` | `TreatmentPlanMessage.PlanNotApproved`: "Cannot start treatment because the plan is not approved." |
| 400 | start | Giai đoạn không `Scheduled` | `TreatmentPlanMessage.StageNotScheduled`: "Cannot start this stage because it is not scheduled." |
| 400 | start | Giai đoạn trước chưa xong/chưa hủy | `TreatmentPlanMessage.EarlierStageNotCompleted`: "Cannot start this stage because an earlier stage is not completed." |
| 400 | PATCH, complete | Giai đoạn không `InProgress` | `TreatmentPlanMessage.StageNotInProgress`: "Cannot update or complete this stage because it is not in progress." |
| 400 | complete | Kế hoạch không `InProgress` | `TreatmentPlanMessage.PlanNotInProgress`: "Cannot complete this stage because the plan is not in progress." |
| 400 | PATCH, complete | `actualCost` < 0 | `TreatmentPlanMessage.InvalidActualCost`: "Actual cost is invalid. Please check again." |
| 400 | PATCH, complete | Chi phí thực tế khác dự kiến mà không có ghi chú | `TreatmentPlanMessage.NotesRequiredWhenCostDiffers`: "Please enter a note when the actual cost differs from the estimated cost." |
| 400 | PATCH | Ngày hẹn giai đoạn sau không hợp lệ | `TreatmentPlanMessage.ScheduledDateInvalid`: "Scheduled date is invalid. Please check again." |
| 404 | PATCH | Gửi ngày hẹn nhưng không còn giai đoạn `Scheduled` phía sau | `TreatmentPlanMessage.NextStageNotFound`: "Next treatment stage not found." |
| 409 | start, PATCH, complete | Kế hoạch bị lưu cùng lúc | "This record was changed by someone else. Please reload and try again" |

## 4. Luồng xử lý trong code

**Bắt đầu (start)** — `TreatmentPlanService.StartStageAsync`
1. Controller — `TreatmentPlansController.cs:149-158`.
2. Đọc kế hoạch có tracking (404), `EnsureAccessAsync` — `TreatmentPlanService.cs:337-339`.
3. Tìm giai đoạn trong `plan.Stages` (404) — `TreatmentPlanService.cs:341-342`.
4. Kế hoạch `Approved` hoặc `InProgress` — `TreatmentPlanService.cs:344-346`.
5. Giai đoạn `Scheduled` — `TreatmentPlanService.cs:348-350`.
6. Không còn giai đoạn có `StageNumber` nhỏ hơn mà chưa `Completed`/`Cancelled` → làm tuần tự, mỗi lúc tối đa một giai đoạn `InProgress` — `TreatmentPlanService.cs:352-356`.
7. Giai đoạn → `InProgress`; nếu kế hoạch đang `Approved` → `InProgress` — `TreatmentPlanService.cs:358-366`.
8. Lưu, trả `ToProgressResponse` — `TreatmentPlanService.cs:368-369`.

**Cập nhật (PATCH)** — `TreatmentPlanService.UpdateStageAsync`
1. Controller — `TreatmentPlansController.cs:163-173`.
2. Đọc kế hoạch (404), `EnsureAccessAsync`, tìm giai đoạn (404) — `TreatmentPlanService.cs:379-384`.
3. Giai đoạn `InProgress` — `TreatmentPlanService.cs:386-388`.
4. `notes`: `null` → giữ `stage.Notes`; rỗng → `null`; khác → trim. `actualCost = request.ActualCost ?? stage.ActualCost` — `TreatmentPlanService.cs:391-392`.
5. `request.ActualCost` < 0 → 400 — `TreatmentPlanService.cs:394-399`.
6. Nếu `actualCost` có giá trị và khác `EstimatedCost` mà `notes == null` → 400 — `TreatmentPlanService.cs:401-407`.
7. Nếu có `NextStageScheduledDate` → `ApplyNextStageDate` — `TreatmentPlanService.cs:411-414`, `:424-444`:
   - Ngày ≥ `ClinicClock.Now` và ≥ `currentStage.ScheduledDate` (nếu có), sai → 400.
   - Giai đoạn kế tiếp = giai đoạn `Scheduled` có `StageNumber` nhỏ nhất lớn hơn giai đoạn hiện tại; không có → 404.
   - Gán `ScheduledDate` cho giai đoạn đó.
8. Ghi `Notes`, `ActualCost`, `UpdatedAt` vào giai đoạn hiện tại, lưu — `TreatmentPlanService.cs:416-421`.

**Hoàn thành (complete)** — `TreatmentPlanService.CompleteStageAsync`
1. Controller, body cho phép rỗng — `TreatmentPlansController.cs:178-188`.
2. Đọc kế hoạch (404), `EnsureAccessAsync` trả về `doctor`, tìm giai đoạn (404) — `TreatmentPlanService.cs:453-458`.
3. Kế hoạch `InProgress`, giai đoạn `InProgress` — `TreatmentPlanService.cs:460-465`.
4. `notes`: giữ cũ nếu `request?.Notes == null`; rỗng → `null`; khác → trim — `TreatmentPlanService.cs:467-471`.
5. `actualCost`: giữ cũ nếu không gửi; gửi thì phải ≥ 0 — `TreatmentPlanService.cs:473-480`.
6. Có `actualCost` khác `EstimatedCost` mà ghi chú trống → 400 — `TreatmentPlanService.cs:482-485`.
7. Giai đoạn: `Notes`, `ActualCost`, `StageStatus = Completed`, `ActualDate = ClinicClock.Now` (ngày VN), `CompletedAt = UtcNow`, `PerformedByDoctorId = doctor.Id`, `UpdatedAt` — `TreatmentPlanService.cs:487-494`.
8. Không còn giai đoạn nào khác `Completed`/`Cancelled` → kế hoạch `Completed` — `TreatmentPlanService.cs:496-503`.
9. Lưu, trả response — `TreatmentPlanService.cs:505-506`.

**Tiến độ (progress)** — `TreatmentPlanService.GetProgressAsync`
1. Controller — `TreatmentPlansController.cs:136-144`.
2. Đọc AsNoTracking (404), `EnsureAccessAsync` (không có ngoại lệ cho lễ tân) — `TreatmentPlanService.cs:324-326`.
3. `ToProgressResponse` — `TreatmentPlanService.cs:572-616`:
   - **ProgressPercent** = `Math.Round(completedStages / (stages.Count − cancelledStages) × 100, 2)`, mẫu = 0 → 0 (`:619-624`).
   - **NextStage** = giai đoạn đầu tiên theo `StageNumber` đang `InProgress` hoặc `Scheduled` (`:584-586`).
   - **CompletedCost** = Σ (`ActualCost ?? EstimatedCost`) của giai đoạn `Completed` (`:587-589`).

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|
| BR-TP-06 | Chỉ kế hoạch đã duyệt mới bắt đầu giai đoạn | `TreatmentPlanService.cs:344-346` |
| BR-TP-09 | Tiến độ %, giai đoạn kế tiếp | `TreatmentPlanService.cs:578-624` |
| BR-TP-03 | Ngày hẹn giai đoạn sau không ở quá khứ, không sớm hơn giai đoạn hiện tại | `TreatmentPlanService.cs:430-433` |
| (code) | Làm giai đoạn theo thứ tự; giai đoạn trước phải xong hoặc hủy | `TreatmentPlanService.cs:352-356` |
| (code, comment "BR-187") | Chi phí thực tế khác dự kiến phải có ghi chú | `TreatmentPlanService.cs:401-407`, `:482-485` |
| BR-C01 | `ActualDate`, "hôm nay" theo `ClinicClock` | `TreatmentPlanService.cs:430`, `:491` |

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|
| `TreatmentPlanStages` (start) | `Scheduled` | `InProgress` | |
| `TreatmentPlans` (start) | `Approved` | `InProgress` | Chỉ lần đầu |
| `TreatmentPlanStages` (PATCH) | `InProgress` | `InProgress` | `Notes`, `ActualCost`; giai đoạn `Scheduled` kế tiếp đổi `ScheduledDate` |
| `TreatmentPlanStages` (complete) | `InProgress` | `Completed` | `ActualDate`, `CompletedAt`, `PerformedByDoctorId`, `Notes`, `ActualCost` |
| `TreatmentPlans` (complete) | `InProgress` | `Completed` | Khi mọi giai đoạn `Completed`/`Cancelled` |

## 7. Liên quan

- Trước đó: [F-TP-07](F-TP-07_duyet-ke-hoach.md) duyệt.
- Sau đó: [F-PAY-01](../M8-thu-ngan/F-PAY-01_lap-hoa-don.md) lập hóa đơn cho giai đoạn đã/đang làm (BR-PAY-03); nhắc tái khám M9 dựa trên `ScheduledDate`; [F-TP-08](F-TP-08_huy-ke-hoach.md) hủy phần còn lại.

## 8. Kiểm thử

- Test hiện có: Chưa có.
- Ca cần test: start giai đoạn 1 khi `Approved` → kế hoạch `InProgress`; start giai đoạn 2 khi giai đoạn 1 chưa xong → 400; start khi giai đoạn trước `Cancelled` → được; PATCH chỉ `notes` giữ `actualCost`; PATCH `actualCost` khác dự kiến không ghi chú → 400; PATCH ngày hẹn khi là giai đoạn cuối → 404; complete không body; complete giai đoạn cuối → kế hoạch `Completed`; `progressPercent`, `nextStage`, `completedCost` sau mỗi bước; hai bác sĩ thao tác cùng lúc → 409.

## 9. Còn thiếu / câu hỏi mở

- Giai đoạn không gắn với lượt khám thực hiện: thiếu `TreatmentPlanStages.PerformedExaminationId`, `AppointmentServices.TreatmentPlanStageId`, `IntervalDays`, `ToothNumbers` (bảng "Dữ liệu còn thiếu" M7). Start/complete không kiểm có lượt khám `InProgress` của bệnh nhân hôm nay.
- PATCH không kiểm trạng thái kế hoạch (chỉ kiểm giai đoạn `InProgress`; thực tế kế hoạch luôn `InProgress` khi có giai đoạn `InProgress`).
- `ApplyNextStageDate` không kiểm ngày mới so với ngày của các giai đoạn sau nữa → có thể làm lệch thứ tự ngày (BR-TP-03).
- Làm tuần tự từng giai đoạn: một buổi làm nhiều giai đoạn (Q13 "Được") chỉ làm được bằng start → complete lần lượt.
- Đổi `ActualCost` sau khi giai đoạn đã có hóa đơn không bị chặn; liên kết với số tiền hóa đơn chưa xác định từ code.
- `GET {id}/progress` chỉ cho `Doctor`, trùng dữ liệu với [F-TP-02](F-TP-02_xem-chi-tiet-ke-hoach.md).
- Không ghi `AuditLog`. Comment code dùng mã "UC-52", "BR-134", "BR-187", "MSG.." không có trong tài liệu tổng.
