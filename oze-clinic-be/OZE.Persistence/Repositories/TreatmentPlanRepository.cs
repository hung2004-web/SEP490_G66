using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
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

        public async Task<TreatmentPlan?> GetTrackedByIdWithStagesAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.TreatmentPlans
                .Include(x => x.Stages)
                    .ThenInclude(s => s.Service)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        // Tracked: the caller touches the examination so its row version guards against a concurrent "complete"
        public async Task<Examination?> GetExaminationAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return await _context.Examinations.FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public async Task<bool> HasOpenPlanAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            return await _context.TreatmentPlans.AnyAsync(x => x.ExaminationId == examinationId
                && TreatmentPlanConstants.OpenStatuses.Contains(x.Status), cancellationToken);
        }

        public async Task AddAsync(TreatmentPlan plan, CancellationToken cancellationToken = default)
        {
            await _context.TreatmentPlans.AddAsync(plan, cancellationToken);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
