using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class TreatmentPlanRepository : ITreatmentPlanRepository
    {
        private readonly AppIdentityDbContext _context;

        public TreatmentPlanRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<TreatmentPlan?> GetByIdWithStagesAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.TreatmentPlans
                .AsNoTracking()
                .Include(x => x.Stages)
                    .ThenInclude(s => s.Service)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }
    }
}
