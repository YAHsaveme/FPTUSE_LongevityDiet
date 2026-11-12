using StackExchange.Redis;

namespace LongevityDiet.Worker.Reminders;

/// <summary>
/// Non-sensitive diagnostic for unrecognized or malformed Redis messages.
/// Raw reminder preference payloads must never be copied into dead-letter data.
/// </summary>
public static class ReminderDeadLetterEntry
{
    public static NameValueEntry[] Create(
        string sourceStream, RedisValue sourceId, string eventType, string reason)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sourceStream);
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);

        var safeType = eventType.Length > 128 ? eventType[..128] : eventType;
        return
        [
            new NameValueEntry("source", sourceStream),
            new NameValueEntry("entryId", sourceId),
            new NameValueEntry("eventType", safeType),
            new NameValueEntry("reason", reason),
        ];
    }
}
