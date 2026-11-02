namespace OZE.Application.Interfaces
{
    // Patients who were called and were not there
    public interface IAbsentPatientService
    {
        // Once the morning has ended, every patient who was skipped for being absent and is still waiting is marked NO_SHOW.
        // Returns how many appointments were marked.
        Task<int> MarkNoShowAfterMorningAsync(CancellationToken cancellationToken = default);
    }
}
