using AutoMapper;
using Microsoft.Extensions.Logging;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;
using OZE.Domain.Entities;

namespace OZE.Application.Services
{
    public class ClinicServiceService : IClinicServiceService
    {
        private readonly IServiceRepository _serviceRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<ClinicServiceService> _logger;

        public ClinicServiceService(
            IServiceRepository serviceRepository,
            IMapper mapper,
            ILogger<ClinicServiceService> logger)
        {
            _serviceRepository = serviceRepository;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<ApiResponse<PagedResult<ServiceDto>>> GetServicesAsync(
            ServiceQueryParameters parameters,
            CancellationToken cancellationToken = default)
        {
            var pagedEntities = await _serviceRepository.GetAllAsync(parameters, cancellationToken);
            var dtos = _mapper.Map<IReadOnlyList<ServiceDto>>(pagedEntities.Items);

            var result = new PagedResult<ServiceDto>(
                dtos,
                pagedEntities.TotalCount,
                pagedEntities.PageNumber,
                pagedEntities.PageSize);

            return ApiResponse<PagedResult<ServiceDto>>.SuccessResult(result);
        }

        public async Task<ApiResponse<IReadOnlyList<ServiceDto>>> GetActiveServicesAsync(
            CancellationToken cancellationToken = default)
        {
            var activeServices = await _serviceRepository.GetActiveServicesAsync(cancellationToken);
            var dtos = _mapper.Map<IReadOnlyList<ServiceDto>>(activeServices);

            return ApiResponse<IReadOnlyList<ServiceDto>>.SuccessResult(dtos);
        }

        public async Task<ApiResponse<ServiceDto>> GetServiceByIdAsync(
            int id,
            CancellationToken cancellationToken = default)
        {
            var service = await _serviceRepository.GetByIdAsync(id, cancellationToken);
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

            var service = await _serviceRepository.GetByCodeAsync(code.Trim(), cancellationToken);
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
            if (!RoomTypeConstants.IsValid(request.RequiredRoomType))
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
            service.RequiredRoomType = string.IsNullOrWhiteSpace(request.RequiredRoomType) ? null : request.RequiredRoomType.Trim();
            service.CreatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.AddAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

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

            if (!RoomTypeConstants.IsValid(request.RequiredRoomType))
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
            service.RequiredRoomType = string.IsNullOrWhiteSpace(request.RequiredRoomType) ? null : request.RequiredRoomType.Trim();
            service.IsActive = request.IsActive;
            service.UpdatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.UpdateAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Clinic service {ServiceId} updated: {ServiceName} (Code: {ServiceCode})", id, service.ServiceName, service.ServiceCode);

            var dto = _mapper.Map<ServiceDto>(service);
            return ApiResponse<ServiceDto>.SuccessResult(dto, "Service updated successfully");
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

            _logger.LogInformation("Clinic service {ServiceId} ({ServiceName}) deleted successfully.", id, service.ServiceName);

            return ApiResponse<bool>.SuccessResult(true, "Service deleted successfully");
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

            service.IsActive = isActive;
            service.UpdatedAt = DateTimeOffset.UtcNow;

            await _serviceRepository.UpdateAsync(service, cancellationToken);
            await _serviceRepository.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Clinic service {ServiceId} ({ServiceName}) status toggled to {IsActive}.", id, service.ServiceName, isActive);

            var dto = _mapper.Map<ServiceDto>(service);
            var statusText = isActive ? "activated" : "deactivated";
            return ApiResponse<ServiceDto>.SuccessResult(dto, $"Service {statusText} successfully");
        }
    }
}
