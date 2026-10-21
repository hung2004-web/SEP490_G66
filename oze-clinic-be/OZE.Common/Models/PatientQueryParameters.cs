namespace OZE.Common.Models
{
    public class PatientQueryParameters
    {
        public string? SearchKeyword { get; set; }
        public string? Gender { get; set; }
        public string? BloodType { get; set; }
        public string? SortBy { get; set; } // "name", "code", "createdat", "dob"
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
