using OZE.Common.Exceptions;
using OZE.Common.Models.Base;

namespace OZE.Application.Middlewares
{
    public static class ConditionGuard
    {
        /// <summary>
        /// Ensures the condition is true. If false, throws BadRequestException.
        /// </summary>
        public static void Ensure(bool condition, string errorMessage)
        {
            if (!condition)
                throw new BadRequestException(errorMessage);
        }

        /// <summary>
        /// Throws BadRequestException if condition is true.
        /// </summary>
        public static void ThrowIf(bool condition, string errorMessage)
        {
            if (condition)
                throw new BadRequestException(errorMessage);
        }

        public static void Ensure<TException>(bool condition, string errorMessage)
            where TException : Exception
        {
            if (!condition)
            {
                var exception = (TException?)Activator.CreateInstance(typeof(TException), errorMessage);
                if (exception != null)
                {
                    throw exception;
                }
                throw new BadRequestException(errorMessage);
            }
        }

        public static ApiResponse Check(bool condition, string errorMessage)
        {
            return condition
                ? ApiResponse.SuccessResult("Success")
                : ApiResponse.FailureResult(errorMessage);
        }

        public static void DoIfFailed(bool condition, Action onFailed)
        {
            if (!condition)
                onFailed?.Invoke();
        }

        public static void EnsureWithLog(bool condition, string errorMessage, Action<string> logAction)
        {
            if (!condition)
            {
                logAction?.Invoke(errorMessage);
                throw new BadRequestException(errorMessage);
            }
        }
    }
}
