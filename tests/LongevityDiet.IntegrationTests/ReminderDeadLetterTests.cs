using LongevityDiet.Worker.Reminders;
using StackExchange.Redis;

namespace LongevityDiet.IntegrationTests;

public sealed class ReminderDeadLetterTests
{
    [Fact]
    public void UnknownEvent_ContainsTraceableNonSensitiveFields()
    {
        var entries = ReminderDeadLetterEntry.Create(
            "ldc:identity-events", (RedisValue)"12345-0",
            "UnexpectedEvent.v8", "UnsupportedEventType");

        var values = entries.ToDictionary(
            item => item.Name.ToString(),
            item => item.Value.ToString());

        Assert.Equal(4, values.Count);
        Assert.Equal("ldc:identity-events", values["source"]);
        Assert.Equal("12345-0", values["entryId"]);
        Assert.Equal("UnexpectedEvent.v8", values["eventType"]);
        Assert.Equal("UnsupportedEventType", values["reason"]);
        Assert.DoesNotContain("payload", values.Keys);
        Assert.DoesNotContain("token", values.Keys);
    }

    [Fact]
    public void UntrustedEventType_IsBounded_AndReasonIsPreserved()
    {
        var entries = ReminderDeadLetterEntry.Create(
            "ldc:identity-events", (RedisValue)"12346-0",
            new string('X', 400), "MalformedEvent");
        var values = entries.ToDictionary(
            item => item.Name.ToString(),
            item => item.Value.ToString());

        Assert.Equal(128, values["eventType"].Length);
        Assert.Equal("MalformedEvent", values["reason"]);
    }
}
