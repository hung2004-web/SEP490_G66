using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Models
{
    public class HomePageResponse
    {
        public List<HomeDoctorResponse> Doctors { get; set; } = new();
        public List<HomeServiceResponse> Services { get; set; } = new();
    }
}
