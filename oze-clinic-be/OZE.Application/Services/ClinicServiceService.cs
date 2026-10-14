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
            var pagedServices = await _serviceRepository.GetAllAsync(parameters, cancellationToken);
            var dtos = _mapper.Map<List<ServiceDto>>(pagedServices.Items);

            var result = new PagedResult<ServiceDto>(
                dtos,
                pagedServices.TotalCount,
                pagedServices.PageNumber,
                pagedServices.PageSize);

            return ApiResponse<PagedResult<ServiceDto>>.SuccessResult(result);
        }

        public async Task<ApiResponse<IReadOnlyList<ServiceDto>>> GetActiveServicesAsync(
            CancellationToken cancellationToken = default)
        {
            var services = await _serviceRepository.GetActiveServicesAsync(cancellationToken);
            var dtos = _mapper.Map<List<ServiceDto>>(services);

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
    }
}
