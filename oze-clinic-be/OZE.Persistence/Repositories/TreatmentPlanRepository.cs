using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
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
                .Include(x => x.Patient)
                .Include(x => x.CreatedByDoctor)
                .Include(x => x.Stages)
                    .ThenInclude(s => s.Service)
                .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        }

        public async Task<TreatmentPlan?> GetTrackedByIdWithStagesAsync(long id, CancellationToken cancellationToken = default)
        {
            return await _context.TreatmentPlans
                .Include(x => x.Patient)
                .Include(x => x.CreatedByDoctor)
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

        public async Task<bool> PatientExistsAsync(int patientId, CancellationToken cancellationToken = default)
        {
            return await _context.Patients.AnyAsync(x => x.Id == patientId, cancellationToken);
        }

        // One query: counts and the next stage are worked out by SQL instead of loading every stage
        public async Task<List<TreatmentPlanSummaryResponse>> GetByPatientAsync(int patientId, bool includeClosed, CancellationToken cancellationToken = default)
        {
            return await _context.TreatmentPlans
                .AsNoTracking()
                .Where(x => x.PatientId == patientId
                    && (includeClosed || TreatmentPlanConstants.OpenStatuses.Contains(x.Status)))
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new TreatmentPlanSummaryResponse
                {
                    Id = x.Id,
                    PlanName = x.PlanName,
                    Status = x.Status,
                    TotalStages = x.Stages.Count(),
                    CompletedStages = x.Stages.Count(s => s.StageStatus == TreatmentPlanConstants.StageStatus.Completed),
                    CancelledStages = x.Stages.Count(s => s.StageStatus == TreatmentPlanConstants.StageStatus.Cancelled),
                    EstimatedTotalCost = x.EstimatedTotalCost,
                    NextStageName = x.Stages
                        .Where(s => s.StageStatus == TreatmentPlanConstants.StageStatus.InProgress
                            || s.StageStatus == TreatmentPlanConstants.StageStatus.Scheduled)
                        .OrderBy(s => s.StageNumber)
                        .Select(s => s.StageName)
                        .FirstOrDefault(),
                    NextStageScheduledDate = x.Stages
                        .Where(s => s.StageStatus == TreatmentPlanConstants.StageStatus.InProgress
                            || s.StageStatus == TreatmentPlanConstants.StageStatus.Scheduled)
                        .OrderBy(s => s.StageNumber)
                        .Select(s => s.ScheduledDate)
                        .FirstOrDefault(),
                    CreatedByDoctorName = x.CreatedByDoctor.FullName,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        // Billed on the plan itself or on one of its stages
        public async Task<bool> IsInvoicedAsync(long treatmentPlanId, CancellationToken cancellationToken = default)
        {
            return await _context.Invoices.AnyAsync(x => x.TreatmentPlanId == treatmentPlanId, cancellationToken)
                || await _context.InvoiceItems.AnyAsync(x => x.TreatmentPlanStage != null
                    && x.TreatmentPlanStage.TreatmentPlanId == treatmentPlanId, cancellationToken);
        }

        // Stages go with the plan (cascade)
        public void Remove(TreatmentPlan plan)
        {
            _context.TreatmentPlans.Remove(plan);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
