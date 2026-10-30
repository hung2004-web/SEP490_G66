using AutoMapper;
using OZE.Common.Models.Base;

namespace OZE.Application.Helpers
{
    /// <summary>
    /// Extension methods for mapping and projecting PagedResult objects.
    /// </summary>
    public static class PagedResultMappingExtensions
    {
        /// <summary>
        /// Maps items in a PagedResult to a target DTO type using AutoMapper.
        /// </summary>
        public static PagedResult<TDest> ToPagedResult<TSource, TDest>(
            this PagedResult<TSource> source,
            IMapper mapper)
        {
            var dtos = mapper.Map<List<TDest>>(source.Items);
            return new PagedResult<TDest>(
                dtos,
                source.TotalCount,
                source.PageNumber,
                source.PageSize);
        }

        /// <summary>
        /// Maps items in a PagedResult to a target DTO type using a projection function.
        /// </summary>
        public static PagedResult<TDest> ToPagedResult<TSource, TDest>(
            this PagedResult<TSource> source,
            Func<TSource, TDest> mapFunc)
        {
            var dtos = source.Items.Select(mapFunc).ToList();
            return new PagedResult<TDest>(
                dtos,
                source.TotalCount,
                source.PageNumber,
                source.PageSize);
        }

        /// <summary>
        /// Maps items in a PagedResult to a target DTO type using AutoMapper and wraps in an ApiResponse.
        /// </summary>
        public static ApiResponse<PagedResult<TDest>> ToPagedApiResponse<TSource, TDest>(
            this PagedResult<TSource> source,
            IMapper mapper,
            string message = "Success")
        {
            var pagedResult = source.ToPagedResult<TSource, TDest>(mapper);
            return ApiResponse<PagedResult<TDest>>.SuccessResult(pagedResult, message);
        }

        /// <summary>
        /// Maps items in a PagedResult to a target DTO type using a projection function and wraps in an ApiResponse.
        /// </summary>
        public static ApiResponse<PagedResult<TDest>> ToPagedApiResponse<TSource, TDest>(
            this PagedResult<TSource> source,
            Func<TSource, TDest> mapFunc,
            string message = "Success")
        {
            var pagedResult = source.ToPagedResult<TSource, TDest>(mapFunc);
            return ApiResponse<PagedResult<TDest>>.SuccessResult(pagedResult, message);
        }
        /// <summary>
        /// Wraps an existing PagedResult in an ApiResponse without mapping.
        /// </summary>
        public static ApiResponse<PagedResult<T>> ToPagedApiResponse<T>(
            this PagedResult<T> source,
            string message = "Success")
        {
            return ApiResponse<PagedResult<T>>.SuccessResult(source, message);
        }
        public static ApiResponse<PagedResult<T>> TestToPagedApiResponse<T>(
            this PagedResult<T> source,
            string message = "Success")
        {
            return ApiResponse<PagedResult<T>>.SuccessResult(source, message);
        }
    }
}
