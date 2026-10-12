using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class HomeDoctorResponse
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Specialization { get; set; }
    }
}
