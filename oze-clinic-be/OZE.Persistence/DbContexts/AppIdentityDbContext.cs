using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;
using OZE.Domain.Entities;
using OZE.Persistence.Configurations;

namespace OZE.Persistence.DbContexts
{
    public class AppIdentityDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options) : base(options)
        {
        }

        // Identity & Auth
        public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();

        // Staff & Patient
        public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();
        public DbSet<Patient> Patients => Set<Patient>();
        public DbSet<PatientMedicalProfile> PatientMedicalProfiles => Set<PatientMedicalProfile>();
        public DbSet<PatientDocument> PatientDocuments => Set<PatientDocument>();

        // Schedule
        public DbSet<StaffSchedule> StaffSchedules => Set<StaffSchedule>();

        // Configuration
        public DbSet<Room> Rooms => Set<Room>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<SystemConfiguration> SystemConfigurations => Set<SystemConfiguration>();

        // Patient Journey
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<QueueEntry> QueueEntries => Set<QueueEntry>();

        // Clinical / EMR
        public DbSet<Examination> Examinations => Set<Examination>();
        public DbSet<DentalChartEntry> DentalChartEntries => Set<DentalChartEntry>();
        public DbSet<ClinicalDiagnosis> ClinicalDiagnoses => Set<ClinicalDiagnosis>();
        public DbSet<ImagingRequest> ImagingRequests => Set<ImagingRequest>();
        public DbSet<ImagingResult> ImagingResults => Set<ImagingResult>();
        public DbSet<TreatmentPlan> TreatmentPlans => Set<TreatmentPlan>();
        public DbSet<TreatmentPlanStage> TreatmentPlanStages => Set<TreatmentPlanStage>();
        public DbSet<ClinicalRecordAddendum> ClinicalRecordAddenda => Set<ClinicalRecordAddendum>();

        // Prescriptions
        public DbSet<Prescription> Prescriptions => Set<Prescription>();
        public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();

        // Billing & Finance
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<RefundAdjustmentRequest> RefundAdjustmentRequests => Set<RefundAdjustmentRequest>();

        // Communication & Audit
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            // Indexes are declared explicitly in the entity configurations to match the database design.
            configurationBuilder.Conventions.Remove(typeof(ForeignKeyIndexConvention));
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            IdentityConfiguration.Configure(builder);
            builder.ApplyConfigurationsFromAssembly(typeof(AppIdentityDbContext).Assembly);
        }
    }
}
