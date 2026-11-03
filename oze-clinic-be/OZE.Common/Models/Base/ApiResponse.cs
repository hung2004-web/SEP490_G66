namespace OZE.Common.Models.Base
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string>? Errors { get; set; }
        /// <summary>Stable machine-readable failure code for clients (e.g. INVALID_CREDENTIALS).</summary>
        public string? Code { get; set; }
        /// <summary>UTC instant when a temporary lockout ends; set with LOCKED_OUT.</summary>
        public DateTimeOffset? LockoutEnd { get; set; }

        public static ApiResponse<T> SuccessResult(T data, string message = "Success")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                Errors = null
            };
        }

        public static ApiResponse<T> FailureResult(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Errors = errors ?? new List<string>()
            };
        }

        public static ApiResponse<T> FailureResult(string message, string error)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Errors = new List<string> { error }
            };
        }

        public static ApiResponse<T> FailureWithCode(string message, string code, DateTimeOffset? lockoutEnd = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Data = default,
                Code = code,
                LockoutEnd = lockoutEnd,
                Errors = new List<string>()
            };
        }
    }

    public class ApiResponse : ApiResponse<object>
    {
        public static ApiResponse SuccessResult(string message = "Success")
        {
            return new ApiResponse
            {
                Success = true,
                Message = message,
                Data = null,
                Errors = null
            };
        }

        public static new ApiResponse FailureResult(string message, List<string>? errors = null)
        {
            return new ApiResponse
            {
                Success = false,
                Message = message,
                Data = null,
                Errors = errors ?? new List<string>()
            };
        }

        public static new ApiResponse FailureResult(string message, string error)
        {
            return new ApiResponse
            {
                Success = false,
                Message = message,
                Data = null,
                Errors = new List<string> { error }
            };
        }

        public static new ApiResponse FailureWithCode(string message, string code, DateTimeOffset? lockoutEnd = null)
        {
            return new ApiResponse
            {
                Success = false,
                Message = message,
                Data = null,
                Code = code,
                LockoutEnd = lockoutEnd,
                Errors = new List<string>()
            };
        }
    }
}
