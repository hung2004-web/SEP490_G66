using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class UpdateRoomRequest : CreateRoomRequest
    {
        [Required(ErrorMessage ="Room status is required")]
        public string Status { get; set; } = string.Empty;
    }
}
