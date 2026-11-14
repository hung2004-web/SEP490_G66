# Tiến trình Unit Test – Report_5.1_Unit_Test

File theo dõi tiến độ điền báo cáo unit test trên Google Sheet `Report_5.1_Unit_Test` (142 tab). **Làm xong tab nào thì cập nhật dòng của tab đó ngay trong cùng commit.**

- Sheet: https://docs.google.com/spreadsheets/d/14Ji9LXKToC5fVQj5RDwWtV1jwaQhX5bUR-UHQSfSAZQ/edit
- Quy ước điền từng tab: mục [Quy ước](#quy-ước-điền-tab) cuối file.
- Đặc tả chức năng (danh sách ca cần test ở mục 8 mỗi file): [`docs/chuc-nang/README.md`](../../docs/chuc-nang/README.md)
- Cập nhật lần cuối: **14/11/2026** – DuongDH

## Ký hiệu trạng thái

| Ký hiệu | Nghĩa | Việc cần làm |
|---|---|---|
| ✅ | Đã điền xong trên sheet | Không |
| 🔄 | Đang làm (ghi tên người làm) | Làm tiếp, đừng ai khác nhận |
| 📝 | Code đã có test, chưa điền sheet | Điền sheet theo test có sẵn |
| ✍️ | Code đã có chức năng, **chưa có test** | Viết unit test → chạy → điền sheet |
| ⛔ | Chức năng **chưa có trong code** | Làm chức năng trước, hoặc để Untested |
| 🔗 | Thuộc repo khác (`oze-xray-simulator`) | Test ở repo đó |

Cột **Test trong code** đếm số hàm test ở tầng service (mỗi hàm = 1 UTCID). Số trong ngoặc là test controller, chỉ để tham khảo, không đưa lên sheet.

## Tổng quan theo đợt

| Đợt | Module | Tab (vị trí) | Số tab | ✅ | 📝 | ✍️ | ⛔ | 🔗 |
|---|---|---|---|---|---|---|---|---|
| 0 | Cover, MethodList, Statistics | 1–3 | 3 | 0 | – | – | – | – |
| 1 | OZ-AUTH | 4–14 | 11 | 11 | 0 | 0 | 0 | 0 |
| 2 | OZ-ME | 15–19 | 5 | 5 | 0 | 0 | 0 | 0 |
| 3 | OZ-PAT | 20–26 | 7 | 3 | 4 | 0 | 0 | 0 |
| 4 | OZ-SVC | 27–35 | 9 | 0 | 8 | 0 | 1 | 0 |
| 5 | OZ-ROOM, OZ-ROLE, OZ-STAFF, OZ-WS, OZ-DS | 36–60 | 25 | 2 | 0 | 23 | 0 | 0 |
| 6 | OZ-APPT, OZ-Q | 61–84 | 24 | 0 | 6 | 17 | 1 | 0 |
| 7 | OZ-EXAM, OZ-IMG, OZ-MR | 85–113 | 29 | 0 | 5 | 22 | 2 | 0 |
| 8 | OZ-TP, OZ-INV | 114–125 | 12 | 0 | 1 | 7 | 4 | 0 |
| 9 | OZ-HOME, OZ-CFG, OZ-LEAVE, OZ-NOTIF, OZ-WH | 126–133 | 8 | 0 | 2 | 2 | 4 | 0 |
| 10 | OZ-SIM | 134–142 | 9 | 0 | 0 | 0 | 0 | 9 |
| | **Tổng tab hàm** | 4–142 | **139** | **21** | **26** | **71** | **12** | **9** |

**Thứ tự đề xuất:** đợt 3 → 4 → 7 (phần chụp phim) → 6 (phần có test) → 0, rồi viết test cho các tab ✍️ theo đợt 2 → 5 → 6 → 7 → 8 → 9.

---

## Đợt 0 – Thông tin chung

| # | Tab | Việc | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | Cover | Project Name, Project Code, Document Code, Creator, Issue Date, Version, Record of change | ⬜ | | | Cần tên dự án, mã dự án |
| 2 | MethodList | Cột Description, Pre-Condition cho 139 hàm | ⬜ | | | |
| 3 | Statistics | Creator, Reviewer/Approver, Issue Date (số liệu tự tính) | ⬜ | | | Cần tên Reviewer |

## Đợt 1 – OZ-AUTH (Xác thực)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 4 | Register | OZ-AUTH-01 | Auth/RegisterTests: 14 (2) | ✅ | HiepNX | 10/11/2026 | 14 UTCID, gồm luồng đăng ký + xác thực |
| 5 | VerifyOtp | OZ-AUTH-02 | Auth/VerifyOtpTests: 12 (2) | ✅ | HiepNX | 10/11/2026 | |
| 6 | ResendOtp | OZ-AUTH-03 | Auth/ResendOtpTests: 6 (2) | ✅ | HiepNX | 10/11/2026 | |
| 7 | Login | OZ-AUTH-04 | Auth/LoginTests: 16 (2) | ✅ | HiepNX | 10/11/2026 | |
| 8 | RefreshToken | OZ-AUTH-05 | Auth/RefreshTokenTests: 13 (2) | ✅ | HiepNX | 10/11/2026 | |
| 9 | Logout | OZ-AUTH-06 | Auth/LogoutTests: 7 (5) | ✅ | HiepNX | 10/11/2026 | |
| 10 | ChangePassword | OZ-AUTH-07 | Auth/ChangePasswordTests: 9 (3) | ✅ | HiepNX | 10/11/2026 | |
| 11 | ConfirmEmail | OZ-AUTH-08 | Auth/ConfirmEmailTests: 4 (2) | ✅ | HiepNX | 10/11/2026 | |
| 12 | ForgotPassword | OZ-AUTH-09 | Auth/ForgotPasswordTests: 13 (2) | ✅ | HiepNX | 10/11/2026 | |
| 13 | VerifyResetOtp | OZ-AUTH-10 | Auth/VerifyResetOtpTests: 9 (2) | ✅ | HiepNX | 10/11/2026 | |
| 14 | ResetPassword | OZ-AUTH-11 | Auth/ResetPasswordTests: 9 (2) | ✅ | HiepNX | 10/11/2026 | Gồm 2 test luồng đầy đủ |

## Đợt 2 – OZ-ME (Hồ sơ của tôi)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 15 | GetProfile | OZ-ME-01 | Me/GetProfileTests: 4 | ✅ | DuongDH | 13/11/2026 | 4 UTCID, sheet đã điền |
| 16 | UpdateProfile | OZ-ME-02 | Me/UpdateProfileTests: 13 | ✅ | DuongDH | 13/11/2026 | 13 UTCID, sheet đã điền |
| 17 | ResendConfirmEmail | OZ-ME-03 | Me/ResendConfirmEmailTests: 5 | ✅ | DuongDH | 13/11/2026 | 5 UTCID, sheet đã điền |
| 18 | VerifyPhoneOtp | OZ-ME-04 | Me/VerifyPhoneOtpTests: 10 | ✅ | DuongDH | 13/11/2026 | 10 UTCID, sheet đã điền |
| 19 | ResendPhoneOtp | OZ-ME-05 | Me/ResendPhoneOtpTests: 5 | ✅ | DuongDH | 13/11/2026 | 5 UTCID, sheet đã điền |

## Đợt 3 – OZ-PAT (Bệnh nhân)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 20 | GetPatients | OZ-PAT-01 | Patients/GetPatientsTests: 1 (1) | ✅ | DuongDH | 14/11/2026 | 1 UTCID, sheet đã điền |
| 21 | GetPatientById | OZ-PAT-02 | Patients/GetPatientByIdTests: 2 (2) | ✅ | DuongDH | 14/11/2026 | 2 UTCID, sheet đã điền |
| 22 | GetPatientByCode | OZ-PAT-03 | Patients/GetPatientByCodeTests: 4 | ✅ | DuongDH | 14/11/2026 | 4 UTCID, sheet đã điền |
| 23 | CreatePatient | OZ-PAT-04 | Patients/CreatePatientTests: 4 (2) | 📝 | | | |
| 24 | DeletePatient | OZ-PAT-05 | Patients/DeletePatientTests: 4 (1) | 📝 | HiepNX | 11/11/2026 | Đã bổ sung test, chờ điền sheet |
| 25 | AddMedicalProfile | OZ-PAT-06 | Patients/AddMedicalProfileTests: 7 (1) | 📝 | HiepNX | 11/11/2026 | Đã bổ sung test, chờ điền sheet |
| 26 | UpdatePatient | OZ-PAT-07 | Patients/UpdatePatientTests: 14 (3) | 📝 | HiepNX | 11/11/2026 | Thêm lại API `PUT api/patients/{id}` (lễ tân, quản lý); chờ điền sheet |

## Đợt 4 – OZ-SVC (Dịch vụ)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 27 | GetServices | OZ-SVC-01 | ClinicServices/GetServicesTests: 1 (1) | 📝 | | | |
| 28 | GetActiveServices | OZ-SVC-02 | ClinicServices/GetActiveServicesTests: 1 | 📝 | | | |
| 29 | GetServiceById | OZ-SVC-03 | ClinicServices/GetServiceByIdTests: 2 | 📝 | | | |
| 30 | GetServiceByCode | OZ-SVC-04 | ClinicServices/GetServiceByCodeTests: 2 | 📝 | | | |
| 31 | CreateService | OZ-SVC-05 | ClinicServices/CreateServiceTests: 5 (1) | 📝 | | | |
| 32 | UpdateService | OZ-SVC-06 | ClinicServices/UpdateServiceTests: 2 (1) | 📝 | | | |
| 33 | ToggleServiceStatus | OZ-SVC-07 | ClinicServices/ToggleServiceStatusTests: 2 (1) | 📝 | | | |
| 34 | DeleteService | OZ-SVC-08 | ClinicServices/DeleteServiceTests: 2 (1) | 📝 | | | |
| 35 | ManageServiceVariants | OZ-SVC-09 | 0 | ⛔ | | | Chưa có API quản lý biến thể |

## Đợt 5 – Quản trị: phòng, vai trò, nhân viên, ca làm, lịch bác sĩ

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 36 | GetRooms | OZ-ROOM-01 | 0 | ✍️ | | | |
| 37 | GetRoomById | OZ-ROOM-02 | 0 | ✍️ | | | |
| 38 | CreateRoom | OZ-ROOM-03 | 0 | ✍️ | | | |
| 39 | UpdateRoom | OZ-ROOM-04 | 0 | ✍️ | | | |
| 40 | DeleteRoom | OZ-ROOM-05 | 0 | ✍️ | | | |
| 41 | GetRoles | OZ-ROLE-01 | 0 | ✍️ | | | |
| 42 | GetRole | OZ-ROLE-02 | 0 | ✍️ | | | |
| 43 | CreateRole | OZ-ROLE-03 | 0 | ✍️ | | | |
| 44 | UpdateRole | OZ-ROLE-04 | 0 | ✍️ | | | |
| 45 | GetStaffList | OZ-STAFF-01 | 0 | ✍️ | | | |
| 46 | GetStaff | OZ-STAFF-02 | 0 | ✍️ | | | |
| 47 | CreateStaff | OZ-STAFF-03 | 0 | ✍️ | | | |
| 48 | UpdateStaff | OZ-STAFF-04 | 0 | ✍️ | | | |
| 49 | DeactivateStaff | OZ-STAFF-05 | 0 | ✍️ | | | |
| 50 | ActivateStaff | OZ-STAFF-06 | 0 | ✍️ | | | |
| 51 | CreateWorkShift | OZ-WS-01 | WorkShifts/CreateWorkShiftTests: 13 (2) | ✅ | HungPVA | 13/11/2026 | 13 UTCID (3N, 3B, 7A) + 2 test controller |
| 52 | GetWorkShifts | OZ-WS-02 | WorkShifts/GetWorkShiftsTests: 12 (2) | ✅ | HungPVA | 14/11/2026 | 12 UTCID (7N, 3B, 2A) + 2 test controller |
| 53 | GetWorkShiftById | OZ-WS-03 | 0 | ✍️ | | | |
| 54 | UpdateWorkShift | OZ-WS-04 | 0 | ✍️ | | | |
| 55 | DeleteWorkShift | OZ-WS-05 | 0 | ✍️ | | | |
| 56 | ReopenShift | OZ-WS-06 | 0 | ✍️ | | | |
| 57 | GetMySchedule | OZ-DS-01 | 0 | ✍️ | | | |
| 58 | GetMyShiftDetail | OZ-DS-02 | 0 | ✍️ | | | |
| 59 | StartShift | OZ-DS-03 | 0 | ✍️ | | | |
| 60 | EndShift | OZ-DS-04 | 0 | ✍️ | | | Xử lý NO_SHOW khi hết ca |

## Đợt 6 – OZ-APPT, OZ-Q (Lịch hẹn, tiếp đón, hàng chờ)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 61 | GetBookableServices | OZ-APPT-01 | 0 | ✍️ | | | |
| 62 | GetAvailableSlots | OZ-APPT-02 | 0 | ✍️ | | | |
| 63 | BookAsGuest | OZ-APPT-03 | 0 | ✍️ | | | |
| 64 | BookAsPatient | OZ-APPT-04 | 0 | ✍️ | | | |
| 65 | CreateWalkIn | OZ-APPT-05 | 0 | ✍️ | | | |
| 66 | GetAppointments | OZ-APPT-06 | 0 (1) | ✍️ | | | Chỉ có test controller |
| 67 | GetMyAppointments | OZ-APPT-07 | 0 | ✍️ | | | |
| 68 | GetAppointmentById | OZ-APPT-08 | 0 (3) | ✍️ | | | Chỉ có test controller |
| 69 | GetWaitingList | OZ-APPT-09 | Appointments/GetWaitingListTests: 1 | 📝 | | | |
| 70 | GetNeedsAttention | OZ-APPT-10 | 0 | ✍️ | | | |
| 71 | ConfirmAppointment | OZ-APPT-11 | 0 | ✍️ | | | |
| 72 | CancelAppointment | OZ-APPT-12 | Appointments/CancelAppointmentTests: 1 (2) | 📝 | | | Mới có 1 test (hủy lịch tái khám), cần bổ sung |
| 73 | RescheduleAppointment | OZ-APPT-13 | Appointments/RescheduleAppointmentTests: 1 | 📝 | | | Mới có 1 test (đổi lịch tái khám), cần bổ sung |
| 74 | CheckInAppointment | OZ-APPT-14 | 0 (1) | ✍️ | | | Test service check-in đã bị bỏ khỏi commit, file sao lưu còn trong scratchpad |
| 75 | SetPriority | OZ-APPT-15 | 0 | ✍️ | | | |
| 76 | MarkNoShow | OZ-APPT-16 | 0 | ✍️ | | | |
| 77 | ReassignDoctor | OZ-APPT-17 | 0 | ✍️ | | | |
| 78 | StartExamination | OZ-APPT-18 | Appointments/StartExaminationTests: 9 (2) | 📝 | | | |
| 79 | CompleteExamination | OZ-APPT-19 | Appointments/CompleteExaminationTests: 4 | 📝 | | | |
| 80 | StaffProxyBooking | OZ-APPT-20 | 0 | ⛔ | | | Lễ tân đặt hộ chưa có API |
| 81 | GetQueue | OZ-Q-01 | 0 | ✍️ | | | |
| 82 | CallNext | OZ-Q-02 | Queue/CallNextTests: 6 | 📝 | HiepNX | 11/11/2026 | Gọi tiếp dùng chung thứ tự với danh sách chờ (WaitingOrder); chờ điền sheet |
| 83 | CallQueueEntry | OZ-Q-03 | 0 | ✍️ | | | |
| 84 | SkipQueueEntry | OZ-Q-04 | 0 | ✍️ | | | |

## Đợt 7 – OZ-EXAM, OZ-IMG, OZ-MR (Khám bệnh, chụp phim, hồ sơ bệnh án)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 85 | GetExamination | OZ-EXAM-01 | 0 | ✍️ | | | `ExaminationService` chưa có test |
| 86 | UpdateExamContent | OZ-EXAM-02 | 0 | ✍️ | | | |
| 87 | AddExamService | OZ-EXAM-03 | 0 | ✍️ | | | |
| 88 | UpdateExamService | OZ-EXAM-04 | 0 | ✍️ | | | |
| 89 | RemoveExamService | OZ-EXAM-05 | 0 | ✍️ | | | |
| 90 | GetDentalChart | OZ-EXAM-06 | 0 | ✍️ | | | |
| 91 | SetTooth | OZ-EXAM-07 | 0 | ✍️ | | | |
| 92 | RemoveToothChange | OZ-EXAM-08 | 0 | ✍️ | | | |
| 93 | GetPrescription | OZ-EXAM-09 | 0 | ✍️ | | | |
| 94 | SavePrescriptionNotes | OZ-EXAM-10 | 0 | ✍️ | | | |
| 95 | AddPrescriptionItem | OZ-EXAM-11 | 0 | ✍️ | | | |
| 96 | UpdatePrescriptionItem | OZ-EXAM-12 | 0 | ✍️ | | | |
| 97 | DeletePrescriptionItem | OZ-EXAM-13 | 0 | ✍️ | | | |
| 98 | DeletePrescription | OZ-EXAM-14 | 0 | ✍️ | | | |
| 99 | FinalizePrescription | OZ-EXAM-15 | 0 | ✍️ | | | |
| 100 | ReopenPrescription | OZ-EXAM-16 | 0 | ✍️ | | | |
| 101 | AddDiagnosis | OZ-EXAM-17 | 0 | ✍️ | | | |
| 102 | UpdateDiagnosis | OZ-EXAM-18 | 0 | ✍️ | | | |
| 103 | DeleteDiagnosis | OZ-EXAM-19 | 0 | ✍️ | | | |
| 104 | AddClinicalAddendum | OZ-EXAM-20 | 0 | ⛔ | | | Phụ lục sau khóa phiếu chưa có API |
| 105 | CreateImagingRequest | OZ-IMG-01 | Imaging/CreateImagingRequestTests: 7 | 📝 | | | |
| 106 | GetImagingByExam | OZ-IMG-02 | Imaging/GetImagingByExamTests: 4 | 📝 | | | |
| 107 | GetImagingById | OZ-IMG-03 | Imaging/GetImagingByIdTests: 3 | 📝 | | | |
| 108 | GetImagingQueue | OZ-IMG-04 | Imaging/GetImagingQueueTests: 2 | 📝 | | | |
| 109 | CancelImagingRequest | OZ-IMG-05 | Imaging/CancelImagingRequestTests: 5 | 📝 | | | |
| 110 | CompleteImagingRequest | OZ-IMG-06 | 0 | ✍️ | | | |
| 111 | UploadImagingResult | OZ-IMG-07 | 0 | ⛔ | | | Chưa có API tải ảnh |
| 112 | GetPatientRecord | OZ-MR-01 | 0 | ✍️ | | | `MedicalRecordService` chưa có test |
| 113 | GetExamDetail | OZ-MR-02 | 0 | ✍️ | | | |

## Đợt 8 – OZ-TP, OZ-INV (Kế hoạch điều trị, hóa đơn)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 114 | GetTpProgress | OZ-TP-01 | 0 | ✍️ | | | `TreatmentPlanService` chưa có test |
| 115 | StartTpStage | OZ-TP-02 | 0 | ✍️ | | | |
| 116 | UpdateTpStage | OZ-TP-03 | 0 | ✍️ | | | |
| 117 | CompleteTpStage | OZ-TP-04 | 0 | ✍️ | | | |
| 118 | CreateTreatmentPlan | OZ-TP-05 | 0 | ✍️ | | | API đã có (`POST api/examinations/{id}/treatment-plans`) |
| 119 | ConfirmTreatmentPlan | OZ-TP-06 | 0 | ✍️ | | | Ứng với `propose` + `approve` |
| 120 | VersionTreatmentPlan | OZ-TP-07 | 0 | ⛔ | | | Phiên bản kế hoạch chưa làm |
| 121 | CreateInvoice | OZ-INV-01 | 0 | ✍️ | | | Code còn thiếu kiểm tra BR-PAY-01..03 |
| 122 | GetInvoice | OZ-INV-02 | 0 | ⛔ | | | |
| 123 | CreatePayment | OZ-INV-03 | 2 | 📝 | HiepNX | 11/11/2026 | Invoices/RecordPaymentTests: khoản thu chỉ cộng một lần (lỗi cộng đôi PaidAmount đã sửa) |
| 124 | RequestRefund | OZ-INV-04 | 0 | ⛔ | | | |
| 125 | ApproveRefund | OZ-INV-05 | 0 | ⛔ | | | |

## Đợt 9 – Khác: trang chủ, cấu hình, nghỉ phép, thông báo, webhook

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 126 | GetHome | OZ-HOME-01 | 0 | ✍️ | | | |
| 127 | GetSystemConfig | OZ-CFG-01 | 0 | ⛔ | | | |
| 128 | UpdateSystemConfig | OZ-CFG-02 | 0 | ⛔ | | | |
| 129 | CreateLeaveRequest | OZ-LEAVE-01 | 6 | 📝 | HiepNX | 11/11/2026 | API đã làm: gửi, rút đơn (LeaveRequests/CreateLeaveRequestTests) |
| 130 | ApproveLeaveRequest | OZ-LEAVE-02 | 6 | 📝 | HiepNX | 11/11/2026 | API đã làm: duyệt có/không người thay, từ chối (LeaveRequests/ApproveLeaveRequestTests) |
| 131 | GetNotifications | OZ-NOTIF-01 | 0 | ⛔ | | | |
| 132 | MarkNotifRead | OZ-NOTIF-02 | 0 | ⛔ | | | |
| 133 | ImagingSimWebhook | OZ-WH-01 | 0 | ✍️ | | | |

## Đợt 10 – OZ-SIM (Máy chụp giả lập, repo `oze-xray-simulator`)

| # | Tab | Mã | Test trong code | Trạng thái | Người làm | Cập nhật | Ghi chú |
|---|---|---|---|---|---|---|---|
| 134 | StartCapture | OZ-SIM-01 | Chưa kiểm tra | 🔗 | | | |
| 135 | GetCapture | OZ-SIM-02 | Chưa kiểm tra | 🔗 | | | |
| 136 | CancelCapture | OZ-SIM-03 | Chưa kiểm tra | 🔗 | | | |
| 137 | ListCaptureImages | OZ-SIM-04 | Chưa kiểm tra | 🔗 | | | |
| 138 | GetCaptureImage | OZ-SIM-05 | Chưa kiểm tra | 🔗 | | | |
| 139 | ListDevices | OZ-SIM-06 | Chưa kiểm tra | 🔗 | | | |
| 140 | GetDevice | OZ-SIM-07 | Chưa kiểm tra | 🔗 | | | |
| 141 | DemoSetDeviceState | OZ-SIM-08 | Chưa kiểm tra | 🔗 | | | |
| 142 | DemoInjectFault | OZ-SIM-09 | Chưa kiểm tra | 🔗 | | | |

## Có test hoặc API nhưng chưa có tab trên sheet

Cần thêm tab (copy một tab mẫu, thêm dòng vào MethodList và Statistics) nếu muốn đưa vào báo cáo.

| Chức năng | Test trong code | Đề xuất mã |
|---|---|---|
| Hẹn tái khám từ lượt khám (`ScheduleFollowUpAsync`) | Appointments/ScheduleFollowUpTests: 5 | OZ-APPT-21 |
| Đặt / nhắc / đặt lịch / nhắc hàng loạt / xem tái khám của tôi (`SetFollowUpAsync`, `RemindFollowUpAsync`, `ScheduleFollowUpAppointmentAsync`, `RemindDueFollowUpsAsync`, `GetMyFollowUpsAsync`) | Examinations/SetFollowUpTests: 5, RemindFollowUpTests: 4, ScheduleFollowUpAppointmentTests: 2, RemindDueFollowUpsTests: 2, GetMyFollowUpsTests: 1 | OZ-EXAM-21..25 |
| Xem chi tiết, danh sách theo bệnh nhân, sửa, xóa, hủy kế hoạch điều trị | 0 | OZ-TP-08..12 |
| Bàn giao ca: mở két, ghi chi, đếm tiền, bàn giao (`CashSessionService`) | CashSessions/CashSessionTests: 11 | OZ-CASH-01 |
| Biểu đồ doanh thu theo ngày (`GetRevenueSeriesAsync`) | Reports/RevenueByDayTests: 2 | OZ-RPT-01 |
| Bác sĩ trong ca hôm nay (`GetDoctorsOnDutyAsync`) | Schedules/DoctorsOnDutyTests: 1 | OZ-SCH-01 |
| Ghi kết quả gọi tái khám (`RecordContactAsync`) | Care/RecordFollowUpContactTests: 5 | OZ-CRM-01 |
| Công nợ và nhắc thanh toán (`DebtService`) | Care/DebtAndReminderTests: 6 | OZ-PAY-07 |
| Đối soát cuối ngày (`ReconciliationService`) | Care/DailyReconciliationTests: 5 | OZ-PAY-08 |
| Lễ tân đặt lịch hộ (`BookByReceptionistAsync`) | Appointments/BookByReceptionistTests: 3 | OZ-APPT-22 |
| Yêu cầu tư vấn (`ConsultationService`) | Care/ConsultationRequestTests: 5 | OZ-CRM-05 |

## Nhật ký cập nhật

| Ngày | Người | Nội dung |
|---|---|---|
| 10/11/2026 | HiepNX | Tạo file. Đợt 1 (OZ-AUTH, 11 tab) đã điền xong theo file mẫu |
| 10/11/2026 | HiepNX | Viết test đợt 2 (OZ-ME, 5 tab) và OZ-PAT-03 GetPatientByCode |
| 11/11/2026 | HiepNX | Tách test thành 1 file / 1 tab theo thư mục module, gắn `[Trait("Tab", ...)]` cho mọi test |
| 11/11/2026 | HiepNX | Merge `main` (test tái khám mới): tách tiếp vào Appointments/CancelAppointment, RescheduleAppointment và Examinations/RemindDueFollowUps, GetMyFollowUps. Tổng 318 test |
| 11/11/2026 | HiepNX | OZ-PAT-07 UpdatePatient: thêm lại API `PUT api/patients/{id}`, sửa ngày sinh theo giờ VN, giữ SĐT/email khi để trống, chặn lễ tân đổi SĐT/email của bệnh nhân có tài khoản; 14 test service + 3 test controller
| 11/11/2026 | HiepNX | OZ-PAT-05 DeletePatient: thêm 3 test (khóa tài khoản, không tìm thấy, còn lịch hẹn), tổng 4 test
| 11/11/2026 | HiepNX | OZ-PAT-06 AddMedicalProfile: thêm 6 test (không tìm thấy, loại/mức độ/trạng thái sai, để trống dùng mặc định, dữ liệu lưu xuống), tổng 7 test
| 11/11/2026 | HiepNX | OZ-Q-02 CallNext: "Gọi tiếp" dùng chung thứ tự với danh sách chờ (`WaitingOrder`), Urgent bị gọi hụt không còn tụt xuống sau Normal; thêm 5 test, tổng 6
| 12/11/2026 | HungPVA | Rà soát và chuẩn hóa tài liệu test cho module Tái khám (OZ-EXAM-21..25, OZ-APPT-21); bổ sung XML summary docs cho các DTO/Request và chuẩn hóa mapping extension |
| 13/11/2026 | DuongDH | OZ-ME-01 GetProfile: 📝→✅. Dùng test sẵn (4 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-ME-01` → 4 Passed. Điền sheet GetProfile. |
| 13/11/2026 | DuongDH | OZ-ME-02 UpdateProfile: 📝→✅. Dùng test sẵn (13 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-ME-02` → 13 Passed. Điền sheet UpdateProfile. |
| 13/11/2026 | DuongDH | OZ-ME-03 ResendConfirmEmail: 📝→✅. Dùng test sẵn (5 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-ME-03` → 5 Passed. Điền sheet ResendConfirmEmail. |
| 13/11/2026 | DuongDH | OZ-ME-04 VerifyPhoneOtp: 📝→✅. Dùng test sẵn (10 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-ME-04` → 10 Passed. Điền sheet VerifyPhoneOtp. |
| 13/11/2026 | DuongDH | OZ-ME-05 ResendPhoneOtp: 📝→✅. Dùng test sẵn (5 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-ME-05` → 5 Passed. Điền sheet ResendPhoneOtp. |
| 14/11/2026 | DuongDH | OZ-PAT-01 GetPatients: 📝→✅. Dùng test sẵn (1 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-PAT-01` → 1 Passed. Điền sheet GetPatients. |
| 14/11/2026 | DuongDH | OZ-PAT-02 GetPatientById: 🔄→✅. Dùng test sẵn (2 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-PAT-02` → 2 Passed. Sheet đã điền và được xác nhận. |
| 14/11/2026 | DuongDH | OZ-PAT-03 GetPatientByCode: 🔄→✅. Dùng test sẵn (4 UTCID), không viết thêm. `dotnet test --filter Tab=OZ-PAT-03` → 5 Passed (Theory×2). Sheet đã điền và được xác nhận. |
| 13/11/2026 | HungPVA | OZ-WS-01 CreateWorkShift: ✍️→✅. Viết 13 unit test service (3N, 3B, 7A) và 2 test controller. `dotnet test --filter Tab=OZ-WS-01` → 13 Passed. Điền sheet CreateWorkShift. |
| 14/11/2026 | HungPVA | OZ-WS-02 GetWorkShifts: ✍️→✅. Viết 12 unit test service (7N, 3B, 2A) và 2 test controller. `dotnet test --filter Tab=OZ-WS-02` → 12 Passed. Điền sheet GetWorkShifts. |

---

## Cấu trúc thư mục test

Mỗi tab trên sheet ứng với đúng một file test. Nhìn cây thư mục là biết hàm nào đã có test.

```
OZE.UnitTest/Services/
├── Auth/            OZ-AUTH   AuthServiceTestBase.cs + LoginTests.cs, RegisterTests.cs, ...
├── Me/              OZ-ME     UserServiceTestBase.cs + GetProfileTests.cs, UpdateProfileTests.cs, ...
├── Patients/        OZ-PAT    PatientServiceTestBase.cs + GetPatientByCodeTests.cs, ...
├── ClinicServices/  OZ-SVC    ClinicServiceTestBase.cs + CreateServiceTests.cs, ...
├── Appointments/    OZ-APPT   StartExaminationTests.cs, CompleteExaminationTests.cs, ...
├── Queue/           OZ-Q      CallNextTests.cs
├── Examinations/    OZ-EXAM   SetFollowUpTests.cs, ...
└── Imaging/         OZ-IMG    CreateImagingRequestTests.cs, ...
```

| Quy tắc | Nội dung |
|---|---|
| Thư mục | Một module (`Patients` ↔ OZ-PAT). Namespace `OZE.UnitTest.Services.<Thư mục>` |
| File | `<TênTab>Tests.cs`, trùng tên tab trên sheet. Một tab = một file |
| Class | `public class <TênTab>Tests : <...>TestBase`, đầu class có `// OZ-XXX-nn <TênTab>` và `[Trait("Tab", "OZ-XXX-nn")]` |
| `...TestBase.cs` | `abstract`, chứa mock, constructor, dữ liệu mẫu, hàm phụ (`protected`). **Không chứa test** |
| Test | Mỗi test có comment `// UTCIDxx (N/A/B): ...` ngay trên `[Fact]`/`[Theory]`. Một test = một cột UTCID |
| Tab mới | Tạo file `<TênTab>Tests.cs` trong thư mục module, kế thừa TestBase sẵn có; module mới thì tạo thư mục + TestBase |

Lệnh hay dùng:

| Muốn | Lệnh |
|---|---|
| Chạy một tab | `dotnet test OZE.UnitTest --filter "Tab=OZ-PAT-03"` |
| Xem tên test của một tab | `dotnet test OZE.UnitTest --filter "Tab=OZ-PAT-03" --list-tests` |
| Chạy một module | `dotnet test OZE.UnitTest --filter "FullyQualifiedName~Services.Patients"` |
| Chạy tất cả | `dotnet test OZE.UnitTest` |

---

## Quy ước điền tab

| Ô / phần | Quy ước |
|---|---|
| Code Module | Mã trong MethodList: `OZ-<MODULE>-<số>` |
| Method | Tên tab |
| Created By / Executed By | Tên viết tắt người viết test (ví dụ `HiepNX`) |
| Test requirement | `Test cases cover the '<Method>' functionality to ensure <mục đích>.` |
| UTCID | 1 hàm test service = 1 cột. Test `[Theory]` gộp 1 cột, các giá trị ghi chung 1 dòng. Không ghi test controller |
| Precondition | Dòng đầu `Can connect with server`, sau đó trạng thái dữ liệu (tài khoản bị khóa, lịch đã xác nhận…) |
| Nhóm tham số | Tên trường request. Giá trị cụ thể lấy từ test, có ngoặc kép: `"0912345678"`, `null` |
| Return | `T` thành công, `F` thất bại |
| Exception | Giữ dòng tiêu đề; chỉ ghi khi test bắt exception |
| Log message | Câu lỗi nguyên văn trong `ErrorConstants`, có ngoặc kép |
| Type | N: luồng đúng. A: dữ liệu sai, không quyền, không tồn tại, dịch vụ ngoài lỗi. B: giá trị biên (đúng hạn, hôm nay, chuỗi rỗng, lần thử cuối) |
| Passed/Failed | `P`/`F` theo lần chạy `dotnet test` gần nhất |
| Executed Date | `dd/mm/yyyy` |
| Bố cục | 1 dòng trống giữa Condition và Confirm; xóa dòng thừa trước Result; **giữ nguyên khung kẻ** |

**Cách cập nhật file này:** nhận tab → đổi trạng thái thành 🔄 và ghi tên → làm xong đổi thành ✅, ghi ngày → sửa lại bảng "Tổng quan theo đợt" → thêm 1 dòng vào "Nhật ký cập nhật".
| 11/11/2026 | HiepNX | Làm đơn nghỉ phép (OZ-LEAVE-01, 02: ⛔ → 📝, 6 + 6 test), bàn giao ca (11 test), biểu đồ doanh thu theo ngày (2), bác sĩ trong ca (1). Ba mã OZ-CASH-01, OZ-RPT-01, OZ-SCH-01 chưa có tab trên sheet. Tổng 382 test |
| 11/11/2026 | HiepNX | Theo góp ý hội đồng: ghi kết quả gọi tái khám (5), công nợ và nhắc thanh toán (6), đối soát cuối ngày (5), nhắc định kỳ trong OZ-APPT-19 CompleteExamination (+2). Ba mã OZ-CRM-01, OZ-PAY-07, OZ-PAY-08 chưa có tab trên sheet. Tổng 400 test |
| 11/11/2026 | HiepNX | Đặt lịch hộ (3 test đầu vào), yêu cầu tư vấn (5). Tổng 408 test |
| 11/11/2026 | HiepNX | OZ-INV-03 CreatePayment: 2 test cho lỗi cộng đôi tiền đã thu. Tổng 410 test |
