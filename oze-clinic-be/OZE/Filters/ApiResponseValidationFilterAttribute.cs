using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using OZE.Common.Constants;
using OZE.Common.Models.Base;

namespace OZE.ProjectBase.Filters
{
    // Returns model validation errors as ApiResponse instead of the default ValidationProblemDetails.
    // Order must stay below -2000 so it runs before the ModelStateInvalidFilter added by [ApiController].
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class ApiResponseValidationFilterAttribute : Attribute, IActionFilter, IOrderedFilter
    {
        public int Order => -3000;

        public void OnActionExecuting(ActionExecutingContext context)
        {
            if (context.ModelState.IsValid)
            {
                return;
            }

            // A body that cannot be read also adds "The <parameter> field is required." under the parameter name.
            var parameterNames = context.ActionDescriptor.Parameters
                .Select(p => p.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var messages = new List<string>();
            foreach (var (key, entry) in context.ModelState)
            {
                if (parameterNames.Contains(key))
                {
                    continue;
                }

                foreach (var error in entry.Errors)
                {
                    // Keys starting with "$" come from JSON conversion errors, e.g. "$.dateOfBirth".
                    var message = key.StartsWith('$')
                        ? string.Format(ErrorConstants.AuthMessage.InvalidData, ToFieldName(key))
                        : error.ErrorMessage;
                    if (!messages.Contains(message))
                    {
                        messages.Add(message);
                    }
                }
            }

            if (messages.Count == 0)
            {
                messages.Add(string.Format(ErrorConstants.AuthMessage.InvalidData, "Request body"));
            }

            context.Result = new BadRequestObjectResult(ApiResponse.FailureResult(messages[0], messages));
        }

        public void OnActionExecuted(ActionExecutedContext context)
        {
        }

        private static string ToFieldName(string key)
        {
            var name = key.TrimStart('$', '.');
            if (string.IsNullOrEmpty(name))
            {
                return "Request body";
            }

            var words = Regex.Replace(name, "(?<!^)([A-Z])", " $1").ToLowerInvariant();
            return char.ToUpperInvariant(words[0]) + words[1..];
        }
    }
}
