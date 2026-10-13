export const Exception = [
    {
        "code": 400,
        "label-status": "HTTP 400: Yêu cầu không hợp lệ",
        "title": "Dữ liệu gửi lên chưa đúng",
        "message": "Hệ thống không đọc được yêu cầu này. Hãy kiểm tra lại thông tin vừa nhập rồi thử lại"
    },
    {
        "code": 401,
        "label-status": "HTTP 401: Phiên đăng nhập hết hạn",
        "title": "Bạn cần đăng nhập lại",
        "message": "Phiên làm việc đã kết thúc để bảo vệ dữ liệu bệnh nhân. Đăng nhập lại để tiếp tục, thao tác đang làm dở sẽ không bị mất."
    },
    {
        "code": 403,
        "label-status": "HTTP 403: Truy cập bị từ chối",
        "title": "Bạn không có quyền thực hiện hành động này",
        "message": "Yêu cầu của bạn không được phép. Vui lòng liên hệ với quản trị viên nếu bạn nghĩ đây là một lỗi."
    },
    {
        "code": 404,
        "label-status": "HTTP 404: Không tìm thấy tài nguyên",
        "title": "Không tìm thấy trang",
        "message": "Trang bạn yêu cầu không tồn tại. Vui lòng kiểm tra lại đường dẫn hoặc liên hệ với quản trị viên."
    },
    {
        "code": 408,
        "label-status": "HTTP 408: Yêu cầu hết thời gian",
        "title": "Yêu cầu hết thời gian",
        "message": "Yêu cầu của bạn đã hết thời gian chờ. Vui lòng thử lại."
    },
    {
        "code": 409,
        "label-status": "HTTP 409: Xung đột tài nguyên",
        "title": "Xung đột dữ liệu",
        "message": "Yêu cầu của bạn gây ra xung đột với trạng thái hiện tại của tài nguyên. Vui lòng thử lại sau."
    },
    {
        "code": 422,
        "label-status": "HTTP 422: Yêu cầu không thể xử lý",
        "title": "Dữ liệu gửi lên chưa đúng",
        "message": "Hệ thống không đọc được yêu cầu này. Hãy kiểm tra lại thông tin vừa nhập rồi thử lại"
    },
    {
        "code": 429,
        "label-status": "HTTP 429: Yêu cầu quá tải",
        "title": "Quá nhiều yêu cầu",
        "message": "Hệ thống đang bận. Vui lòng thử lại sau."
    },
    {
        "code": 500,
        "label-status": "HTTP 500: Lỗi máy chủ",
        "title": "Đã xảy ra lỗi trên máy chủ",
        "message": "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
    },
    {
        "code": 502,
        "label-status": "HTTP 502: Lỗi gateway",
        "title": "Lỗi kết nối với máy chủ",
        "message": "Hệ thống đang gặp sự cố khi kết nối với máy chủ. Vui lòng thử lại sau."
    },
    {
        "code": 503,
        "label-status": "HTTP 503: Dịch vụ không khả dụng",
        "title": "Dịch vụ không khả dụng",
        "message": "Hệ thống đang bảo trì hoặc không khả dụng. Vui lòng thử lại sau."
    },
    {
        "code": 504,
        "label-status": "HTTP 504: Hết thời gian chờ gateway",
        "title": "Hết thời gian chờ",
        "message": "Hệ thống đang gặp sự cố khi chờ phản hồi từ máy chủ. Vui lòng thử lại sau."
    },
]