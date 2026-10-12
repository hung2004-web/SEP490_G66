using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class HomeServiceResponse
    {
        public int Id { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal ReferencePrice { get; set; }
        public int? EstimatedMinutes { get; set; }
    }
}
