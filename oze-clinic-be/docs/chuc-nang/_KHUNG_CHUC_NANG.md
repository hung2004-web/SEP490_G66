# <Mã F-xx> <Tên chức năng>

> Khung chung cho mọi file chức năng. Copy file này khi thêm chức năng mới, giữ đúng thứ tự mục.
> Nghiệp vụ tổng: [Dac_ta_nghiep_vu_OZE.md](../Dac_ta_nghiep_vu_OZE.md). Mã quy tắc `BR-...` lấy từ đó.

| Mục | Giá trị |
|---|---|
| Module | M? <tên module> |
| Trạng thái | ✅ Đã có API / 🟡 Một phần / ⬜ Chưa làm |
| Vai trò được dùng | <role> |
| API | `<METHOD> <route>` |
| Code chính | `<Controller>.<Action>` → `<Service>.<Method>` → `<Repository>` |

## 1. Chức năng này làm gì

1–3 câu, ngôn ngữ nghiệp vụ: ai làm, để đạt được gì, kết quả là gì.

## 2. Tiền điều kiện

- Điều kiện phải đúng trước khi gọi (đăng nhập, vai trò, trạng thái bản ghi, cấu hình...).

## 3. API

**Request** `<METHOD> <route>`, quyền `<Authorize roles>`

| Trường | Kiểu | Bắt buộc | Ràng buộc | Ý nghĩa |
|---|---|---|---|---|

Ví dụ:

```json
{}
```

**Response thành công** (`ApiResponse<...>`, HTTP 200/201)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|

**Lỗi**

| HTTP | Khi nào | Message (`ErrorConstants`) |
|---|---|---|

## 4. Luồng xử lý trong code

1. Bước theo đúng thứ tự code chạy, kèm `File.cs:dòng`.

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc | Được kiểm tra ở |
|---|---|---|

## 6. Trạng thái và dữ liệu thay đổi

| Bảng / đối tượng | Trước | Sau | Ghi chú |
|---|---|---|---|

## 7. Liên quan

- Trước đó: chức năng nào dẫn tới đây.
- Sau đó: chức năng nào dùng kết quả này.

## 8. Kiểm thử

- Test hiện có: `<TestClass>.<TestMethod>` hoặc "Chưa có".
- Ca cần test thêm.

## 9. Còn thiếu / câu hỏi mở

- Việc chưa làm, lệch giữa tài liệu và code, câu hỏi `Q..` trong mục 8 của tài liệu tổng.
