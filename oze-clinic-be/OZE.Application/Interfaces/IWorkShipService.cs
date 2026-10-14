using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public interface IWorkShipService
    {
        Task<WorkShipResponse> CreateWorkShipAsync(CreateWorkShiftRequest request);
        Task<List<WorkShipResponse>> GetWorkShiftsAsync(WorkShiftQueryRequest query);
        Task<WorkShipResponse> GetWorkShiftByIdAsync(long id);
    }
}
