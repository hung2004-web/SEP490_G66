namespace OZE.Common.Models
{
    public class ServiceQueryParameters
    {
        public string? SearchKeyword { get; set; }
        public bool? IsActive { get; set; }
        public string? RequiredRoomType { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? SortBy { get; set; } // "name", "price", "code", "createdat"
        public bool SortDescending { get; set; } = false;

        private int _pageNumber = 1;
        public int PageNumber
        {
            get => _pageNumber;
            set => _pageNumber = value < 1 ? 1 : value;
        }

        private int _pageSize = 10;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value switch
            {
                < 1 => 10,
                > 100 => 100,
                _ => value
            };
        }
    }
}
