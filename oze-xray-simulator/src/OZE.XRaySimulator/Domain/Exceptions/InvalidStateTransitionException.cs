namespace OZE.XRaySimulator.Domain.Exceptions;

public sealed class InvalidStateTransitionException : InvalidOperationException
{
    public InvalidStateTransitionException(string message) : base(message)
    {
    }
}
