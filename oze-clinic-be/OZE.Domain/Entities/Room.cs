namespace OZE.Domain.Entities
{
    public class Room
    {
        public int Id { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public string RoomType { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public string? Floor { get; set; }
        public string? Description { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
