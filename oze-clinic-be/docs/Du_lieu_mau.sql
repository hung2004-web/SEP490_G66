-- Dữ liệu mẫu cho OzeDatabase (môi trường phát triển).
-- Giá, thời lượng và tên phòng là SỐ MẪU để chạy thử, KHÔNG phải số liệu thật của OZE.
-- Chạy lặp lại được: dòng nào đã có thì bỏ qua, không tạo trùng.
-- Chạy bằng sqlcmd cần thêm -f 65001 để đọc đúng tiếng Việt.

SET NOCOUNT ON;

-- 1. Cấu hình: mã dịch vụ khám tổng quát (luôn có trong mọi lịch hẹn)
IF NOT EXISTS (SELECT 1 FROM SystemConfigurations WHERE ConfigKey = 'Booking.GeneralExamServiceCode')
    INSERT INTO SystemConfigurations (ConfigKey, ConfigValue, DataType, Description)
    VALUES ('Booking.GeneralExamServiceCode', 'KHAM-TQ', 'String', N'Mã dịch vụ khám tổng quát, tự thêm vào mọi lịch hẹn');

-- 2. Phòng: mỗi loại phòng một hoặc hai phòng
INSERT INTO Rooms (RoomName, RoomType, Status, Floor)
SELECT v.RoomName, v.RoomType, 'Active', v.Floor
FROM (VALUES
    (N'Phòng khám 1',    'GeneralTreatment', '1'),
    (N'Phòng khám 2',    'GeneralTreatment', '1'),
    (N'Phòng tiểu phẫu', 'MinorSurgery',     '2'),
    (N'Phòng X-quang',   'XRay',             '1')
) AS v (RoomName, RoomType, Floor)
WHERE NOT EXISTS (SELECT 1 FROM Rooms r WHERE r.RoomName = v.RoomName);

-- 3. Dịch vụ. Khám tổng quát để trống loại phòng để không bị chặn khi đặt cùng dịch vụ khác
INSERT INTO Services (ServiceCode, ServiceName, Description, ReferencePrice, EstimatedMinutes, RequiredRoomType)
SELECT v.ServiceCode, v.ServiceName, v.Description, v.ReferencePrice, v.EstimatedMinutes, v.RequiredRoomType
FROM (VALUES
    ('KHAM-TQ',  N'Nha khoa tổng quát',  N'Khám tổng quát, có thể chọn thêm các dịch vụ nha khoa tổng quát', 100000,   30, CAST(NULL AS NVARCHAR(20))),
    ('IMPLANT',  N'Trồng răng Implant',  N'Cấy ghép răng Implant',                                           15000000, 90, 'MinorSurgery'),
    ('NHO-RK',   N'Nhổ răng khôn',       N'Nhổ răng khôn tiểu phẫu',                                         1500000,  60, 'MinorSurgery'),
    ('XQUANG',   N'Chụp X-quang',        N'Chụp phim X-quang răng',                                          150000,   15, 'XRay')
) AS v (ServiceCode, ServiceName, Description, ReferencePrice, EstimatedMinutes, RequiredRoomType)
WHERE NOT EXISTS (SELECT 1 FROM Services s WHERE s.ServiceCode = v.ServiceCode);

-- 4. Biến thể của dịch vụ Nha khoa tổng quát (theo menu nha khoa tổng quát trên website)
INSERT INTO ServiceVariants (ServiceId, VariantCode, VariantName, ReferencePrice, EstimatedMinutes, DisplayOrder)
SELECT s.Id, v.VariantCode, v.VariantName, v.ReferencePrice, v.EstimatedMinutes, v.DisplayOrder
FROM (VALUES
    ('NHO-RT',  N'Nhổ răng thường',    300000, 30, 1),
    ('TRAM',    N'Trám răng',          400000, 30, 2),
    ('HAN',     N'Hàn răng',           400000, 30, 3),
    ('CAO-RANG',N'Lấy cao răng',       200000, 30, 4),
    ('TUY',     N'Điều trị tủy răng',  1200000, 60, 5)
) AS v (VariantCode, VariantName, ReferencePrice, EstimatedMinutes, DisplayOrder)
JOIN Services s ON s.ServiceCode = 'KHAM-TQ'
WHERE NOT EXISTS (SELECT 1 FROM ServiceVariants x WHERE x.VariantCode = v.VariantCode);

-- 5. Kiểm tra nhanh
SELECT 'SystemConfigurations (GeneralExam)' AS Bang, COUNT(*) AS SoDong FROM SystemConfigurations WHERE ConfigKey = 'Booking.GeneralExamServiceCode'
UNION ALL SELECT 'Rooms', COUNT(*) FROM Rooms
UNION ALL SELECT 'Services', COUNT(*) FROM Services
UNION ALL SELECT 'ServiceVariants', COUNT(*) FROM ServiceVariants;
