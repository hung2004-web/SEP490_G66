namespace OZE.Application.Interfaces
{
    public interface ISmsSender
    {
        Task SendSmsAsync(string toPhoneNumber, string message);
    }
}
