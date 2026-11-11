# Tài liệu chức năng OZE

Mỗi chức năng một file, viết từ code thật (10/11/2026). Mỗi file theo [khung chung](_KHUNG_CHUC_NANG.md), gồm 9 mục:

1. Chức năng làm gì
2. Tiền điều kiện
3. API (request, response, lỗi)
4. Luồng xử lý trong code (kèm `File.cs:dòng`)
5. Quy tắc `BR-...`
6. Dữ liệu và trạng thái thay đổi
7. Chức năng liên quan
8. Kiểm thử
9. Còn thiếu / câu hỏi mở

Nghiệp vụ tổng, ma trận quyền và các câu hỏi Q1–Q15: [Dac_ta_nghiep_vu_OZE.md](../Dac_ta_nghiep_vu_OZE.md).

**Cách dùng**
- **Người code:** đọc file chức năng trước khi làm. Code xong mà làm đổi hành vi thì cập nhật mục 3–6 của file đó trong cùng commit.
- **Agent / hệ thống khác:** chỉ cần đọc mục 3 (API) và mục 4 (luồng) là gọi đúng API.
- **Chức năng ⬜:** phần API và luồng trong file là **thiết kế đề xuất**, chưa có trong code. Muốn làm thì chốt đề xuất với nhóm trước.

Trạng thái: ✅ đã có API · 🟡 làm một phần · ⬜ chưa làm (có thiết kế đề xuất).

## M1. Tài khoản và hồ sơ

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-AUTH-01 | [Đăng ký bằng OTP](M1-tai-khoan/F-AUTH-01_dang-ky-otp.md) | ✅ |
| F-AUTH-02 | [Đăng nhập](M1-tai-khoan/F-AUTH-02_dang-nhap.md) | ✅ |
| F-AUTH-03 | [Làm mới token, đăng xuất](M1-tai-khoan/F-AUTH-03_lam-moi-token-dang-xuat.md) | ✅ |
| F-AUTH-04 | [Đổi mật khẩu](M1-tai-khoan/F-AUTH-04_doi-mat-khau.md) | ✅ |
| F-AUTH-05 | [Quên mật khẩu](M1-tai-khoan/F-AUTH-05_quen-mat-khau.md) | ✅ |
| F-AUTH-06 | [Xác nhận email](M1-tai-khoan/F-AUTH-06_xac-nhan-email.md) | ✅ |
| F-ME-01 | [Hồ sơ của tôi](M1-tai-khoan/F-ME-01_ho-so-cua-toi.md) | ✅ |

## M2. Quản trị

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-ADM-01 | [Nhân viên](M2-quan-tri/F-ADM-01_nhan-vien.md) | ✅ |
| F-ADM-02 | [Vai trò](M2-quan-tri/F-ADM-02_vai-tro.md) | ✅ |
| F-ADM-03 | [Phòng](M2-quan-tri/F-ADM-03_phong.md) | ✅ |
| F-ADM-04 | [Dịch vụ và biến thể](M2-quan-tri/F-ADM-04_dich-vu.md) | 🟡 |
| F-ADM-05 | [Ca làm việc, lịch bác sĩ, mở lại ca](M2-quan-tri/F-ADM-05_ca-lam-viec.md) | ✅ |
| F-ADM-06 | [Sửa cấu hình hệ thống](M2-quan-tri/F-ADM-06_sua-cau-hinh.md) | ⬜ |
| F-ADM-07 | [Đơn nghỉ phép](M2-quan-tri/F-ADM-07_don-nghi-phep.md) | ⬜ |
| F-ADM-08 | [Dữ liệu trang chủ](M2-quan-tri/F-ADM-08_trang-chu.md) | ✅ |

## M3. Đặt lịch

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-APT-01 | [Dịch vụ đặt được](M3-dat-lich/F-APT-01_dich-vu-dat-duoc.md) | ✅ |
| F-APT-02 | [Slot trống](M3-dat-lich/F-APT-02_slot-trong.md) | ✅ |
| F-APT-03 | [Khách vãng lai đặt lịch](M3-dat-lich/F-APT-03_khach-vang-lai-dat-lich.md) | ✅ |
| F-APT-04 | [Bệnh nhân đăng nhập đặt lịch](M3-dat-lich/F-APT-04_benh-nhan-dat-lich.md) | ✅ |
| F-APT-05 | [Lịch của tôi, danh sách và chi tiết lịch](M3-dat-lich/F-APT-05_lich-cua-toi.md) | ✅ |
| F-APT-06 | [Xác nhận lịch](M3-dat-lich/F-APT-06_xac-nhan-lich.md) | ✅ |
| F-APT-07 | [Hủy lịch](M3-dat-lich/F-APT-07_huy-lich.md) | ✅ |
| F-APT-08 | [Đổi lịch](M3-dat-lich/F-APT-08_doi-lich.md) | ✅ |
| F-APT-09 | [Lễ tân đặt hộ](M3-dat-lich/F-APT-09_le-tan-dat-ho.md) | ⬜ |
| F-APT-10 | [Cảnh báo PENDING quá hạn](M3-dat-lich/F-APT-10_canh-bao-pending-qua-han.md) | ⬜ |
| F-APT-11 | [Ghi kết quả liên lạc, đặt lại lịch đã hủy](M3-dat-lich/F-APT-11_ghi-nhan-lien-lac.md) | ⬜ (đề xuất) |

## M4. Tiếp đón và hàng chờ

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-RCP-01 | [Check-in](M4-tiep-don/F-RCP-01_check-in.md) | ✅ |
| F-RCP-02 | [Walk-in](M4-tiep-don/F-RCP-02_walk-in.md) | ✅ |
| F-RCP-03 | [Đổi mức ưu tiên](M4-tiep-don/F-RCP-03_doi-muc-uu-tien.md) | ✅ |
| F-RCP-04 | [Danh sách chờ](M4-tiep-don/F-RCP-04_danh-sach-cho.md) | ✅ |
| F-RCP-05 | [Gọi số hàng chờ](M4-tiep-don/F-RCP-05_goi-so-hang-cho.md) | ✅ |
| F-RCP-06 | [Đánh dấu NO_SHOW](M4-tiep-don/F-RCP-06_danh-dau-no-show.md) | ✅ |
| F-RCP-07 | [Cần xử lý sau ca, đổi bác sĩ](M4-tiep-don/F-RCP-07_can-xu-ly-va-doi-bac-si.md) | ✅ |
| F-RCP-08 | [Bắt đầu / kết thúc ca](M4-tiep-don/F-RCP-08_bat-dau-ket-thuc-ca.md) | ✅ |

## M5. Khám bệnh

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-EXM-01 | [Bắt đầu khám](M5-kham-benh/F-EXM-01_bat-dau-kham.md) | ✅ |
| F-EXM-02 | [Nội dung khám](M5-kham-benh/F-EXM-02_noi-dung-kham.md) | ✅ |
| F-EXM-03 | [Dịch vụ trên phiếu](M5-kham-benh/F-EXM-03_dich-vu-tren-phieu.md) | ✅ |
| F-EXM-04 | [Sơ đồ răng](M5-kham-benh/F-EXM-04_so-do-rang.md) | ✅ |
| F-EXM-05 | [Chẩn đoán](M5-kham-benh/F-EXM-05_chan-doan.md) | ✅ |
| F-EXM-06 | [Kê đơn](M5-kham-benh/F-EXM-06_ke-don.md) | ✅ |
| F-EXM-07 | [Hoàn tất khám](M5-kham-benh/F-EXM-07_hoan-tat-kham.md) | ✅ |
| F-EXM-08 | [Phụ lục sau khóa phiếu](M5-kham-benh/F-EXM-08_phu-luc-sau-khoa.md) | ⬜ |
| F-EXM-09 | [Xem hồ sơ bệnh án](M5-kham-benh/F-EXM-09_xem-ho-so-benh-an.md) | ✅ |

## M6. Chụp phim

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-IMG-01 | [Chỉ định chụp](M6-chup-phim/F-IMG-01_chi-dinh-chup.md) | ✅ |
| F-IMG-02 | [Hàng chờ kỹ thuật viên](M6-chup-phim/F-IMG-02_hang-cho-ky-thuat-vien.md) | ✅ |
| F-IMG-03 | [Hủy chỉ định](M6-chup-phim/F-IMG-03_huy-chi-dinh.md) | ✅ |
| F-IMG-04 | [Hoàn thành chụp, webhook simulator](M6-chup-phim/F-IMG-04_hoan-thanh-chup.md) | ✅ |
| F-IMG-05 | [Tải ảnh kết quả, DICOM](M6-chup-phim/F-IMG-05_tai-anh-ket-qua-dicom.md) | ⬜ |
| F-IMG-06 | [Chụp lại do lỗi kỹ thuật](M6-chup-phim/F-IMG-06_chup-lai-loi-ky-thuat.md) | ⬜ |

## M7. Kế hoạch điều trị

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-TP-01 | [Tạo kế hoạch nháp](M7-ke-hoach-dieu-tri/F-TP-01_tao-ke-hoach-nhap.md) | ✅ |
| F-TP-02 | [Xem chi tiết](M7-ke-hoach-dieu-tri/F-TP-02_xem-chi-tiet-ke-hoach.md) | ✅ |
| F-TP-03 | [Danh sách theo bệnh nhân](M7-ke-hoach-dieu-tri/F-TP-03_danh-sach-ke-hoach-benh-nhan.md) | ✅ |
| F-TP-04 | [Sửa kế hoạch](M7-ke-hoach-dieu-tri/F-TP-04_sua-ke-hoach.md) | ✅ |
| F-TP-05 | [Xóa kế hoạch nháp](M7-ke-hoach-dieu-tri/F-TP-05_xoa-ke-hoach-nhap.md) | ✅ |
| F-TP-06 | [Đề xuất](M7-ke-hoach-dieu-tri/F-TP-06_de-xuat-ke-hoach.md) | ✅ |
| F-TP-07 | [Duyệt](M7-ke-hoach-dieu-tri/F-TP-07_duyet-ke-hoach.md) | ✅ |
| F-TP-08 | [Hủy](M7-ke-hoach-dieu-tri/F-TP-08_huy-ke-hoach.md) | ✅ |
| F-TP-09 | [Giai đoạn điều trị, tiến độ](M7-ke-hoach-dieu-tri/F-TP-09_giai-doan-dieu-tri.md) | ✅ |
| F-TP-10 | [Phiên bản mới](M7-ke-hoach-dieu-tri/F-TP-10_phien-ban-moi.md) | ⬜ |
| F-TP-11 | [Bệnh nhân xem kế hoạch](M7-ke-hoach-dieu-tri/F-TP-11_benh-nhan-xem-ke-hoach.md) | ⬜ |

## M8. Thu ngân

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-PAY-01 | [Lập, sửa hóa đơn](M8-thu-ngan/F-PAY-01_lap-hoa-don.md) | 🟡 |
| F-PAY-02 | [Xem hóa đơn, công nợ](M8-thu-ngan/F-PAY-02_xem-hoa-don-cong-no.md) | ✅ |
| F-PAY-03 | [Thu tiền, xác nhận chuyển khoản, hủy khoản thu](M8-thu-ngan/F-PAY-03_thu-tien.md) | ✅ |
| F-PAY-04 | [Ứng trước, trả góp](M8-thu-ngan/F-PAY-04_ung-truoc-tra-gop.md) | 🟡 |
| F-PAY-05 | [Hủy hóa đơn, hoàn tiền](M8-thu-ngan/F-PAY-05_huy-hoa-don-hoan-tien.md) | ✅ |
| F-PAY-06 | [Chốt ca, báo cáo ngày](M8-thu-ngan/F-PAY-06_chot-ca.md) | 🟡 |

## M9. Chăm sóc khách hàng

| Mã | Chức năng | Trạng thái |
|---|---|---|
| F-CRM-01 | [Danh sách nhắc tái khám](M9-cham-soc-khach-hang/F-CRM-01_danh-sach-nhac-tai-kham.md) | ⬜ |
| F-CRM-02 | [Nhật ký gọi nhắc](M9-cham-soc-khach-hang/F-CRM-02_nhat-ky-goi-nhac.md) | ⬜ |
| F-CRM-03 | [API đọc thông báo](M9-cham-soc-khach-hang/F-CRM-03_api-doc-thong-bao.md) | ⬜ |

**Tổng:** 69 chức năng: 52 ✅, 4 🟡, 13 ⬜ (gồm F-APT-11 đề xuất).

---

## Lỗi và chỗ lệch tìm thấy khi viết tài liệu

Chi tiết ở mục 9 của từng file. Đây là các việc nên tạo Jira task, xếp theo mức ảnh hưởng.

### Nên sửa sớm (sai dữ liệu hoặc sai tiền)

| # | Vấn đề | File |
|---|---|---|
| 1 | Lập hóa đơn chưa kiểm BR-PAY-01..03. Hiện vẫn lập được cho kế hoạch `Draft`/`Cancelled`, tính một giai đoạn hai lần, tính giai đoạn đã hủy. Kiểm `StagePlanMismatch` luôn đúng. Không có unique index nên hai request cùng lúc tạo được hai hóa đơn cho một lịch. **Vẫn còn (kiểm lại 11/11/2026)**; thêm: mỗi kế hoạch chỉ lập được một hóa đơn vì `HasOpenInvoiceForTreatmentPlanAsync` tính cả `PAID`/`REFUNDED`. Các lỗi tiền khác của M8 (void không lý do, khoản `PENDING` vượt nợ, kỳ góp, hoàn tiền, báo cáo không trừ hoàn) ở mục 9 F-PAY-03..06 | F-PAY-01 |
| 2 | `IsInvoicedAsync` tính cả hóa đơn `CANCELLED`, nên kế hoạch có hóa đơn đã hủy bị khóa sửa/xóa | F-TP-04, F-TP-05 |
| 3 | ~~`call-next` và `waiting-list` xếp hai thứ tự khác nhau; Urgent bị gọi hụt xếp sau Normal~~ **Đã sửa 11/11/2026** (`WaitingOrder`). Còn lại: chưa giới hạn số lần gọi hụt, `Queue.AutoExpireMinutes` chưa dùng | F-RCP-04, F-RCP-05 |
| 4 | Webhook chụp phim không lưu `ImagingResult` nên ảnh trong hồ sơ bệnh án luôn rỗng. Secret webhook hai bên khác nhau. Tên sự kiện lệch (`capture.completed` / `CAPTURE_COMPLETED`) | F-IMG-04 |
| 5 | Đơn thuốc chỉ có ghi chú bị tự xóa khi hoàn tất khám. Việc xóa đơn rỗng không chung transaction với bước khóa phiếu | F-EXM-06, F-EXM-07 |
| 6 | Check-in, walk-in, kết thúc ca, chỉ định chụp không bọc transaction (lịch đã `CHECKED_IN` mà không có số hàng chờ) | F-RCP-01, F-RCP-02, F-RCP-08, F-IMG-01 |
| 7 | Gửi `{}` vào `PATCH api/services/{id}/status` tắt dịch vụ | F-ADM-04 |

### Quy tắc chung bị vi phạm

| # | Vấn đề | Quy tắc |
|---|---|---|
| 8 | Nhiều chỗ dùng giờ máy chủ (`LocalDateTime`, `DateTime.UtcNow.AddHours(7)`) thay vì `ClinicClock`: xác định đến trễ, ca làm, cửa sổ ngày hàng chờ, ngày sinh, số hóa đơn | BR-C01 |
| 9 | Nhiều controller thiếu `[ApiResponseValidationFilter]` nên lỗi validation không bọc `ApiResponse`: Auth (một số endpoint), Appointments, Rooms, Services, WorkShift, DoctorSchedules, TreatmentPlans | BR-C07 |
| 10 | Nhiều message viết cứng, không lấy từ `ErrorConstants` | BR-C08 |
| 11 | Chưa ghi `AuditLog` cho nội dung khám, kế hoạch, chụp phim, nhân viên, phòng, dịch vụ, ca | BR-C11 |
| 12 | Quy tắc mật khẩu lúc đăng ký (8–32 ký tự) khác lúc đổi/đặt lại (có chữ số và chữ thường) | BR-AUTH |

### Thiếu test

Chưa có unit test: `TreatmentPlanService`, `InvoiceService`, `ExaminationService`, `MedicalRecordService`, `UserService`, đặt lịch / xem slot / xác nhận, walk-in, NO_SHOW, đổi bác sĩ, ca bác sĩ, webhook chụp phim, vai trò, phòng, ca làm việc. Ca cần test có ở mục 8 từng file.
