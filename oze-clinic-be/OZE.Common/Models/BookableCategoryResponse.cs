namespace OZE.Common.Models
{
    public class BookableCategoryResponse
    {
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        // true: the screen shows checkboxes; false: radio buttons (one service only)
        public bool AllowMultipleSelection { get; set; }
        public List<BookableServiceResponse> Services { get; set; } = new();
    }
}
