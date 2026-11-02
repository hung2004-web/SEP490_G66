namespace OZE.XRaySimulator.Application;

public sealed record FaultConfig
{
    public string? NextCaptureFailureCode { get; set; }
    public string? NextCaptureFailureMessage { get; set; }
    public int WebhookDelayMilliseconds { get; set; } = 0;
    public bool DropWebhooks { get; set; } = false;
}

public interface IFaultInjector
{
    FaultConfig CurrentConfig { get; }
    void InjectNextCaptureFailure(string failureCode, string failureMessage);
    bool TryConsumeNextCaptureFailure(out string? code, out string? message);
    void SetWebhookDelay(int delayMilliseconds);
    void SetDropWebhooks(bool drop);
    void ClearAllFaults();
}

public sealed class FaultInjector : IFaultInjector
{
    private readonly object _syncLock = new();
    private readonly FaultConfig _config = new();

    public FaultConfig CurrentConfig
    {
        get
        {
            lock (_syncLock)
            {
                return new FaultConfig
                {
                    NextCaptureFailureCode = _config.NextCaptureFailureCode,
                    NextCaptureFailureMessage = _config.NextCaptureFailureMessage,
                    WebhookDelayMilliseconds = _config.WebhookDelayMilliseconds,
                    DropWebhooks = _config.DropWebhooks
                };
            }
        }
    }

    public void InjectNextCaptureFailure(string failureCode, string failureMessage)
    {
        lock (_syncLock)
        {
            _config.NextCaptureFailureCode = failureCode;
            _config.NextCaptureFailureMessage = failureMessage;
        }
    }

    public bool TryConsumeNextCaptureFailure(out string? code, out string? message)
    {
        lock (_syncLock)
        {
            if (!string.IsNullOrEmpty(_config.NextCaptureFailureCode))
            {
                code = _config.NextCaptureFailureCode;
                message = _config.NextCaptureFailureMessage;
                _config.NextCaptureFailureCode = null;
                _config.NextCaptureFailureMessage = null;
                return true;
            }

            code = null;
            message = null;
            return false;
        }
    }

    public void SetWebhookDelay(int delayMilliseconds)
    {
        lock (_syncLock)
        {
            _config.WebhookDelayMilliseconds = Math.Max(0, delayMilliseconds);
        }
    }

    public void SetDropWebhooks(bool drop)
    {
        lock (_syncLock)
        {
            _config.DropWebhooks = drop;
        }
    }

    public void ClearAllFaults()
    {
        lock (_syncLock)
        {
            _config.NextCaptureFailureCode = null;
            _config.NextCaptureFailureMessage = null;
            _config.WebhookDelayMilliseconds = 0;
            _config.DropWebhooks = false;
        }
    }
}
