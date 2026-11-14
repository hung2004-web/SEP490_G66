using AutoMapper;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using OZE.Application.Helpers;
using OZE.Application.Interfaces;
using OZE.Application.Services.Caching;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class ClinicServiceService : IClinicServiceService
    {
        private const string ActiveServicesCacheKey = "ClinicServices_ActiveList";

        private readonly IServiceRepository _serviceRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<ClinicServiceService> _logger;
        private readonly IDistributedCache? _cache;

        public ClinicServiceService(
            IServiceRepository serviceRepository,
            IMapper mapper,
            ILogger<ClinicServiceService> logger,
            IDistributedCache? cache = null)
        {
            _serviceRepository = serviceRepository;
            _mapper = mapper;
            _logger = logger;
            _cache = cache;
        }

        public async Task<ApiResponse<PagedResult<ServiceDto>>> GetServicesAsync(
            ServiceQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            var pagedServices = await _serviceRepository.GetAllAsync(parameters, cancellationToken);
            return pagedServices.ToPagedApiResponse<Service, ServiceDto>(_mapper);
        }

        public async Task<ApiResponse<IReadOnlyList<ServiceDto>>> GetActiveServicesAsync(
            CancellationToken cancellationToken = default)
        {
            var cachedDtos = _cache == null ? null : await _cache.GetJsonAsync<List<ServiceDto>>(ActiveServicesCacheKey, cancellationToken);
            if (cachedDtos != null)
            {
                return ApiResponse<IReadOnlyList<ServiceDto>>.SuccessResult(cachedDtos.AsReadOnly());
            }

            var services = await _serviceRepository.GetActiveServicesAsync(cancellationToken);
            var dtos = _mapper.Map<List<ServiceDto>>(services);

            if (_cache != null)
            {
                await _cache.SetJsonAsync(ActiveServicesCacheKey, dtos, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10),
                    SlidingExpiration = TimeSpan.FromMinutes(2)
                }, cancellationToken);
            }

            return ApiResponse<IReadOnlyList<ServiceDto>>.SuccessResult(dtos.AsReadOnly());
        }

        public async Task<ApiResponse<ServiceDto>> GetServiceByIdAsync(
            int id,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(id, asNoTracking: true, cancellationToken);
            if (service == null)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var dto = _mapper.Map<ServiceDto>(service);
            return ApiResponse<ServiceDto>.SuccessResult(dto);
        }

        public async Task<ApiResponse<ServiceDto>> GetServiceByCodeAsync(
            string code,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var service = await _serviceRepository.GetByCodeAsync(code, cancellationToken);
            if (service == null)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var dto = _mapper.Map<ServiceDto>(service);
            return ApiResponse<ServiceDto>.SuccessResult(dto);
        }

        public async Task<ApiResponse<ServiceDto>> CreateServiceAsync(
            CreateServiceRequest request,
            CancellationToken cancellationToken = default)
        {
            if (!RoomTypeConstants.TryNormalize(request.RequiredRoomType, out var normalizedRoomType))
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidRoomType);
            }

            if (request.ReferencePrice < 0)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidPrice);
            }

            if (request.EstimatedMinutes.HasValue && request.EstimatedMinutes.Value <= 0)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidEstimatedMinutes);
            }

            var normalizedCode = request.ServiceCode.Trim().ToUpperInvariant();
            var isCodeInUse = await _serviceRepository.ExistsByCodeAsync(normalizedCode, null, cancellationToken);
            if (isCodeInUse)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceCodeExist);
            }

            var service = _mapper.Map<Service>(request);
            service.ServiceCode = normalizedCode;
            service.ServiceName = request.ServiceName.Trim();
            service.Description = request.Description?.Trim();
            service.RequiredRoomType = normalizedRoomType;
            service.CreatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.AddAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            InvalidateActiveServicesCache();

            _logger.LogInformation("New clinic service created: {ServiceName} (Code: {ServiceCode})", service.ServiceName, service.ServiceCode);

            var dto = _mapper.Map<ServiceDto>(service);
            return ApiResponse<ServiceDto>.SuccessResult(dto, "Service created successfully");
        }

        public async Task<ApiResponse<ServiceDto>> UpdateServiceAsync(
            int id,
            UpdateServiceRequest request,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(id, cancellationToken);
            if (service == null)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            if (!RoomTypeConstants.TryNormalize(request.RequiredRoomType, out var normalizedRoomType))
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidRoomType);
            }

            if (request.ReferencePrice < 0)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidPrice);
            }

            if (request.EstimatedMinutes.HasValue && request.EstimatedMinutes.Value <= 0)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.InvalidEstimatedMinutes);
            }

            var normalizedCode = request.ServiceCode.Trim().ToUpperInvariant();
            var isCodeInUse = await _serviceRepository.ExistsByCodeAsync(normalizedCode, id, cancellationToken);
            if (isCodeInUse)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceCodeExist);
            }

            service.ServiceCode = normalizedCode;
            service.ServiceName = request.ServiceName.Trim();
            service.Description = request.Description?.Trim();
            service.ReferencePrice = request.ReferencePrice;
            service.EstimatedMinutes = request.EstimatedMinutes;
            service.RecallIntervalMonths = request.RecallIntervalMonths;
            service.RequiredRoomType = normalizedRoomType;
            var newIsActive = request.IsActive ?? service.IsActive;
            if (service.IsActive && !newIsActive
                && await _serviceRepository.HasOpenAppointmentsAsync(service.Id, DateOnly.FromDateTime(ClinicClock.Today), cancellationToken))
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.HasOpenAppointments);
            }
            service.IsActive = newIsActive;
            service.UpdatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.UpdateAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            InvalidateActiveServicesCache();

            _logger.LogInformation("Clinic service {ServiceId} updated: {ServiceName} (Code: {ServiceCode})", id, service.ServiceName, service.ServiceCode);

            var dto = _mapper.Map<ServiceDto>(service);
            return ApiResponse<ServiceDto>.SuccessResult(dto, "Service updated successfully");
        }

        public async Task<ApiResponse<ServiceDto>> ToggleServiceStatusAsync(
            int id,
            bool isActive,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(id, cancellationToken);
            if (service == null)
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            if (service.IsActive == isActive)
            {
                var unchangedDto = _mapper.Map<ServiceDto>(service);
                var unchangedStatusText = isActive ? "activated" : "deactivated";
                return ApiResponse<ServiceDto>.SuccessResult(unchangedDto, $"Service {unchangedStatusText} successfully");
            }

            // Turning it off while unfinished appointments still use it would leave them on a service nobody can book or see
            if (!isActive && await _serviceRepository.HasOpenAppointmentsAsync(service.Id, DateOnly.FromDateTime(ClinicClock.Today), cancellationToken))
            {
                return ApiResponse<ServiceDto>.FailureResult(ErrorConstants.ServiceMessage.HasOpenAppointments);
            }

            service.IsActive = isActive;
            service.UpdatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.UpdateAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            InvalidateActiveServicesCache();

            _logger.LogInformation("Clinic service {ServiceId} ({ServiceName}) status toggled to {IsActive}.", id, service.ServiceName, isActive);

            var dto = _mapper.Map<ServiceDto>(service);
            var statusText = isActive ? "activated" : "deactivated";
            return ApiResponse<ServiceDto>.SuccessResult(dto, $"Service {statusText} successfully");
        }

        public async Task<ApiResponse<bool>> DeleteServiceAsync(
            int id,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(id, cancellationToken);
            if (service == null)
            {
                return ApiResponse<bool>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var isInUse = await _serviceRepository.IsServiceInUseAsync(id, cancellationToken);
            if (isInUse)
            {
                _logger.LogWarning("Service {ServiceId} ({ServiceName}) is in use and cannot be hard-deleted.", id, service.ServiceName);
                return ApiResponse<bool>.FailureResult(ErrorConstants.ServiceMessage.ServiceInUse);
            }

            await _serviceRepository.DeleteAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            InvalidateActiveServicesCache();

            _logger.LogInformation("Clinic service {ServiceId} ({ServiceName}) deleted successfully.", id, service.ServiceName);

            return ApiResponse<bool>.SuccessResult(true, "Service deleted successfully");
        }

        public async Task<ApiResponse<IReadOnlyList<ServiceVariantDto>>> GetVariantsAsync(
            int serviceId,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(serviceId, asNoTracking: true, cancellationToken);
            if (service == null)
            {
                return ApiResponse<IReadOnlyList<ServiceVariantDto>>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var variants = await _serviceRepository.GetVariantsByServiceIdAsync(serviceId, cancellationToken);
            var dtos = _mapper.Map<List<ServiceVariantDto>>(variants);
            return ApiResponse<IReadOnlyList<ServiceVariantDto>>.SuccessResult(dtos.AsReadOnly());
        }

        public async Task<ApiResponse<ServiceVariantDto>> CreateVariantAsync(
            int serviceId,
            SaveServiceVariantRequest request,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(serviceId, asNoTracking: true, cancellationToken);
            if (service == null)
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceMessage.ServiceNotFound);
            }

            var error = ValidateVariant(request);
            if (error != null)
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(error);
            }

            var normalizedCode = request.VariantCode.Trim().ToUpperInvariant();
            if (await _serviceRepository.VariantCodeExistsAsync(normalizedCode, null, cancellationToken))
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantCodeExist);
            }

            var variant = new ServiceVariant
            {
                ServiceId = serviceId,
                VariantCode = normalizedCode,
                VariantName = request.VariantName.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                ReferencePrice = request.ReferencePrice,
                EstimatedMinutes = request.EstimatedMinutes,
                DisplayOrder = request.DisplayOrder,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _serviceRepository.AddVariantAsync(variant, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Variant {VariantCode} created for service {ServiceId}", variant.VariantCode, serviceId);

            return ApiResponse<ServiceVariantDto>.SuccessResult(_mapper.Map<ServiceVariantDto>(variant), "Variant created successfully");
        }

        public async Task<ApiResponse<ServiceVariantDto>> UpdateVariantAsync(
            int serviceId,
            int variantId,
            SaveServiceVariantRequest request,
            CancellationToken cancellationToken = default)
        {
            var variant = await _serviceRepository.GetVariantByIdAsync(serviceId, variantId, cancellationToken);
            if (variant == null)
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantNotFound);
            }

            var error = ValidateVariant(request);
            if (error != null)
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(error);
            }

            var normalizedCode = request.VariantCode.Trim().ToUpperInvariant();
            if (await _serviceRepository.VariantCodeExistsAsync(normalizedCode, variantId, cancellationToken))
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantCodeExist);
            }

            var newIsActive = request.IsActive ?? variant.IsActive;
            if (variant.IsActive && !newIsActive
                && await _serviceRepository.VariantHasOpenAppointmentsAsync(variantId, DateOnly.FromDateTime(ClinicClock.Today), cancellationToken))
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.HasOpenAppointments);
            }

            // Booked appointments keep the price and duration they were booked with, so changing them here is safe
            variant.VariantCode = normalizedCode;
            variant.VariantName = request.VariantName.Trim();
            variant.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            variant.ReferencePrice = request.ReferencePrice;
            variant.EstimatedMinutes = request.EstimatedMinutes;
            variant.DisplayOrder = request.DisplayOrder;
            variant.IsActive = newIsActive;
            variant.UpdatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Variant {VariantId} of service {ServiceId} updated", variantId, serviceId);

            return ApiResponse<ServiceVariantDto>.SuccessResult(_mapper.Map<ServiceVariantDto>(variant), "Variant updated successfully");
        }

        public async Task<ApiResponse<ServiceVariantDto>> ToggleVariantStatusAsync(
            int serviceId,
            int variantId,
            bool isActive,
            CancellationToken cancellationToken = default)
        {
            var variant = await _serviceRepository.GetVariantByIdAsync(serviceId, variantId, cancellationToken);
            if (variant == null)
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantNotFound);
            }

            var statusText = isActive ? "activated" : "deactivated";
            if (variant.IsActive == isActive)
            {
                return ApiResponse<ServiceVariantDto>.SuccessResult(_mapper.Map<ServiceVariantDto>(variant), $"Variant {statusText} successfully");
            }

            // Same rule as the service: unfinished appointments must not point at a variant nobody can book
            if (!isActive && await _serviceRepository.VariantHasOpenAppointmentsAsync(variantId, DateOnly.FromDateTime(ClinicClock.Today), cancellationToken))
            {
                return ApiResponse<ServiceVariantDto>.FailureResult(ErrorConstants.ServiceVariantMessage.HasOpenAppointments);
            }

            variant.IsActive = isActive;
            variant.UpdatedAt = DateTimeOffset.UtcNow;
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Variant {VariantId} of service {ServiceId} status toggled to {IsActive}", variantId, serviceId, isActive);

            return ApiResponse<ServiceVariantDto>.SuccessResult(_mapper.Map<ServiceVariantDto>(variant), $"Variant {statusText} successfully");
        }

        public async Task<ApiResponse<bool>> DeleteVariantAsync(
            int serviceId,
            int variantId,
            CancellationToken cancellationToken = default)
        {
            var variant = await _serviceRepository.GetVariantByIdAsync(serviceId, variantId, cancellationToken);
            if (variant == null)
            {
                return ApiResponse<bool>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantNotFound);
            }

            // A variant that was ever booked stays for history; the manager turns it off instead
            if (await _serviceRepository.IsVariantInUseAsync(variantId, cancellationToken))
            {
                return ApiResponse<bool>.FailureResult(ErrorConstants.ServiceVariantMessage.VariantInUse);
            }

            await _serviceRepository.DeleteVariantAsync(variant, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Variant {VariantId} of service {ServiceId} deleted", variantId, serviceId);

            return ApiResponse<bool>.SuccessResult(true, "Variant deleted successfully");
        }

        private static string? ValidateVariant(SaveServiceVariantRequest request)
        {
            if (request.ReferencePrice < 0)
            {
                return ErrorConstants.ServiceVariantMessage.InvalidPrice;
            }

            if (request.EstimatedMinutes.HasValue && request.EstimatedMinutes.Value <= 0)
            {
                return ErrorConstants.ServiceVariantMessage.InvalidEstimatedMinutes;
            }

            if (request.DisplayOrder < 0)
            {
                return ErrorConstants.ServiceVariantMessage.InvalidDisplayOrder;
            }

            return null;
        }

        private void InvalidateActiveServicesCache()
        {
            _cache?.Remove(ActiveServicesCacheKey);
        }
    }
}
