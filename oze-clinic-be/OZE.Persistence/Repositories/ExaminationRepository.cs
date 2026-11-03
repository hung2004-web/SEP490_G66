using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class ExaminationRepository : IExaminationRepository
    {
        private readonly AppIdentityDbContext _context;

        public ExaminationRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<Examination?> GetForWorkAsync(long examinationId, CancellationToken cancellationToken = default)
        {
            // Not AsNoTracking: the caller changes the examination and its children, then saves once
            // Split: one query per collection, instead of one row for every combination of services, diagnoses, teeth and medications
            return _context.Examinations
                .AsSplitQuery()
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.ServiceItems)
                        .ThenInclude(x => x.Service)
                .Include(x => x.Appointment)
                    .ThenInclude(x => x.ServiceItems)
                        .ThenInclude(x => x.Variant)
                .Include(x => x.Diagnoses)
                .Include(x => x.DentalChartEntries)
                .Include(x => x.Prescriptions)
                    .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == examinationId, cancellationToken);
        }

        public Task<List<DentalChartEntry>> GetEarlierChartEntriesAsync(int patientId, DateTimeOffset before, long excludeExaminationId, CancellationToken cancellationToken = default)
        {
            return _context.DentalChartEntries
                .AsNoTracking()
                .Where(x => x.PatientId == patientId && x.ExaminationId != excludeExaminationId && x.Examination.CreatedAt < before)
                .ToListAsync(cancellationToken);
        }

        public void RemoveChartEntry(DentalChartEntry entry)
        {
            _context.DentalChartEntries.Remove(entry);
        }

        public Task<Service?> GetServiceAsync(int serviceId, CancellationToken cancellationToken = default)
        {
            return _context.Services.FirstOrDefaultAsync(x => x.Id == serviceId, cancellationToken);
        }

        public Task<ServiceVariant?> GetVariantAsync(int variantId, CancellationToken cancellationToken = default)
        {
            return _context.ServiceVariants.FirstOrDefaultAsync(x => x.Id == variantId, cancellationToken);
        }

        public async Task<string?> GetConfigValueAsync(string configKey)
        {
            return await _context.SystemConfigurations
                .AsNoTracking()
                .Where(x => x.ConfigKey == configKey)
                .Select(x => x.ConfigValue)
                .FirstOrDefaultAsync();
        }

        public void RemoveServiceItem(AppointmentServiceItem item)
        {
            _context.AppointmentServiceItems.Remove(item);
        }

        public void RemovePrescription(Prescription prescription)
        {
            _context.Prescriptions.Remove(prescription);
        }

        public void RemovePrescriptionItem(PrescriptionItem item)
        {
            _context.PrescriptionItems.Remove(item);
        }

        public void RemoveDiagnosis(ClinicalDiagnosis diagnosis)
        {
            _context.ClinicalDiagnoses.Remove(diagnosis);
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return _context.SaveChangesAsync(cancellationToken);
        }
    }
}
