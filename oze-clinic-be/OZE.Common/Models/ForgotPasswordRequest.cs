using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Please enter phone number or email")]
        public string Identifier { get; set; } = string.Empty;
    }
}
