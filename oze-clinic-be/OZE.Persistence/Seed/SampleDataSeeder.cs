using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Common.Constants;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Seed
{
    // Sample clinic for local development, gathered from the FE mock data (oze-clinic-fe/src/utils/data):
    // staff (mockStaff), rooms (mockRooms), services (mockServicesAdmin), shifts and leave requests (mockShifts),
    // patients and visits (mockExamination, mockDebts, mockRefundRequests, mockImagingReviews), settings (mockSystemConfigs).
    //
    // The shifts are the source of truth: every appointment, queue entry, examination and invoice is given to a doctor
    // (or technician) who really works in a room of the right type at that time, so the manager's shifts, the doctor's
    // work schedule and the receptionist's queue always agree. Dates count from the day the seeder runs.
    //
    // Runs once: it does nothing when the marker account already exists. All staff and the sample patient sign in
    // with SamplePassword (email or phone number).
    public static class SampleDataSeeder
    {
        public const string SamplePassword = "password123";
        private const string MarkerEmail = "khoa.tm@oze.vn";

        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SampleDataSeeder");
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var db = serviceProvider.GetRequiredService<AppIdentityDbContext>();

            if (await userManager.FindByEmailAsync(MarkerEmail) != null)
            {
                logger.LogInformation("Sample data already seeded, skipped.");
                return;
            }

            await using var transaction = await db.Database.BeginTransactionAsync();
            var builder = new Builder(db, userManager);
            await builder.BuildAsync();
            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            logger.LogInformation("Sample data seeded for {Today}: {Staff} staff, {Shifts} shifts, {Patients} patients, {Appointments} appointments, {Invoices} invoices.",
                builder.Today, builder.StaffCount, builder.ShiftCount, builder.PatientCount, builder.AppointmentCount, builder.InvoiceCount);
        }

        // ---------- Source data (from the FE mocks) ----------

        private record StaffRow(int Id, string FullName, string Email, string Role, string Gender, string Phone, string? BirthDate, string? License, bool Locked = false);

        private static readonly StaffRow[] StaffRows =
        {
            new(3, "Trần Thị Lan", "lan.tt@oze.vn", RoleConstants.ClinicManagerRole, "Female", "0918777888", "1985-04-12", null),
            new(12, "BS. Trần Minh Khoa", "khoa.tm@oze.vn", RoleConstants.DoctorRole, "Male", "0912111222", "1988-09-03", "001234/HNO-CCHN"),
            new(15, "BS. Lê Thu Hà", "ha.lt@oze.vn", RoleConstants.DoctorRole, "Female", "0913222333", "1990-02-21", "002345/HNO-CCHN"),
            new(18, "BS. Ngô Văn Đức", "duc.nv@oze.vn", RoleConstants.DoctorRole, "Male", "0914333444", null, "003456/HNO-CCHN"),
            new(21, "KTV. Phạm Quốc Bảo", "bao.pq@oze.vn", RoleConstants.DentalImagingTechnicianRole, "Male", "0915444555", "1994-07-30", null),
            new(24, "Lê Thị Mai", "mai.lt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0916555666", "1998-11-08", null),
            new(27, "Đinh Văn Toàn", "toan.dv@oze.vn", RoleConstants.ReceptionistRole, "Male", "0917666777", "1997-05-16", null, Locked: true),
            new(30, "BS. Phan Ngọc Ánh", "anh.pn@oze.vn", RoleConstants.DoctorRole, "Female", "0919888999", "1992-12-01", "004567/HNO-CCHN"),
            new(33, "KTV. Hồ Minh Quân", "quan.hm@oze.vn", RoleConstants.DentalImagingTechnicianRole, "Male", "0920111333", null, null),
            new(36, "Võ Thị Hằng", "hang.vt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0921222444", "2000-03-25", null),
            new(39, "BS. Đặng Quốc Huy", "huy.dq@oze.vn", RoleConstants.DoctorRole, "Male", "0922333555", "1986-08-14", "005678/HNO-CCHN"),
            new(42, "BS. Nguyễn Thanh Tâm", "tam.nt@oze.vn", RoleConstants.DoctorRole, "Male", "0923444666", "1991-01-19", "006789/HNO-CCHN"),
            new(45, "Bùi Thị Ngọc", "ngoc.bt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0924555777", null, null),
            new(48, "KTV. Trịnh Văn Long", "long.tv@oze.vn", RoleConstants.DentalImagingTechnicianRole, "Male", "0925666888", "1993-06-09", null, Locked: true),
            new(51, "BS. Lý Hoàng Nam", "nam.lh@oze.vn", RoleConstants.DoctorRole, "Male", "0926777999", "1989-10-27", "007890/HNO-CCHN"),
            new(54, "Phạm Thu Trang", "trang.pt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0927888111", "1999-09-12", null),
            new(57, "BS. Vũ Hải Yến", "yen.vh@oze.vn", RoleConstants.DoctorRole, "Female", "0928999222", "1993-04-04", "008901/HNO-CCHN"),
            new(60, "Hoàng Minh Tuấn", "tuan.hm@oze.vn", RoleConstants.ClinicManagerRole, "Male", "0929111444", "1984-02-28", null),
            new(63, "KTV. Mai Đức Thịnh", "thinh.md@oze.vn", RoleConstants.DentalImagingTechnicianRole, "Male", "0931222555", null, null),
            new(66, "BS. Cao Thị Hương", "huong.ct@oze.vn", RoleConstants.DoctorRole, "Female", "0932333666", "1995-07-07", "009012/HNO-CCHN"),
            new(69, "Đỗ Thị Thảo", "thao.dt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0933444777", "2001-12-15", null, Locked: true),
            new(72, "BS. Tạ Quang Vinh", "vinh.tq@oze.vn", RoleConstants.DoctorRole, "Male", "0934555888", "1990-05-30", "010123/HNO-CCHN"),
            new(75, "Lương Thị Kim", "kim.lt@oze.vn", RoleConstants.ReceptionistRole, "Female", "0935666999", null, null),
        };

        private const int Manager = 3, Khoa = 12, Ha = 15, Duc = 18, Bao = 21, Mai = 24, Anh = 30, Quan = 33, Hang = 36, Huy = 39, Ngoc = 45;

        // The BE has no "specialized" or "reception" room types: the specialized room is a general treatment room,
        // and the reception desk is not a room (receptionist shifts have no room).
        private record RoomRow(string Key, string Name, string Type, string Floor, string Description, string Status);

        private static readonly RoomRow[] RoomRows =
        {
            new("kham", "Phòng khám", RoomTypeConstants.GeneralTreatment, "Tầng 1", "Khám, tư vấn, điều trị tổng quát", RoomConstants.ActiveStatus),
            new("tieuphau", "Phòng tiểu phẫu", RoomTypeConstants.MinorSurgery, "Tầng 2", "Nhổ răng khôn, cắt lợi, Implant", RoomConstants.ActiveStatus),
            new("chuyensau", "Phòng điều trị chuyên sâu", RoomTypeConstants.GeneralTreatment, "Tầng 2", "Niềng răng, lấy dấu, scan iTero", RoomConstants.ActiveStatus),
            new("xq1", "Phòng chụp chiếu 1", RoomTypeConstants.XRay, "Tầng 1", "Panorama, Cephalometric", RoomConstants.ActiveStatus),
            new("xq2", "Phòng chụp chiếu 2", RoomTypeConstants.XRay, "Tầng 1", "Cone beam CT · đang thay cảm biến", RoomConstants.MaintenanceStatus),
        };

        private const string Reception = "reception";

        // MOCK_SHIFT_TEMPLATE: usual staff of each room per slot, every day of the week.
        private static readonly (string Room, int Morning, int Afternoon)[] ShiftTemplate =
        {
            ("kham", Khoa, Anh),
            ("tieuphau", Duc, Duc),
            ("chuyensau", Ha, Ha),
            ("xq1", Bao, Quan),
            (Reception, Mai, Hang),
        };

        private const bool M = true, A = false;

        // MOCK_UNASSIGNED: shifts nobody was put on (week 0 = this week, weekday 0 = Monday).
        private static readonly (int Week, int Weekday, bool Morning, string Room)[] Unassigned =
        {
            (0, 5, M, "tieuphau"), (0, 2, A, "chuyensau"), (0, 6, A, Reception),
            (1, 5, M, "tieuphau"), (1, 2, A, "chuyensau"), (1, 6, A, Reception),
        };

        // MOCK_ABSENCES: missed shifts (only once the day is over).
        private static readonly (int Week, int Weekday, bool Morning, string Room, string Reason)[] Absences =
        {
            (0, 0, A, "xq1", "Ốm, báo qua điện thoại lúc 12:15"),
            (0, 1, M, "xq1", "Xe hỏng giữa đường, báo lúc 08:20"),
        };

        // MOCK_LEAVE_REQUESTS, adjusted where the mock breaks a BE rule:
        // - an approved leave that has booked patients needs a substitute (#2, #10 get BS. Huy, who has no shifts of his own);
        // - a leave covers shifts the person really has (#6 Ánh works afternoons, #7 Mai works mornings).
        private record LeaveRow(int Staff, int Week, int Weekday, bool? Morning, string Reason, string Status, int? Substitute, string? RejectReason, int DaysBefore, string Time);

        private static readonly LeaveRow[] LeaveRows =
        {
            new(Khoa, 0, 4, null, "Đưa con đi khám", LeaveRequestConstants.Approved, null, null, 21, "09:05"),
            new(Khoa, 1, 4, null, "Việc gia đình", LeaveRequestConstants.Approved, Huy, null, 21, "09:10"),
            new(Anh, 1, 1, A, "Khám thai định kỳ", LeaveRequestConstants.Pending, null, null, 14, "10:20"),
            new(Mai, 1, 0, M, "Khám sức khoẻ định kỳ", LeaveRequestConstants.Pending, null, null, 14, "16:40"),
            new(Bao, 0, 6, M, "Phẫu thuật nhỏ, có giấy hẹn", LeaveRequestConstants.Pending, null, null, 14, "07:55"),
            new(Khoa, -2, 4, null, "Việc gia đình", LeaveRequestConstants.Rejected, null, "Chưa có bác sĩ thay thế trong ngày.", 6, "08:12"),
            new(Ha, -3, 0, null, "Hội thảo chuyên môn", LeaveRequestConstants.Approved, Huy, null, 10, "14:30"),
            new(Hang, -4, 2, A, "Việc cá nhân", LeaveRequestConstants.Approved, Ngoc, null, 5, "11:00"),
        };

        // MOCK_ADMIN_SERVICES plus the services the visits use (Trám răng, Tẩy trắng, X-quang quanh chóp).
        // DV001 (the general check-up) has no room type: it is in every appointment and must not block the others.
        private record ServiceRow(string Code, string Name, string Description, decimal Price, int Minutes, string? RoomType, int? RecallMonths = null, bool Active = true);

        private static readonly ServiceRow[] ServiceRows =
        {
            new("DV001", "Khám tổng quát & tư vấn", "Khám, tư vấn, lập kế hoạch điều trị", 0, 30, null, 6),
            new("DV002", "Lấy cao răng", "Làm sạch cao răng, đánh bóng", 150000, 30, RoomTypeConstants.GeneralTreatment, 6),
            new("DV003", "Điều trị tủy", "Lấy tủy, làm sạch và trám bít ống tủy", 800000, 60, RoomTypeConstants.GeneralTreatment),
            new("DV004", "Nhổ răng khôn", "Nhổ răng khôn mọc lệch, mọc ngầm", 1500000, 60, RoomTypeConstants.MinorSurgery),
            new("DV005", "Cấy ghép Implant", "Cấy trụ titan, phục hình mão sứ", 18000000, 90, RoomTypeConstants.MinorSurgery),
            new("DV006", "Niềng răng thẩm mỹ", "Chỉnh nha răng hô, móm, thưa, khấp khểnh", 18000000, 60, RoomTypeConstants.GeneralTreatment),
            new("DV007", "Chụp Panorama", "Phim toàn cảnh hai hàm", 250000, 15, RoomTypeConstants.XRay),
            new("DV008", "Scan răng iTero", "Quét dấu răng kỹ thuật số", 800000, 30, RoomTypeConstants.GeneralTreatment, Active: false),
            new("DV009", "Trám răng", "Trám răng sâu, mẻ bằng composite, GIC hoặc sứ", 400000, 30, RoomTypeConstants.GeneralTreatment),
            new("DV010", "Tẩy trắng răng", "Tẩy trắng tại phòng khám hoặc tại nhà", 2500000, 60, RoomTypeConstants.GeneralTreatment),
            new("DV011", "Chụp X-quang quanh chóp", "Phim quanh chóp một răng", 100000, 15, RoomTypeConstants.XRay),
        };

        private record VariantRow(string Service, string Code, string Name, decimal Price, int Minutes, int Order, string Description, bool Active = true);

        private static readonly VariantRow[] VariantRows =
        {
            new("DV002", "DV002-01", "Một hàm", 150000, 20, 1, "Lấy cao răng và đánh bóng một hàm."),
            new("DV002", "DV002-02", "Toàn hàm", 300000, 30, 2, "Lấy cao răng cả hai hàm, đánh bóng."),
            new("DV002", "DV002-03", "Nửa hàm (cũ)", 100000, 15, 3, "Gói cũ, không còn nhận lịch mới.", Active: false),
            new("DV003", "DV003-01", "Răng một chân", 800000, 45, 1, "Điều trị tủy răng cửa, răng nanh."),
            new("DV003", "DV003-02", "Răng nhiều chân", 1500000, 60, 2, "Điều trị tủy răng hàm."),
            new("DV006", "DV006-01", "Mắc cài kim loại", 18000000, 60, 1, "Mắc cài kim loại truyền thống, chi phí thấp, hiệu quả ổn định."),
            new("DV006", "DV006-02", "Mắc cài sứ", 30000000, 60, 2, "Mắc cài cùng màu răng, khó nhận thấy khi giao tiếp."),
            new("DV006", "DV006-03", "Khay trong suốt", 45000000, 30, 3, "Khay nhựa trong suốt tháo lắp, thay khay định kỳ."),
            new("DV009", "DV009-01", "Trám composite", 400000, 30, 1, "Trám thẩm mỹ cùng màu răng."),
            new("DV009", "DV009-02", "Trám GIC", 250000, 30, 2, "Trám GIC cho răng sữa, cổ răng."),
            new("DV009", "DV009-03", "Inlay / onlay sứ", 2500000, 60, 3, "Miếng sứ chế tác riêng cho răng vỡ lớn."),
            new("DV010", "DV010-01", "Tại phòng khám", 2500000, 60, 1, "Tẩy trắng bằng đèn tại phòng khám."),
            new("DV010", "DV010-02", "Tại nhà (máng)", 1500000, 30, 2, "Máng tẩy trắng đeo tại nhà."),
        };

        // MOCK_SYSTEM_CONFIGS plus the general check-up code the booking flow needs.
        private static readonly (string Key, string Value, string DataType, string Description)[] ConfigRows =
        {
            (ConfigKeyConstants.GeneralExamServiceCode, "DV001", "String", "Mã dịch vụ khám tổng quát, tự thêm vào mọi lịch hẹn"),
            (ConfigKeyConstants.BookingMaxDaysAhead, "30", "Int", "Đặt lịch trước tối đa (ngày)"),
            (ConfigKeyConstants.BookingMinHoursAhead, "2", "Int", "Đặt trước giờ hẹn ít nhất (giờ)"),
            (ConfigKeyConstants.BookingCancelCutoffHours, "24", "Int", "Bệnh nhân tự huỷ trước giờ hẹn ít nhất (giờ)"),
            (ConfigKeyConstants.BookingPendingConfirmHours, "4", "Int", "Lịch chờ xác nhận quá số giờ này thì cảnh báo lễ tân (giờ)"),
            (ConfigKeyConstants.BookingPendingVisitSoonHours, "24", "Int", "Lịch chờ xác nhận sắp tới giờ khám trong số giờ này thì cảnh báo lễ tân (giờ)"),
            ("CheckIn.EarlyMinutes", "30", "Int", "Cho check-in sớm tối đa (phút)"),
            (ConfigKeyConstants.CheckInLateMinutes, "15", "Int", "Trễ quá thì đánh dấu NO_SHOW (phút)"),
            ("Queue.AutoExpireMinutes", "60", "Int", "Chờ quá thì tự huỷ khỏi hàng chờ (phút)"),
            ("Clinic.WorkStartTime", "08:00", "String", "Giờ mở cửa"),
            ("Clinic.WorkEndTime", "17:00", "String", "Giờ đóng cửa"),
            (ConfigKeyConstants.SlotDurationMinutes, "30", "Int", "Độ dài một khung giờ hẹn (phút)"),
        };

        // Patients of the mocks, one record per person (the mocks gave some of them different codes on different screens).
        // BN000123 is the mock patient account (mockData), it can sign in.
        private record PatientRow(string Code, string Name, string Gender, string Phone, string? BirthDate = null, string? Address = null,
            string? Email = null, string? EmergencyPhone = null, string[]? Allergies = null, string[]? Conditions = null);

        private static readonly PatientRow[] PatientRows =
        {
            new("BN000123", "Nguyễn Văn A", "Male", "0912345678", "1990-01-01", "12 Nguyễn Trãi, Thanh Xuân, Hà Nội", "test@example.com", "0912777345", new[] { "Penicillin" }, new[] { "Tăng huyết áp" }),
            new("BN000187", "Lý Thanh Tâm", "Male", "0903456123", "1985-11-02", "45 Trần Duy Hưng, Cầu Giấy, Hà Nội", Conditions: new[] { "Tiểu đường" }),
            new("BN000204", "Mai Thị Lan", "Female", "0987001234", "1996-03-21", "8 Kim Mã, Ba Đình, Hà Nội", EmergencyPhone: "0987001999", Conditions: new[] { "Đang cho con bú" }),
            new("BN000211", "Đinh Thu Hà", "Female", "0978222333", "2001-08-09", "102 Nguyễn Văn Cừ, Long Biên, Hà Nội", Allergies: new[] { "Latex (găng cao su)" }),
            new("BN000230", "Ngô Minh Anh", "Male", "0966777888", "2010-12-30", "3 Lê Văn Lương, Thanh Xuân, Hà Nội", EmergencyPhone: "0966777000", Conditions: new[] { "Hen suyễn / bệnh phổi" }),
            new("BN000240", "Trần Văn Bình", "Male", "0904000240"),
            new("BN000241", "Lê Thị Cúc", "Female", "0904000241"),
            new("BN000133", "Đỗ Mai Khanh", "Female", "0977404219", "2001-04-18", Allergies: new[] { "Penicillin" }),
            new("BN000118", "Vũ Đức Long", "Male", "0903112448"),
            new("BN000150", "Lê Hoàng Yến", "Female", "0918330125"),
            new("BN000151", "Trịnh Văn Khải", "Male", "0935781006"),
            new("BN000098", "Phạm Minh Tuấn", "Male", "0909245631", "1984-06-02"),
            new("BN000152", "Hoàng Văn Bình", "Male", "0326778412"),
            new("BN000153", "Bùi Văn Hưng", "Male", "0962118304"),
            new("BN000154", "Nguyễn Thị Hoa", "Female", "0388552190"),
            new("BN000097", "Phan Quốc Bình", "Male", "0971223344"),
            new("BN000101", "Trần Thị Hoa", "Female", "0912556677"),
            new("BN000125", "Lê Văn Nam", "Male", "0987334455"),
            new("BN000090", "Hoàng Thu Thảo", "Female", "0934667788"),
            new("BN000155", "Đặng Thanh Tùng", "Male", "0905889900"),
            new("BN000156", "Ngô Thị Lan Anh", "Female", "0978112233"),
            new("BN000157", "Mai Xuân Trường", "Male", "0916445566"),
            new("BN000158", "Vương Hải Yến", "Female", "0983778899"),
            new("BN000159", "Tạ Minh Quân", "Male", "0928990011"),
            new("BN000160", "Cao Thị Mỹ Duyên", "Female", "0967223344"),
            new("BN000117", "Phan Gia Bảo", "Male", "0904000117", "1995-02-10"),
            new("BN000161", "Nguyễn Thu Hằng", "Female", "0904000161"),
            new("BN000162", "Đoàn Văn Sơn", "Male", "0904000162"),
        };

        private record Line(string Name, string? Service, decimal Price, int Quantity = 1);

        private record Pay(int Day, decimal Amount, string Method, string Status, int? ConfirmedBy = null);

        private record Diagnosis(string Code, string Name, string? Tooth = null);

        // One visit. Day: days from today (negative = past). Doctor: the doctor of the mock; another doctor of the same
        // room type is used when that one has no shift at that time. Book: service or variant codes of the appointment.
        private sealed class Visit
        {
            public string Patient = string.Empty;
            public int Day;
            public string Time = "08:00";
            public int Doctor;
            public string[] Book = { "DV001" };
            public bool WalkIn;
            public string? Complaint;
            public string? CheckIn;
            public Diagnosis[] Diagnoses = Array.Empty<Diagnosis>();
            public string? Invoice;
            public Line[] Lines = Array.Empty<Line>();
            public Pay[] Payments = Array.Empty<Pay>();
            public string? Plan;
            public int? FollowUpDays;
            public bool BookFollowUp;
        }

        private sealed record Booked(Appointment Appointment, StaffSchedule Shift, TimeOnly Time, DateTimeOffset CheckIn);

        // ---------- Builder ----------

        private sealed class Builder
        {
            private static readonly TimeSpan Offset = TimeSpan.FromHours(ClinicTimeConstants.UtcOffsetHours);
            // Same as Clinic.SlotDurationMinutes in ConfigRows
            private const int SlotMinutes = 30;
            private static readonly TimeOnly MorningStart = new(8, 0), MorningEnd = new(12, 0), AfternoonStart = new(13, 0), AfternoonEnd = new(17, 0);

            private readonly AppIdentityDbContext _db;
            private readonly UserManager<ApplicationUser> _userManager;
            private readonly DateOnly _monday;

            private readonly Dictionary<int, StaffProfile> _staff = new();
            private readonly Dictionary<StaffProfile, string> _roleOf = new();
            private readonly Dictionary<int, string> _userIds = new();
            private readonly Dictionary<string, Room> _rooms = new();
            private readonly Dictionary<string, Service> _services = new();
            private readonly Dictionary<string, ServiceVariant> _variants = new();
            private readonly Dictionary<string, Patient> _patients = new();
            private readonly List<StaffSchedule> _shifts = new();
            // Booked time ranges of each doctor per day, so two appointments of one doctor never overlap
            private readonly Dictionary<(StaffProfile, DateOnly), List<(TimeOnly Start, TimeOnly End)>> _booked = new();
            private readonly Dictionary<string, int> _queueNumbers = new();
            private readonly List<Invoice> _invoices = new();
            private int _appointments;

            public Builder(AppIdentityDbContext db, UserManager<ApplicationUser> userManager)
            {
                _db = db;
                _userManager = userManager;
                Today = DateOnly.FromDateTime(ClinicClock.Today);
                _monday = Today.AddDays(-(((int)Today.DayOfWeek + 6) % 7));
            }

            public DateOnly Today { get; }
            public int StaffCount => _staff.Count;
            public int ShiftCount => _shifts.Count;
            public int PatientCount => _patients.Count;
            public int AppointmentCount => _appointments;
            public int InvoiceCount => _invoices.Count;

            public async Task BuildAsync()
            {
                await AddStaffAsync();
                await AddCatalogAsync();
                AddShifts();
                AddLeaveRequests();
                await AddPatientsAsync();
                AddPastVisits();
                AddTodayVisits();
                AddUpcomingAppointments();
                AddRefundRequests();

                foreach (var invoice in _invoices)
                {
                    InvoiceMoneyHelper.Recalculate(invoice);
                }
            }

            // ---------- Staff ----------

            private async Task AddStaffAsync()
            {
                var now = DateTimeOffset.UtcNow;
                foreach (var row in StaffRows)
                {
                    var phone = ToE164(row.Phone);
                    var profile = new StaffProfile
                    {
                        FullName = row.FullName,
                        PhoneNumber = phone,
                        Gender = row.Gender,
                        DateOfBirth = ParseDate(row.BirthDate),
                        LicenseNumber = row.License,
                        Specialization = row.Role == RoleConstants.DoctorRole ? "Răng hàm mặt" : null,
                        IsActive = !row.Locked,
                        CreatedAt = now
                    };
                    var user = new ApplicationUser
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserName = row.Email,
                        Email = row.Email,
                        EmailConfirmed = true,
                        PhoneNumber = phone,
                        PhoneNumberConfirmed = true,
                        CreatedAt = now,
                        StaffProfile = profile
                    };
                    if (row.Locked)
                    {
                        // Same as StaffService.DeactivateStaffAsync
                        user.LockoutEnabled = true;
                        user.LockoutEnd = DateTimeOffset.MaxValue;
                    }

                    await CreateUserAsync(user, row.Role);
                    _staff[row.Id] = profile;
                    _roleOf[profile] = row.Role;
                    _userIds[row.Id] = user.Id;
                }
            }

            private async Task CreateUserAsync(ApplicationUser user, string role)
            {
                var result = await _userManager.CreateAsync(user, SamplePassword);
                if (result.Succeeded)
                {
                    result = await _userManager.AddToRoleAsync(user, role);
                }
                if (!result.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Sample user '{user.Email ?? user.UserName}' could not be created: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                }
            }

            private string UserIdOf(int staffId) => _userIds[staffId];

            // ---------- Rooms, services, settings ----------

            private async Task AddCatalogAsync()
            {
                var now = DateTimeOffset.UtcNow;

                var existingRooms = await _db.Rooms.ToListAsync();
                foreach (var row in RoomRows)
                {
                    var room = existingRooms.FirstOrDefault(r => r.RoomName == row.Name);
                    if (room == null)
                    {
                        room = new Room { RoomName = row.Name, RoomType = row.Type, Floor = row.Floor, Description = row.Description, Status = row.Status, CreatedAt = now };
                        _db.Rooms.Add(room);
                    }
                    _rooms[row.Key] = room;
                }

                var existingServices = await _db.Services.Include(s => s.Variants).ToListAsync();
                foreach (var row in ServiceRows)
                {
                    var service = existingServices.FirstOrDefault(s => s.ServiceCode == row.Code);
                    if (service == null)
                    {
                        service = new Service
                        {
                            ServiceCode = row.Code,
                            ServiceName = row.Name,
                            Description = row.Description,
                            ReferencePrice = row.Price,
                            EstimatedMinutes = row.Minutes,
                            RequiredRoomType = row.RoomType,
                            RecallIntervalMonths = row.RecallMonths,
                            IsActive = row.Active,
                            CreatedAt = now
                        };
                        _db.Services.Add(service);
                    }
                    _services[row.Code] = service;
                }

                foreach (var row in VariantRows)
                {
                    var service = _services[row.Service];
                    var variant = service.Variants.FirstOrDefault(v => v.VariantCode == row.Code);
                    if (variant == null)
                    {
                        variant = new ServiceVariant
                        {
                            Service = service,
                            VariantCode = row.Code,
                            VariantName = row.Name,
                            Description = row.Description,
                            ReferencePrice = row.Price,
                            EstimatedMinutes = row.Minutes,
                            DisplayOrder = row.Order,
                            IsActive = row.Active,
                            CreatedAt = now
                        };
                        service.Variants.Add(variant);
                    }
                    _variants[row.Code] = variant;
                }

                var existingConfigs = await _db.SystemConfigurations.ToListAsync();
                foreach (var row in ConfigRows)
                {
                    var config = existingConfigs.FirstOrDefault(c => c.ConfigKey == row.Key);
                    if (config == null)
                    {
                        _db.SystemConfigurations.Add(new SystemConfiguration { ConfigKey = row.Key, ConfigValue = row.Value, DataType = row.DataType, Description = row.Description });
                    }
                    else if (row.Key == ConfigKeyConstants.GeneralExamServiceCode)
                    {
                        // The sample appointments all start with DV001, so the booking flow must use it too
                        config.ConfigValue = row.Value;
                        config.UpdatedAt = now;
                    }
                }
            }

            // ---------- Shifts ----------

            // From ten weeks back (the oldest visit is 68 days ago) to the end of the week after next (follow-ups up to 14 days ahead).
            private void AddShifts()
            {
                var unassigned = Unassigned.Select(u => (WeekDate(u.Week, u.Weekday), u.Morning, u.Room)).ToHashSet();
                var now = DateTimeOffset.UtcNow;

                for (var date = _monday.AddDays(-70); date <= _monday.AddDays(20); date = date.AddDays(1))
                {
                    foreach (var (roomKey, morningStaff, afternoonStaff) in ShiftTemplate)
                    {
                        foreach (var morning in new[] { true, false })
                        {
                            if (unassigned.Contains((date, morning, roomKey))) continue;

                            var isReception = roomKey == Reception;
                            var shift = new StaffSchedule
                            {
                                StaffProfile = _staff[morning ? morningStaff : afternoonStaff],
                                Room = isReception ? null : _rooms[roomKey],
                                ScheduleDate = date,
                                ShiftStart = morning ? MorningStart : AfternoonStart,
                                ShiftEnd = morning ? MorningEnd : AfternoonEnd,
                                Assignment = isReception ? "Quầy lễ tân" : _rooms[roomKey].RoomType == RoomTypeConstants.XRay ? "Chụp phim" : "Khám & điều trị",
                                CreatedAt = now
                            };
                            _shifts.Add(shift);
                        }
                    }
                }

                foreach (var absence in Absences)
                {
                    var date = WeekDate(absence.Week, absence.Weekday);
                    if (date >= Today) continue;
                    foreach (var shift in ShiftsOf(date, absence.Morning, absence.Room))
                    {
                        shift.IsPresent = false;
                        shift.AbsenceReason = absence.Reason;
                    }
                }
            }

            private IEnumerable<StaffSchedule> ShiftsOf(DateOnly date, bool morning, string roomKey) =>
                _shifts.Where(s => s.ScheduleDate == date && (s.ShiftStart < LeaveRequestConstants.AfternoonStartsAt) == morning
                    && (roomKey == Reception ? s.Room == null : s.Room == _rooms[roomKey]));

            // Past shifts were worked; this morning's shifts are started (so the doctors can call patients), the rest not yet.
            private void MarkAttendance()
            {
                foreach (var shift in _shifts.Where(s => s.IsPresent == null))
                {
                    if (shift.ScheduleDate < Today)
                    {
                        var late = (shift.StaffProfile.FullName.Length + shift.ScheduleDate.Day) % 7;
                        shift.IsPresent = true;
                        shift.ActualStartTime = shift.ShiftStart.AddMinutes(late - 5);
                        shift.ActualEndTime = shift.ShiftEnd.AddMinutes(late % 3);
                    }
                    else if (shift.ScheduleDate == Today && shift.ShiftStart == MorningStart)
                    {
                        shift.IsPresent = true;
                        shift.ActualStartTime = new TimeOnly(7, 55);
                    }
                }
            }

            // ---------- Leave requests (applied to the shifts the same way LeaveRequestService.ApproveAsync does) ----------

            private void AddLeaveRequests()
            {
                foreach (var row in LeaveRows)
                {
                    var date = WeekDate(row.Week, row.Weekday);
                    var staff = _staff[row.Staff];
                    var createdAt = At(date.AddDays(-row.DaysBefore), row.Time);
                    var reviewed = row.Status is LeaveRequestConstants.Approved or LeaveRequestConstants.Rejected;
                    var leave = new LeaveRequest
                    {
                        StaffProfile = staff,
                        LeaveDate = date,
                        Slot = row.Morning switch { true => LeaveRequestConstants.SlotMorning, false => LeaveRequestConstants.SlotAfternoon, null => null },
                        Reason = row.Reason,
                        Status = row.Status,
                        SubstituteStaffProfile = row.Substitute is int sub ? _staff[sub] : null,
                        RejectionReason = row.RejectReason,
                        ReviewedByUserId = reviewed ? UserIdOf(Manager) : null,
                        ReviewedAt = reviewed ? createdAt.AddDays(1) : null,
                        CreatedAt = createdAt,
                        UpdatedAt = reviewed ? createdAt.AddDays(1) : null
                    };
                    _db.LeaveRequests.Add(leave);

                    if (row.Status != LeaveRequestConstants.Approved) continue;

                    var shifts = _shifts.Where(s => s.StaffProfile == staff && s.ScheduleDate == date
                        && (row.Morning == null || (s.ShiftStart < LeaveRequestConstants.AfternoonStartsAt) == row.Morning)).ToList();
                    foreach (var shift in shifts)
                    {
                        if (row.Substitute is int substitute)
                        {
                            shift.StaffProfile = _staff[substitute];
                            shift.Notes = $"Thay ca cho {staff.FullName} (đơn nghỉ ngày {date:dd/MM/yyyy})";
                        }
                        else
                        {
                            shift.IsPresent = false;
                            shift.AbsenceReason = $"Nghỉ phép: {row.Reason}";
                        }
                        shift.UpdatedAt = leave.ReviewedAt;
                    }
                }

                MarkAttendance();
                _db.StaffSchedules.AddRange(_shifts);
            }

            // ---------- Patients ----------

            private async Task AddPatientsAsync()
            {
                var now = DateTimeOffset.UtcNow;
                foreach (var row in PatientRows)
                {
                    var patient = new Patient
                    {
                        PatientCode = row.Code,
                        FullName = row.Name,
                        Gender = row.Gender,
                        PhoneNumber = ToE164(row.Phone),
                        DateOfBirth = ParseDate(row.BirthDate),
                        Address = row.Address,
                        Email = row.Email,
                        EmergencyContactPhone = row.EmergencyPhone is null ? null : ToE164(row.EmergencyPhone),
                        CreatedAt = At(Today.AddDays(-90), "09:00")
                    };
                    foreach (var allergy in row.Allergies ?? Array.Empty<string>())
                    {
                        patient.MedicalProfiles.Add(new PatientMedicalProfile { RecordType = "Allergy", Title = allergy, Severity = "Moderate", CreatedAt = now });
                    }
                    foreach (var condition in row.Conditions ?? Array.Empty<string>())
                    {
                        patient.MedicalProfiles.Add(new PatientMedicalProfile { RecordType = "Condition", Title = condition, CreatedAt = now });
                    }
                    _db.Patients.Add(patient);
                    _patients[row.Code] = patient;
                }

                // The mock patient account (mockData): signs in with 0912345678 / test@example.com
                var accountRow = PatientRows[0];
                var phone = ToE164(accountRow.Phone);
                if (await _userManager.FindByEmailAsync(accountRow.Email!) == null && !await _db.Users.AnyAsync(u => u.PhoneNumber == phone))
                {
                    var user = new ApplicationUser
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserName = phone,
                        Email = accountRow.Email,
                        EmailConfirmed = true,
                        PhoneNumber = phone,
                        PhoneNumberConfirmed = true,
                        CreatedAt = now
                    };
                    await CreateUserAsync(user, RoleConstants.PatientRole);
                    _patients[accountRow.Code].UserId = user.Id;
                }
            }

            // ---------- Visits ----------

            // Completed visits of the past days: the debts (MOCK_DEBT_INVOICES), the invoices of the refund requests
            // (MOCK_REFUND_REQUESTS) and the previous visits shown on the exam screen (MOCK_EXAM_RECORDS).
            private void AddPastVisits()
            {
                const string Cash = PaymentConstants.Cash, Bank = PaymentConstants.BankTransfer, Qr = PaymentConstants.QrTransfer;
                const string Ok = PaymentConstants.Confirmed, Waiting = PaymentConstants.Pending, Failed = PaymentConstants.Failed;

                // Previous visits of the exam screen
                Complete(new Visit { Patient = "BN000123", Day = -66, Time = "09:00", Doctor = Ha, Book = new[] { "DV001", "DV009-01" }, Complaint = "Ê buốt răng hàm dưới bên trái khi ăn lạnh",
                    Diagnoses = new[] { new Diagnosis("K02.1", "Sâu ngà răng", "36"), new Diagnosis("K02.0", "Sâu men răng", "37") },
                    Invoice = "HD000158", Lines = new[] { new Line("Chụp X-quang quanh chóp răng 36", "DV011", 100000), new Line("Trám composite răng 36", "DV009", 400000) },
                    Payments = new[] { new Pay(-66, 500000, Bank, Ok, Mai) } });
                Complete(new Visit { Patient = "BN000187", Day = -63, Time = "09:30", Doctor = Khoa, Book = new[] { "DV001", "DV003-02" }, Complaint = "Đau nhức răng hàm trên bên phải về đêm",
                    Diagnoses = new[] { new Diagnosis("K04.0", "Viêm tủy răng không hồi phục", "16") },
                    Invoice = "HD000160", Lines = new[] { new Line("Điều trị tủy răng 16", "DV003", 1500000) }, Payments = new[] { new Pay(-63, 1500000, Cash, Ok, Mai) } });
                Complete(new Visit { Patient = "BN000211", Day = -55, Time = "14:00", Doctor = Ha, Book = new[] { "DV001", "DV002-02" }, Complaint = "Chảy máu chân răng khi chải răng",
                    Diagnoses = new[] { new Diagnosis("K05.1", "Viêm lợi mạn tính") },
                    Invoice = "HD000163", Lines = new[] { new Line("Lấy cao răng toàn hàm", "DV002", 300000) }, Payments = new[] { new Pay(-55, 300000, Cash, Ok, Hang) } });

                // Debts (amounts still owed)
                Complete(new Visit { Patient = "BN000133", Day = -68, Time = "08:30", Doctor = Khoa, Book = new[] { "DV001", "DV009-01" }, Complaint = "Răng cửa ố, mẻ",
                    Invoice = "HD000176", Lines = new[] { new Line("Trám răng thẩm mỹ", "DV009", 500000, 3) }, Payments = new[] { new Pay(-68, 500000, Cash, Ok, Mai) }, FollowUpDays = 5 });
                Complete(new Visit { Patient = "BN000118", Day = -47, Time = "09:00", Doctor = Khoa, Complaint = "Răng hô, muốn niềng", Plan = "Niềng răng mắc cài kim loại",
                    Invoice = "HD000188",
                    Lines = new[] { new Line("Giai đoạn 1 · Gắn mắc cài kim loại", "DV006", 20000000), new Line("Giai đoạn 2 · Siết dây định kỳ (6 tháng)", "DV006", 18000000), new Line("Giai đoạn 3 · Tháo mắc cài & duy trì", "DV006", 7000000) },
                    Payments = new[] { new Pay(-47, 15000000, Cash, Ok, Mai), new Pay(-17, 12000000, Bank, Ok, Mai), new Pay(-5, 10000000, Bank, Failed), new Pay(-4, 10000000, Bank, Ok, Hang) }, FollowUpDays = 7 });
                Complete(new Visit { Patient = "BN000150", Day = -34, Time = "09:30", Doctor = Ha, Complaint = "Mất răng 46", Plan = "Cấy ghép Implant 46",
                    Invoice = "HD000192", Lines = new[] { new Line("Trụ Implant", "DV005", 16000000), new Line("Mão sứ trên Implant", "DV005", 8000000) },
                    Payments = new[] { new Pay(-34, 12000000, Bank, Ok, Hang) }, FollowUpDays = 12 });
                Complete(new Visit { Patient = "BN000151", Day = -21, Time = "14:30", Doctor = Anh, Complaint = "Răng 26 vỡ lớn", Plan = "Bọc răng sứ 26",
                    Invoice = "HD000201", Lines = new[] { new Line("Mão sứ toàn sứ", null, 6000000), new Line("Điều trị tủy trước bọc", "DV003", 500000) },
                    Payments = new[] { new Pay(-21, 4500000, Qr, Ok, Ngoc) } });
                var tuan = Complete(new Visit { Patient = "BN000098", Day = -3, Time = "09:00", Doctor = Ha, Book = new[] { "DV001", "DV004" }, Complaint = "Răng khôn hàm dưới mọc lệch, sưng đau",
                    Diagnoses = new[] { new Diagnosis("K01.1", "Răng khôn mọc ngầm", "38") },
                    Invoice = "HD000187", Lines = new[] { new Line("Nhổ răng khôn", "DV004", 1500000) }, Payments = new[] { new Pay(-3, 1500000, Qr, Waiting) } });
                Complete(new Visit { Patient = "BN000152", Day = -3, Time = "14:00", Doctor = Huy, Invoice = "HD000190", Lines = new[] { new Line("Khám tổng quát", "DV001", 150000) } });
                Complete(new Visit { Patient = "BN000153", Day = -1, Time = "08:30", Doctor = Khoa, Book = new[] { "DV001", "DV002-02", "DV009-01" },
                    Invoice = "HD000198", Lines = new[] { new Line("Lấy cao răng", "DV002", 300000), new Line("Trám răng", "DV009", 300000) } });
                Complete(new Visit { Patient = "BN000154", Day = -1, Time = "09:00", Doctor = Ha, Book = new[] { "DV001", "DV002-02" },
                    Invoice = "HD000203", Lines = new[] { new Line("Lấy cao răng", "DV002", 350000) } });
                Complete(new Visit { Patient = "BN000097", Day = -1, Time = "09:30", Doctor = Huy, Complaint = "Kiểm tra tổng quát, chụp phim toàn cảnh",
                    Invoice = "HD000204", Lines = new[] { new Line("Chụp X-quang toàn cảnh", "DV007", 250000) } });
                Complete(new Visit { Patient = "BN000101", Day = -1, Time = "14:00", Doctor = Anh, Complaint = "Đau răng 36", Plan = "Điều trị tủy răng 36",
                    Invoice = "HD000205", Lines = new[] { new Line("Điều trị tủy", "DV003", 1800000) }, Payments = new[] { new Pay(-1, 800000, Cash, Ok, Hang) }, FollowUpDays = 6 });
                Complete(new Visit { Patient = "BN000125", Day = -1, Time = "10:00", Doctor = Ha, Book = new[] { "DV001", "DV009-01" },
                    Invoice = "HD000206", Lines = new[] { new Line("Trám răng", "DV009", 400000) } });
                Complete(new Visit { Patient = "BN000090", Day = -1, Time = "10:30", Doctor = Khoa, Book = new[] { "DV001", "DV010-01" },
                    Invoice = "HD000207", Lines = new[] { new Line("Tẩy trắng răng", "DV010", 2500000) }, Payments = new[] { new Pay(-1, 2500000, Bank, Waiting) } });

                // Paid invoices that the refund requests are about (AddRefundRequests)
                Complete(new Visit { Patient = "BN000123", Day = -52, Time = "08:30", Doctor = Khoa, Book = new[] { "DV001", "DV002-02" }, Complaint = "Lấy cao răng định kỳ 6 tháng",
                    Diagnoses = new[] { new Diagnosis("K03.6", "Cao răng (lắng đọng trên răng)") },
                    Invoice = "HD000165", Lines = new[] { new Line("Khám tổng quát", "DV001", 150000), new Line("Lấy cao răng", "DV002", 300000) }, Payments = new[] { new Pay(-52, 450000, Cash, Ok, Mai) } });
                Complete(new Visit { Patient = "BN000125", Day = -26, Time = "09:00", Doctor = Ha, Book = new[] { "DV001", "DV009-01" },
                    Invoice = "HD000202", Lines = new[] { new Line("Trám răng", "DV009", 400000, 2) }, Payments = new[] { new Pay(-26, 800000, Cash, Ok, Hang) } });
                Complete(new Visit { Patient = "BN000133", Day = -28, Time = "10:00", Doctor = Khoa, Complaint = "Khám và tư vấn, không điều trị",
                    Invoice = "HD000171", Lines = new[] { new Line("Khám tổng quát", "DV001", 200000) }, Payments = new[] { new Pay(-28, 200000, Cash, Ok, Mai), new Pay(-28, 200000, Bank, Ok, Mai) } });
                Complete(new Visit { Patient = "BN000118", Day = -34, Time = "14:00", Doctor = Anh, Book = new[] { "DV001", "DV003-02" },
                    Invoice = "HD000150", Lines = new[] { new Line("Điều trị tủy răng 46", "DV003", 1500000) }, Payments = new[] { new Pay(-34, 1500000, Cash, Ok, Hang) } });
                Complete(new Visit { Patient = "BN000101", Day = -41, Time = "15:00", Doctor = Duc, Book = new[] { "DV001", "DV004" },
                    Invoice = "HD000141", Lines = new[] { new Line("Nhổ răng khôn", "DV004", 1250000) }, Payments = new[] { new Pay(-41, 1250000, Cash, Ok, Hang) } });
                Complete(new Visit { Patient = "BN000097", Day = -48, Time = "09:00", Doctor = Huy,
                    Invoice = "HD000136", Lines = new[] { new Line("Chụp X-quang toàn cảnh", "DV007", 250000) }, Payments = new[] { new Pay(-48, 250000, Cash, Ok, Ngoc) } });
                Complete(new Visit { Patient = "BN000090", Day = -58, Time = "10:00", Doctor = Khoa, Book = new[] { "DV001", "DV002-02" },
                    Invoice = "HD000122", Lines = new[] { new Line("Lấy cao răng", "DV002", 300000) }, Payments = new[] { new Pay(-58, 300000, Cash, Ok, Mai) } });

                // The X-ray films of Phạm Minh Tuấn's visit 3 days ago (YC000301 approved, YC000296 cancelled)
                var exam = tuan.Appointment.Examination!;
                var doctor = tuan.Shift.StaffProfile;
                var orderedAt = tuan.CheckIn.AddMinutes(20);
                AddImaging(exam, doctor, ImagingRequestConstants.Cancelled, ImagingRequestConstants.PeriapicalXRay, "Răng 36", orderedAt.AddMinutes(-5),
                    cancelReason: "Chỉ định trùng, đã thay bằng yêu cầu khác");
                var request = AddImaging(exam, doctor, ImagingRequestConstants.Completed, ImagingRequestConstants.PeriapicalXRay, "Răng 36", orderedAt);
                AddResult(request, TechnicianAt(tuan.Shift.ScheduleDate, TimeOnly.FromTimeSpan(orderedAt.TimeOfDay)), "pa_molar_quad4.png", orderedAt.AddMinutes(15),
                    "Reviewed", doctor, "Chân răng 38 nằm sát ống thần kinh, nhổ cẩn thận.");
            }

            // Today: the examined patients and the debts of today (MOCK_DEBT_INVOICES day 0, MOCK_EXAM_DONE), the queue of the
            // exam screen (MOCK_EXAM_QUEUE) and the two patients of the X-ray review screen (MOCK_IMAGING_REVIEWS).
            private void AddTodayVisits()
            {
                const string Bank = PaymentConstants.BankTransfer, Qr = PaymentConstants.QrTransfer, Ok = PaymentConstants.Confirmed;

                Complete(new Visit { Patient = "BN000155", WalkIn = true, CheckIn = "08:00", Doctor = Khoa, Complaint = "Răng khấp khểnh, muốn niềng trong suốt", Plan = "Niềng răng trong suốt",
                    Invoice = "HD000208", Lines = new[] { new Line("Khay niềng đợt 1", "DV006", 30000000) }, Payments = new[] { new Pay(0, 10000000, Bank, Ok, Hang) },
                    FollowUpDays = 14, BookFollowUp = true });
                Complete(new Visit { Patient = "BN000240", WalkIn = true, CheckIn = "08:10", Doctor = Khoa, Complaint = "Khám định kỳ",
                    Invoice = "HD000214", Lines = new[] { new Line("Khám tổng quát", "DV001", 150000) } });
                Complete(new Visit { Patient = "BN000156", WalkIn = true, CheckIn = "08:15", Doctor = Anh, Complaint = "Đau răng hàm trên",
                    Invoice = "HD000209", Lines = new[] { new Line("Khám tổng quát", "DV001", 150000), new Line("Chụp X-quang quanh chóp", "DV011", 100000, 2) } });
                Complete(new Visit { Patient = "BN000157", WalkIn = true, CheckIn = "08:30", Doctor = Huy, Complaint = "Răng sữa lung lay",
                    Invoice = "HD000210", Lines = new[] { new Line("Nhổ răng sữa", null, 200000) } });
                Complete(new Visit { Patient = "BN000241", WalkIn = true, CheckIn = "08:40", Doctor = Khoa, Book = new[] { "DV001", "DV002-02" },
                    Invoice = "HD000215", Lines = new[] { new Line("Lấy cao răng toàn hàm", "DV002", 300000) } });
                Complete(new Visit { Patient = "BN000158", WalkIn = true, CheckIn = "08:45", Doctor = Ha, Complaint = "Răng cửa đổi màu", Plan = "Bọc răng sứ 11, 21",
                    Invoice = "HD000211", Lines = new[] { new Line("Mão sứ toàn sứ", null, 6000000, 2) }, Payments = new[] { new Pay(0, 5000000, Qr, Ok, Ngoc) }, FollowUpDays = 10 });
                Complete(new Visit { Patient = "BN000159", WalkIn = true, CheckIn = "09:00", Doctor = Khoa, Book = new[] { "DV001", "DV002-02" },
                    Invoice = "HD000212", Lines = new[] { new Line("Lấy cao răng", "DV002", 300000) }, Payments = new[] { new Pay(0, 300000, Bank, PaymentConstants.Failed) } });
                Complete(new Visit { Patient = "BN000160", WalkIn = true, CheckIn = "09:15", Doctor = Anh, Book = new[] { "DV001", "DV009-01" },
                    Invoice = "HD000213", Lines = new[] { new Line("Trám răng", "DV009", 450000) } });

                // The queue of the exam screen, all for the doctor examining this morning (BS. Khoa, or whoever has the room)
                Open(new Visit { Patient = "BN000123", Time = "08:30", CheckIn = "08:21", Doctor = Khoa, Book = new[] { "DV001", "DV002-02", "DV009-01" }, Complaint = "Đau răng hàm dưới, muốn lấy cao răng" },
                    AppointmentConstants.CheckedInStatus);
                Open(new Visit { Patient = "BN000187", Time = "09:00", CheckIn = "08:35", Doctor = Khoa, Book = new[] { "DV001", "DV003-02" }, Complaint = "Đau nhức răng hàm trên bên phải về đêm" },
                    AppointmentConstants.CheckedInStatus);
                Open(new Visit { Patient = "BN000204", CheckIn = "08:42", WalkIn = true, Doctor = Khoa, Book = new[] { "DV001", "DV010-01" }, Complaint = "Muốn tẩy trắng răng" },
                    AppointmentConstants.CheckedInStatus);
                Open(new Visit { Patient = "BN000211", Time = "09:30", CheckIn = "08:50", Doctor = Khoa, Book = new[] { "DV001", "DV002-02" }, Complaint = "Lấy cao răng định kỳ" },
                    AppointmentConstants.CheckedInStatus);
                Open(new Visit { Patient = "BN000230", CheckIn = "09:02", WalkIn = true, Doctor = Khoa, Book = new[] { "DV001", "DV009-01" }, Complaint = "Răng cửa bị mẻ khi chơi thể thao" },
                    AppointmentConstants.CheckedInStatus);

                // YC000318: examined, filmed, waiting for the doctor's review and back in the doctor's queue
                var khanh = Open(new Visit { Patient = "BN000133", WalkIn = true, CheckIn = "08:08", Doctor = Khoa, Complaint = "Đau răng hàm dưới bên trái" },
                    AppointmentConstants.InServiceStatus);
                var khanhAt = At(Today, khanh.Time);
                var technician = TechnicianAt(Today, khanh.Time.AddMinutes(25));
                var request = AddImaging(khanh.Appointment.Examination!, khanh.Shift.StaffProfile, ImagingRequestConstants.Completed, ImagingRequestConstants.Panoramic, "Toàn hàm", khanhAt.AddMinutes(25));
                AddResult(request, technician, "pano_full_adult_01.png", khanhAt.AddMinutes(43), "Pending");
                AddResult(request, technician, "bw_left_molar_01.png", khanhAt.AddMinutes(44), "Pending");
                AddQueue(khanh.Appointment, QueueConstants.ImagingType, technician.Room, technician.StaffProfile, khanhAt.AddMinutes(26), QueueConstants.Completed);
                AddQueue(khanh.Appointment, QueueConstants.ExaminationType, khanh.Shift.Room, khanh.Shift.StaffProfile, khanhAt.AddMinutes(45), QueueConstants.Waiting,
                    notes: "Đã chụp phim, chờ bác sĩ xem kết quả");

                // YC000314: the film was rejected, the patient waits in the X-ray room for a retake
                var bao = Open(new Visit { Patient = "BN000117", WalkIn = true, CheckIn = "08:38", Doctor = Khoa, Complaint = "Đau vùng hàm, kiểm tra tổng quát" },
                    AppointmentConstants.InServiceStatus);
                var baoAt = At(Today, bao.Time);
                technician = TechnicianAt(Today, bao.Time.AddMinutes(5));
                request = AddImaging(bao.Appointment.Examination!, bao.Shift.StaffProfile, ImagingRequestConstants.InProgress, ImagingRequestConstants.Panoramic, "Toàn hàm", baoAt.AddMinutes(5));
                AddResult(request, technician, "pano_pediatric_01.png", baoAt.AddMinutes(20), "Rejected", bao.Shift.StaffProfile, "Ảnh bị nhoè do bệnh nhân cử động, cần chụp lại.");
                AddQueue(bao.Appointment, QueueConstants.ImagingType, technician.Room, null, baoAt.AddMinutes(30), QueueConstants.Waiting, notes: "Chụp lại phim toàn cảnh");

                // Booked for later today, not arrived yet (Check-in page)
                Open(new Visit { Patient = "BN000152", Day = 0, Time = "10:30", Doctor = Huy, Complaint = "Tái khám" }, AppointmentConstants.ConfirmedStatus);
                Open(new Visit { Patient = "BN000154", Day = 0, Time = "14:00", Doctor = Anh, Book = new[] { "DV001", "DV009-01" } }, AppointmentConstants.ConfirmedStatus);
                Open(new Visit { Patient = "BN000153", Day = 0, Time = "15:00", Doctor = Anh, Book = new[] { "DV001", "DV009-01" }, Complaint = "Trám nốt răng còn lại" }, AppointmentConstants.ConfirmedStatus);
            }

            // Coming days: requests to confirm and the patients booked in the shifts of the leave requests (mockShifts).
            private void AddUpcomingAppointments()
            {
                Open(new Visit { Patient = "BN000157", Day = 2, Time = "09:00", Doctor = Huy, Complaint = "Kiểm tra sau nhổ răng sữa" }, AppointmentConstants.PendingStatus);
                Open(new Visit { Patient = "BN000160", Day = 3, Time = "14:00", Doctor = Anh, Book = new[] { "DV001", "DV002-02" } }, AppointmentConstants.PendingStatus);
                Open(new Visit { Patient = "BN000156", Day = 4, Time = "10:00", Doctor = Ha, Book = new[] { "DV001", "DV003-02" }, Complaint = "Điều trị tủy theo kết quả phim" }, AppointmentConstants.PendingStatus);

                // KHOA_APPOINTMENTS: on the day of leave #2, now with the substitute BS. Huy
                var friday = WeekDate(1, 4).DayNumber - Today.DayNumber;
                Open(new Visit { Patient = "BN000098", Day = friday, Time = "08:30", Doctor = Huy, Complaint = "Khám tổng quát" }, AppointmentConstants.ConfirmedStatus);
                Open(new Visit { Patient = "BN000118", Day = friday, Time = "09:30", Doctor = Huy, Book = new[] { "DV001", "DV003-02" } }, AppointmentConstants.ConfirmedStatus);
                Open(new Visit { Patient = "BN000150", Day = friday, Time = "10:30", Doctor = Huy, Book = new[] { "DV001", "DV009-01" } }, AppointmentConstants.ConfirmedStatus);

                // ANH_APPOINTMENTS: in the shift of the pending leave #6
                var tuesday = WeekDate(1, 1).DayNumber - Today.DayNumber;
                Open(new Visit { Patient = "BN000161", Day = tuesday, Time = "13:30", Doctor = Anh, Book = new[] { "DV001", "DV002-02" } }, AppointmentConstants.ConfirmedStatus);
                Open(new Visit { Patient = "BN000162", Day = tuesday, Time = "15:00", Doctor = Anh, Complaint = "Tư vấn nhổ răng khôn" }, AppointmentConstants.ConfirmedStatus);
            }

            // MOCK_REFUND_REQUESTS, on the invoices made in AddPastVisits
            private void AddRefundRequests()
            {
                const string Pending = PaymentConstants.RefundRequestStatus.Pending, Approved = PaymentConstants.RefundRequestStatus.Approved,
                    Rejected = PaymentConstants.RefundRequestStatus.Rejected, Processed = PaymentConstants.RefundRequestStatus.Processed;

                Refund("HD000165", -49, Mai, 150000, "Thu trùng phí lấy cao răng đã có trong gói khám định kỳ.", Pending);
                Refund("HD000202", -25, Hang, 400000, "Bệnh nhân chỉ trám 1 răng nhưng hoá đơn tính 2 răng.", Pending);
                Refund("HD000171", -27, Mai, 200000, "Thanh toán hai lần cho cùng một hoá đơn.", Processed);
                Refund("HD000150", -32, Hang, 1500000, "Bệnh nhân không hài lòng và muốn hoàn phí điều trị.", Rejected, "Dịch vụ đã thực hiện đầy đủ, bác sĩ xác minh không có sai sót.");
                Refund("HD000141", -39, Mai, 1250000, "Ca nhổ răng bị huỷ sau khi bệnh nhân đã thanh toán.", Processed);
                Refund("HD000136", -46, Ngoc, 250000, "Dịch vụ chưa được thực hiện.", Approved);
                Refund("HD000122", -56, Mai, 50000, "Áp dụng thiếu mã giảm giá khi thanh toán.", Rejected, "Mã giảm giá đã hết hạn tại thời điểm thanh toán.");
            }

            private void Refund(string invoiceNumber, int day, int requestedBy, decimal amount, string reason, string status, string? rejectReason = null)
            {
                var invoice = _invoices.Single(i => i.InvoiceNumber == invoiceNumber);
                var createdAt = At(Today.AddDays(day), "09:30");
                var reviewed = status != PaymentConstants.RefundRequestStatus.Pending;
                invoice.RefundAdjustmentRequests.Add(new RefundAdjustmentRequest
                {
                    RequestType = PaymentConstants.RefundRequestType.Refund,
                    Amount = amount,
                    Reason = reason,
                    Status = status,
                    RequestedByUserId = UserIdOf(requestedBy),
                    ApprovedByUserId = reviewed ? UserIdOf(Manager) : null,
                    ApprovedAt = reviewed ? createdAt.AddDays(1) : null,
                    RejectionReason = rejectReason,
                    ProcessedAt = status == PaymentConstants.RefundRequestStatus.Processed ? createdAt.AddDays(2) : null,
                    CreatedAt = createdAt
                });
            }

            // A finished visit: appointment, examination, invoice (and its plan), today also the finished queue entry.
            private Booked Complete(Visit visit)
            {
                var booked = Book(visit, AppointmentConstants.CompletedStatus);
                var appointment = booked.Appointment;
                var doctor = booked.Shift.StaffProfile;
                var start = At(appointment.AppointmentDate, booked.Time);
                var end = start.AddMinutes(appointment.ServiceItems.Sum(i => i.DurationMinutes));

                var exam = NewExamination(visit, appointment, doctor, start);
                exam.ExaminationStatus = ExaminationConstants.Completed;
                exam.UpdatedAt = end;
                if (visit.FollowUpDays is int days)
                {
                    exam.FollowUpDate = Today.AddDays(days);
                    exam.FollowUpNotes = visit.Plan != null ? $"Tái khám theo kế hoạch: {visit.Plan}" : "Hẹn tái khám kiểm tra";
                }

                if (appointment.AppointmentDate == Today)
                {
                    AddQueue(appointment, QueueConstants.ExaminationType, booked.Shift.Room, doctor, booked.CheckIn, QueueConstants.Completed, start, end);
                }

                if (visit.Invoice != null)
                {
                    AddInvoice(visit, appointment, exam, doctor, end);
                }

                if (visit.BookFollowUp)
                {
                    var followUp = Book(new Visit { Patient = visit.Patient, Day = exam.FollowUpDate!.Value.DayNumber - Today.DayNumber, Time = "09:00", Doctor = visit.Doctor, Complaint = exam.FollowUpNotes },
                        AppointmentConstants.ConfirmedStatus);
                    followUp.Appointment.ParentAppointment = appointment;
                    exam.FollowUpAppointment = followUp.Appointment;
                }

                return booked;
            }

            // An unfinished appointment. Checked-in patients wait in the doctor's queue; patients in service have an open examination.
            private Booked Open(Visit visit, string status)
            {
                var booked = Book(visit, status);
                var appointment = booked.Appointment;
                if (status == AppointmentConstants.CheckedInStatus)
                {
                    AddQueue(appointment, QueueConstants.ExaminationType, booked.Shift.Room, booked.Shift.StaffProfile, booked.CheckIn, QueueConstants.Waiting, notes: visit.Complaint);
                }
                else if (status == AppointmentConstants.InServiceStatus)
                {
                    var start = At(Today, booked.Time);
                    NewExamination(visit, appointment, booked.Shift.StaffProfile, start);
                    AddQueue(appointment, QueueConstants.ExaminationType, booked.Shift.Room, booked.Shift.StaffProfile, booked.CheckIn, QueueConstants.Completed, start, start.AddMinutes(20));
                }
                return booked;
            }

            // Creates the appointment in a shift of a doctor who works in a room of the type its services need.
            private Booked Book(Visit visit, string status)
            {
                var date = Today.AddDays(visit.Day);
                var now = DateTimeOffset.UtcNow;
                var items = visit.Book.Select(code => BookedItem(code, now)).ToList();
                var roomType = items.Select(i => i.Service.RequiredRoomType).FirstOrDefault(t => t != null) ?? RoomTypeConstants.GeneralTreatment;
                var wanted = visit.WalkIn ? T(visit.CheckIn!).AddMinutes(10) : T(visit.Time);
                var minutes = items.Sum(i => i.DurationMinutes);
                var (shift, time) = PickShift(date, _staff[visit.Doctor], wanted, minutes, roomType, RoleConstants.DoctorRole, visit.WalkIn);
                var checkIn = visit.CheckIn != null ? At(date, visit.CheckIn) : At(date, time).AddMinutes(-10);
                var arrived = status is AppointmentConstants.CheckedInStatus or AppointmentConstants.InServiceStatus or AppointmentConstants.CompletedStatus;

                var appointment = new Appointment
                {
                    Patient = _patients[visit.Patient],
                    Doctor = shift.StaffProfile,
                    AppointmentType = visit.WalkIn ? AppointmentConstants.WalkInType : AppointmentConstants.BookedType,
                    AppointmentDate = date,
                    TimeSlotStart = visit.WalkIn ? null : time,
                    TimeSlotEnd = visit.WalkIn ? null : time.AddMinutes(minutes),
                    Status = status,
                    CheckInAt = arrived ? checkIn : null,
                    Notes = visit.Complaint,
                    CreatedAt = visit.WalkIn ? checkIn : At(date.AddDays(-3), "20:00"),
                    UpdatedAt = arrived ? checkIn : null,
                    ServiceItems = items
                };
                _db.Appointments.Add(appointment);
                _appointments++;
                return new Booked(appointment, shift, time, checkIn);
            }

            private AppointmentServiceItem BookedItem(string code, DateTimeOffset now)
            {
                if (_variants.TryGetValue(code, out var variant))
                {
                    return new AppointmentServiceItem { Service = variant.Service, Variant = variant, DurationMinutes = variant.EstimatedMinutes ?? 30, PriceAtBooking = variant.ReferencePrice, CreatedAt = now };
                }
                var service = _services[code];
                return new AppointmentServiceItem { Service = service, DurationMinutes = service.EstimatedMinutes ?? 30, PriceAtBooking = service.ReferencePrice, CreatedAt = now };
            }

            // The shift to book in: the wanted doctor at the wanted time if possible, else another doctor of that room type
            // at that time, else the wanted doctor or anyone that day. A booked appointment then takes the first free slot from
            // the wanted time on, with the BE rules (AppointmentService.FindSlotsAsync): slots start every SlotMinutes from the
            // start of the shift, fit in the shift, and never overlap another active appointment of the doctor.
            // A walk-in has no slot, it only needs a doctor on shift.
            private (StaffSchedule Shift, TimeOnly Time) PickShift(DateOnly date, StaffProfile wanted, TimeOnly time, int minutes, string roomType, string role, bool walkIn)
            {
                var candidates = _shifts.Where(s => s.ScheduleDate == date && s.IsPresent != false && s.Room?.RoomType == roomType && _roleOf[s.StaffProfile] == role).ToList();
                bool Covers(StaffSchedule s) => s.ShiftStart <= time && time < s.ShiftEnd;
                var ordered = candidates.Where(s => s.StaffProfile == wanted && Covers(s))
                    .Concat(candidates.Where(Covers))
                    .Concat(candidates.Where(s => s.StaffProfile == wanted))
                    .Concat(candidates)
                    .Distinct()
                    .ToList();
                if (ordered.Count == 0)
                {
                    throw new InvalidOperationException($"No {role} works in a {roomType} room on {date:yyyy-MM-dd}.");
                }
                if (walkIn)
                {
                    return (ordered[0], time);
                }

                foreach (var shift in ordered)
                {
                    var booked = _booked.TryGetValue((shift.StaffProfile, date), out var list) ? list : _booked[(shift.StaffProfile, date)] = new();
                    var from = Covers(shift) ? time : shift.ShiftStart;
                    for (var start = shift.ShiftStart; start.AddMinutes(minutes) <= shift.ShiftEnd && start >= shift.ShiftStart; start = start.AddMinutes(SlotMinutes))
                    {
                        var end = start.AddMinutes(minutes);
                        if (start < from || booked.Any(b => b.Start < end && start < b.End)) continue;
                        booked.Add((start, end));
                        return (shift, start);
                    }
                }
                throw new InvalidOperationException($"No free {minutes}-minute slot for a {role} in a {roomType} room on {date:yyyy-MM-dd}.");
            }

            // The technician working in an X-ray room at that time (any technician of the day if nobody is).
            private StaffSchedule TechnicianAt(DateOnly date, TimeOnly time)
            {
                var shifts = _shifts.Where(s => s.ScheduleDate == date && s.IsPresent != false && s.Room?.RoomType == RoomTypeConstants.XRay).ToList();
                return shifts.FirstOrDefault(s => s.ShiftStart <= time && time < s.ShiftEnd) ?? shifts.FirstOrDefault()
                    ?? throw new InvalidOperationException($"No technician works on {date:yyyy-MM-dd}.");
            }

            private Examination NewExamination(Visit visit, Appointment appointment, StaffProfile doctor, DateTimeOffset start)
            {
                var exam = new Examination
                {
                    Patient = appointment.Patient,
                    Doctor = doctor,
                    ChiefComplaint = visit.Complaint,
                    ExaminationStatus = ExaminationConstants.InProgress,
                    CreatedAt = start
                };
                foreach (var (diagnosis, index) in visit.Diagnoses.Select((d, i) => (d, i)))
                {
                    exam.Diagnoses.Add(new ClinicalDiagnosis
                    {
                        DiagnosisCode = diagnosis.Code,
                        DiagnosisName = diagnosis.Name,
                        Description = diagnosis.Tooth != null ? $"Răng {diagnosis.Tooth}" : null,
                        IsPrimary = index == 0,
                        DiagnosedByDoctor = doctor,
                        CreatedAt = start.AddMinutes(10)
                    });
                }
                appointment.Examination = exam;
                return exam;
            }

            private void AddInvoice(Visit visit, Appointment appointment, Examination exam, StaffProfile doctor, DateTimeOffset createdAt)
            {
                TreatmentPlan? plan = null;
                if (visit.Plan != null)
                {
                    plan = new TreatmentPlan
                    {
                        Examination = exam,
                        Patient = appointment.Patient,
                        CreatedByDoctor = doctor,
                        PlanName = visit.Plan,
                        TotalStages = visit.Lines.Length,
                        EstimatedTotalCost = visit.Lines.Sum(l => l.Price * l.Quantity),
                        Status = "InProgress",
                        ApprovedAt = createdAt,
                        CreatedAt = createdAt.AddMinutes(-10)
                    };
                    exam.TreatmentPlans.Add(plan);
                }

                var invoice = new Invoice
                {
                    InvoiceNumber = visit.Invoice!,
                    Appointment = appointment,
                    Patient = appointment.Patient,
                    TreatmentPlan = plan,
                    CreatedAt = createdAt
                };
                foreach (var (line, index) in visit.Lines.Select((l, i) => (l, i)))
                {
                    TreatmentPlanStage? stage = null;
                    if (plan != null)
                    {
                        stage = new TreatmentPlanStage
                        {
                            StageNumber = index + 1,
                            StageName = line.Name,
                            Service = line.Service != null ? _services[line.Service] : null,
                            EstimatedCost = line.Price * line.Quantity,
                            StageStatus = index == 0 ? "InProgress" : "Scheduled",
                            ScheduledDate = index == 0 ? appointment.AppointmentDate : null,
                            ActualDate = index == 0 ? appointment.AppointmentDate : null,
                            PerformedByDoctor = index == 0 ? doctor : null,
                            CreatedAt = plan.CreatedAt
                        };
                        plan.Stages.Add(stage);
                    }
                    invoice.Items.Add(new InvoiceItem
                    {
                        Service = line.Service != null ? _services[line.Service] : null,
                        ServiceName = line.Name,
                        UnitPrice = line.Price,
                        Quantity = line.Quantity,
                        Amount = line.Price * line.Quantity,
                        TreatmentPlanStage = stage,
                        SortOrder = index + 1
                    });
                }
                invoice.TotalAmount = invoice.Items.Sum(i => i.Amount);
                invoice.FinalAmount = invoice.TotalAmount;

                foreach (var pay in visit.Payments)
                {
                    var paidAt = At(Today.AddDays(pay.Day), "16:30");
                    if (pay.Day == visit.Day) paidAt = createdAt.AddMinutes(5);
                    invoice.Payments.Add(new Payment
                    {
                        Amount = pay.Amount,
                        PaymentMethod = pay.Method,
                        PaymentStatus = pay.Status,
                        Purpose = PaymentConstants.PurposeRegular,
                        PaidAt = pay.Status == PaymentConstants.Confirmed ? paidAt : null,
                        ConfirmedByUserId = pay.ConfirmedBy is int by ? UserIdOf(by) : null,
                        CreatedAt = paidAt
                    });
                }

                _db.Invoices.Add(invoice);
                _invoices.Add(invoice);
            }

            private void AddQueue(Appointment appointment, string type, Room? room, StaffProfile? staff, DateTimeOffset createdAt, string status,
                DateTimeOffset? startedAt = null, DateTimeOffset? completedAt = null, string? notes = null)
            {
                _queueNumbers[type] = _queueNumbers.GetValueOrDefault(type) + 1;
                var done = status == QueueConstants.Completed;
                appointment.QueueEntries.Add(new QueueEntry
                {
                    QueueType = type,
                    Room = room,
                    AssignedStaff = staff,
                    QueueNumber = _queueNumbers[type],
                    Priority = appointment.Priority,
                    Status = status,
                    CalledAt = done ? (startedAt ?? createdAt.AddMinutes(5)).AddMinutes(-2) : null,
                    StartedAt = done ? startedAt ?? createdAt.AddMinutes(5) : null,
                    CompletedAt = done ? completedAt ?? createdAt.AddMinutes(15) : null,
                    Notes = notes,
                    CreatedAt = createdAt
                });
            }

            private ImagingRequest AddImaging(Examination exam, StaffProfile doctor, string status, string type, string area, DateTimeOffset createdAt, string? cancelReason = null)
            {
                var request = new ImagingRequest
                {
                    RequestedByDoctor = doctor,
                    ImagingType = type,
                    TargetArea = area,
                    RequestStatus = status,
                    ClinicalIndication = "Đánh giá tình trạng răng và chân răng",
                    CancelReason = cancelReason,
                    CreatedAt = createdAt,
                    UpdatedAt = createdAt.AddMinutes(20)
                };
                exam.ImagingRequests.Add(request);
                return request;
            }

            // Sample films are the ones of oze-xray-simulator (also copied to oze-clinic-fe/src/assets/mock/xray).
            private static void AddResult(ImagingRequest request, StaffSchedule technician, string file, DateTimeOffset createdAt, string reviewStatus,
                StaffProfile? reviewer = null, string? doctorNotes = null)
            {
                request.Results.Add(new ImagingResult
                {
                    UploadedByTechnician = technician.StaffProfile,
                    FilePath = $"mock/xray/{file}",
                    FileName = file,
                    MimeType = "image/png",
                    TechnicianNotes = "Chụp đúng chỉ định",
                    ReviewStatus = reviewStatus,
                    ReviewedByDoctor = reviewer,
                    DoctorNotes = doctorNotes,
                    ReviewedAt = reviewer != null ? createdAt.AddMinutes(10) : null,
                    CreatedAt = createdAt
                });
            }

            // ---------- Helpers ----------

            private DateOnly WeekDate(int week, int weekday) => _monday.AddDays(week * WorkShiftConstants.DaysInWeek + weekday);

            private static DateTimeOffset At(DateOnly date, string time) => At(date, T(time));

            private static DateTimeOffset At(DateOnly date, TimeOnly time) => new(date.ToDateTime(time), Offset);

            private static TimeOnly T(string time) => TimeOnly.ParseExact(time, "HH:mm");

            private static DateOnly? ParseDate(string? value) => value is null ? null : DateOnly.ParseExact(value, "yyyy-MM-dd");

            // "0912345678" -> "+84912345678", the form the BE stores (PhoneNumberHelper)
            private static string ToE164(string phone) => "+84" + phone[1..];
        }
    }
}
