using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class ConsultationRepository : IConsultationRepository
    {
        private readonly AppIdentityDbContext _context;

        public ConsultationRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public Task<bool> HasRecentNewAsync(string phone, DateTimeOffset since, CancellationToken cancellationToken = default) =>
            _context.ConsultationRequests.AnyAsync(x => x.PhoneNumber == phone && x.Status == "New" && x.CreatedAt >= since, cancellationToken);

        public async Task AddAsync(ConsultationRequest request, CancellationToken cancellationToken = default) =>
            await _context.ConsultationRequests.AddAsync(request, cancellationToken);

        public Task<ConsultationRequest?> GetByIdAsync(long id, CancellationToken cancellationToken = default) =>
            _context.ConsultationRequests.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        public async Task<PagedResult<ConsultationRequest>> GetPagedAsync(ConsultationQuery query, CancellationToken cancellationToken = default)
        {
            var requests = _context.ConsultationRequests.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(query.Status))
            {
                requests = requests.Where(x => x.Status == query.Status);
            }

            if (!string.IsNullOrWhiteSpace(query.SearchKeyword))
            {
                var k = query.SearchKeyword.Trim();
                requests = requests.Where(x => x.FullName.Contains(k) || x.PhoneNumber.Contains(k));
            }

            var total = await requests.CountAsync(cancellationToken);
            // New requests first, then the latest
            var items = await requests
                .OrderByDescending(x => x.Status == "New")
                .ThenByDescending(x => x.CreatedAt)
                .Skip((query.PageNumber - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync(cancellationToken);
            return new PagedResult<ConsultationRequest> { Items = items, TotalCount = total, PageNumber = query.PageNumber, PageSize = query.PageSize };
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => _context.SaveChangesAsync(cancellationToken);
    }
}

namespace OZE.Persistence.Configurations
{
    public class ConsultationRequestConfiguration : IEntityTypeConfiguration<ConsultationRequest>
    {
        public void Configure(EntityTypeBuilder<ConsultationRequest> builder)
        {
            builder.ToTable("ConsultationRequests", t =>
                t.HasCheckConstraint("CK_ConsultationRequests_Status", "[Status] IN ('New', 'Contacted', 'Booked', 'Closed')"));
            builder.HasKey(x => x.Id);
            builder.Property(x => x.FullName).HasMaxLength(100).IsRequired();
            builder.Property(x => x.PhoneNumber).HasMaxLength(20).IsRequired();
            builder.Property(x => x.Email).HasMaxLength(256);
            builder.Property(x => x.Note).HasMaxLength(1000);
            builder.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("New");
            builder.Property(x => x.HandleNote).HasMaxLength(500);
            builder.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIMEOFFSET()");

            builder.HasOne<ApplicationUser>()
                   .WithMany()
                   .HasForeignKey(x => x.HandledByUserId)
                   .HasConstraintName("FK_ConsultationRequests_HandledBy")
                   .OnDelete(DeleteBehavior.NoAction);

            builder.HasIndex(x => new { x.Status, x.CreatedAt }).HasDatabaseName("IX_ConsultationRequests_Status_Created");
        }
    }
}
