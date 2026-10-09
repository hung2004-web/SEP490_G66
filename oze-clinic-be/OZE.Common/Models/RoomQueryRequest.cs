using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class RoomQueryRequest
    {
        public string? Keyword { get; set; } = string.Empty;
        public string? RoomType { get; set; } = string.Empty;
        public string? Status { get; set; } = string.Empty;
    }
}
