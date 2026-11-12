# F-CRM-02 Nhật ký gọi nhắc tái khám

> Khung: [_KHUNG_CHUC_NANG.md](../_KHUNG_CHUC_NANG.md). Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../../Dac_ta_nghiep_vu_OZE.md), mục M9, BR-CRM-02, BR-CRM-04.

| Mục | Giá trị |
|---|---|
| Module | M9 Chăm sóc khách hàng |
| Trạng thái | ✅ Đã làm (11/11/2026, theo góp ý hội đồng) |
| Vai trò | `Receptionist` ghi; `Receptionist`, `Doctor` xem |
| API | `POST api/examinations/{id}/follow-up/contacts`, `GET api/examinations/{id}/follow-up/contacts` |
| Code chính | `FollowUpContactsController` → `FollowUpCareService` → `CareRepository`; bảng `FollowUpContacts` |
| Màn hình | Lễ tân → Bệnh nhân → **Nhắc tái khám** (`ReceptionFollowUps.jsx`): nút "Ghi kết quả gọi", bấm vào kết quả để xem lịch sử |

## 1. Làm gì

Mỗi lần lễ tân gọi bệnh nhân về lượt tái khám thì ghi lại kết quả. Danh sách tái khám hiện kết quả của lần gọi gần nhất, nên ca sau biết ai đã gọi, gọi lúc nào và khách nói gì.

## 2. API

`POST api/examinations/{id}/follow-up/contacts`

| Trường | Bắt buộc | Ràng buộc |
|---|---|---|
| `outcome` | Có | `Booked` (đã đặt lịch), `CallBack` (hẹn gọi lại), `Unreachable` (không liên lạc được), `Declined` (không quay lại) |
| `callBackDate` | Khi `CallBack` | ≥ hôm nay |
| `note` | Không | ≤ 500 ký tự |

Lỗi (`ErrorConstants.CareMessage`): `ExaminationNotFound` (404), `NoFollowUp`, `OutcomeInvalid`, `CallBackDateRequired` (400).

`GET api/follow-ups` (danh sách cũ) có thêm các trường `isRecall`, `isClosed`, `lastContactOutcome`, `lastContactAt`, `lastContactNote`, `callBackDate`, `contactCount`, và tham số `includeClosed`.

## 3. Quy tắc

- Nhật ký chỉ thêm, không sửa, không xóa (BR-CRM-04).
- **Không quay lại** đặt `Examinations.FollowUpClosed = true`: job nhắc 8 giờ bỏ qua lượt này và danh sách ẩn nó. Lần gọi sau với kết quả khác, hoặc bác sĩ đặt ngày mới, sẽ mở lại.
- Đặt lịch tái khám thành công từ màn hình thì tự ghi thêm một dòng **Đã đặt lịch**.

## 4. Test

`OZE.UnitTest/Services/Care/RecordFollowUpContactTests.cs` (tab `OZ-CRM-01`, 5 ca).
