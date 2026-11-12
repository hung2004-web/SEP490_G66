using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Interfaces
{
    public interface IConsultationRepository
    {
        Task<bool> HasRecentNewAsync(string phone, DateTimeOffset since, CancellationToken cancellationToken = default);
        Task AddAsync(ConsultationRequest request, CancellationToken cancellationToken = default);
        Task<ConsultationRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
        Task<PagedResult<ConsultationRequest>> GetPagedAsync(ConsultationQuery query, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
