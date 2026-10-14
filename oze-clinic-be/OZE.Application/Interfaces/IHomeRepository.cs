using OZE.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IHomeRepository
    {
        Task<List<Service>> GetActiveServiceAsync();
        Task<List<StaffProfile>> GetActiveDoctorAsync();
    }
}
