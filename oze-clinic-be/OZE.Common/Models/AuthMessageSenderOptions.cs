namespace OZE.Common.Models
{
    public class AuthMessageSenderOptions
    {
        public string? SendGridKey { get; set; }
        public string SenderEmail { get; set; } = "noreply@oze.com";
        public string SenderName { get; set; } = "OZE Support";
    }
}
