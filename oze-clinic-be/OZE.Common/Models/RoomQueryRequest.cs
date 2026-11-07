namespace OZE.Common.Models
{
    // Filters for the room list; empty values are ignored
    public class RoomQueryRequest
    {
        public string? Keyword { get; set; }
        public string? RoomType { get; set; }
        public string? Status { get; set; }
    }
}
