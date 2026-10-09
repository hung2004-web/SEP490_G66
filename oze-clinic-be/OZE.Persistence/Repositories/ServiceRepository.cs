using Microsoft.EntityFrameworkCore;
using OZE.Application.Interfaces;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;
using OZE.Persistence.DbContexts;

namespace OZE.Persistence.Repositories
{
    public class ServiceRepository : IServiceRepository
    {
        private readonly AppIdentityDbContext _context;

        public ServiceRepository(AppIdentityDbContext context)
        {
            _context = context;
        }

        public async Task<Service?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.Services.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        }

        public async Task<Service?> GetByCodeAsync(string serviceCode, CancellationToken cancellationToken = default)
        {
            return await _context.Services.FirstOrDefaultAsync(
                s => s.ServiceCode.ToLower() == serviceCode.ToLower(),
                cancellationToken);
        }

        public async Task<bool> ExistsByCodeAsync(string serviceCode, int? excludeId = null, CancellationToken cancellationToken = default)
        {
            var query = _context.Services.AsQueryable();
            if (excludeId.HasValue)
            {
                query = query.Where(s => s.Id != excludeId.Value);
            }

            return await query.AnyAsync(
                s => s.ServiceCode.ToLower() == serviceCode.ToLower(),
                cancellationToken);
        }

        public async Task<PagedResult<Service>> GetAllAsync(ServiceQueryParameters parameters, CancellationToken cancellationToken = default)
        {
            var query = _context.Services.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(parameters.SearchKeyword))
            {
                var keyword = parameters.SearchKeyword.Trim().ToLower();
                query = query.Where(s => s.ServiceName.ToLower().Contains(keyword) || s.ServiceCode.ToLower().Contains(keyword));
            }

            if (parameters.IsActive.HasValue)
            {
                query = query.Where(s => s.IsActive == parameters.IsActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(parameters.RequiredRoomType))
            {
                query = query.Where(s => s.RequiredRoomType == parameters.RequiredRoomType);
            }

            if (parameters.MinPrice.HasValue)
            {
                query = query.Where(s => s.ReferencePrice >= parameters.MinPrice.Value);
            }

            if (parameters.MaxPrice.HasValue)
            {
                query = query.Where(s => s.ReferencePrice <= parameters.MaxPrice.Value);
            }

            query = parameters.SortBy?.ToLower() switch
            {
                "name" => parameters.SortDescending ? query.OrderByDescending(s => s.ServiceName) : query.OrderBy(s => s.ServiceName),
                "code" => parameters.SortDescending ? query.OrderByDescending(s => s.ServiceCode) : query.OrderBy(s => s.ServiceCode),
                "price" => parameters.SortDescending ? query.OrderByDescending(s => s.ReferencePrice) : query.OrderBy(s => s.ReferencePrice),
                "createdat" => parameters.SortDescending ? query.OrderByDescending(s => s.CreatedAt) : query.OrderBy(s => s.CreatedAt),
                _ => parameters.SortDescending ? query.OrderByDescending(s => s.Id) : query.OrderBy(s => s.Id)
            };

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Service>(items, totalCount, parameters.PageNumber, parameters.PageSize);
        }

        public async Task<IReadOnlyList<Service>> GetActiveServicesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Services
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.ServiceName)
                .ToListAsync(cancellationToken);
        }

        public async Task<bool> IsServiceInUseAsync(int serviceId, CancellationToken cancellationToken = default)
        {
            var inInvoice = await _context.InvoiceItems.AnyAsync(i => i.ServiceId == serviceId, cancellationToken);
            if (inInvoice) return true;

            var inTreatment = await _context.TreatmentPlanStages.AnyAsync(t => t.ServiceId == serviceId, cancellationToken);
            return inTreatment;
        }

        public async Task AddAsync(Service service, CancellationToken cancellationToken = default)
        {
            await _context.Services.AddAsync(service, cancellationToken);
        }

        public Task UpdateAsync(Service service, CancellationToken cancellationToken = default)
        {
            _context.Services.Update(service);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(Service service, CancellationToken cancellationToken = default)
        {
            _context.Services.Remove(service);
            return Task.CompletedTask;
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
