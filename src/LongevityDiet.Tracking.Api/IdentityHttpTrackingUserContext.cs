using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using LongevityDiet.Tracking;

namespace LongevityDiet.Tracking.Api;

// A caller's already-validated Bearer token is forwarded only to the
// fixed, configured Identity service. No cross-owner SQL reads or service key.
public sealed record IdentityTrackingProfile(string TimeZone, TimeOnly? WakeTime,
    TimeOnly? SleepTime, int PreferredMealFrequency);

public sealed class IdentityHttpTrackingUserContext(
    IHttpClientFactory factory,
    IHttpContextAccessor accessor) : ITrackingUserContext
{
    public async Task<string?> GetActiveUserTimeZoneAsync(
        Guid userId, CancellationToken cancellationToken) =>
        (await GetProfileAsync(userId, cancellationToken))?.TimeZone;

    public async Task<IdentityTrackingProfile?> GetProfileAsync(
        Guid userId, CancellationToken cancellationToken)
    {
        var http = accessor.HttpContext;
        if (http?.User?.Identity?.IsAuthenticated != true ||
            !Guid.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actor) ||
            actor != userId) return null;

        var header = http.Request.Headers.Authorization.ToString();
        if (!AuthenticationHeaderValue.TryParse(header, out var auth) ||
            !string.Equals(auth.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(auth.Parameter))
            return null;
        var client = factory.CreateClient("identity");
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/profile");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Parameter);
        try
        {
            using var reply = await client.SendAsync(
                request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (reply.StatusCode is System.Net.HttpStatusCode.NotFound or
                System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                return null;
            if (!reply.IsSuccessStatusCode)
                throw new TrackingInputException("identity_unavailable",
                    "Identity could not verify the active account.");
            await using var stream = await reply.Content.ReadAsStreamAsync(cancellationToken);
            using var payload = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = payload.RootElement;
            if (!root.TryGetProperty("userId", out var owner) ||
                !Guid.TryParse(owner.GetString(), out var activeUserId) ||
                activeUserId != userId ||
                !root.TryGetProperty("timeZone", out var zone))
                throw new TrackingInputException("identity_contract_invalid",
                    "Identity returned an invalid profile response.");
            var value = zone.GetString();
            if (string.IsNullOrWhiteSpace(value) || value.Length > 100)
                throw new TrackingInputException("identity_contract_invalid",
                    "Identity did not return a valid time zone.");
            var frequency = root.TryGetProperty("preferredMealFrequency", out var count)
                && count.TryGetInt32(out var mealCount) ? mealCount : 3;
            if (frequency is < 2 or > 4)
                throw new TrackingInputException("identity_contract_invalid",
                    "Identity returned an invalid meal frequency.");
            static TimeOnly? ReadTime(JsonElement data, string name)
            {
                if (!data.TryGetProperty(name, out var item) ||
                    item.ValueKind == JsonValueKind.Null) return null;
                return TimeOnly.TryParse(item.GetString(), out var time) ? time : null;
            }
            return new IdentityTrackingProfile(value, ReadTime(root, "wakeTime"),
                ReadTime(root, "sleepTime"), frequency);
        }
        catch (TrackingInputException) { throw; }
        catch (HttpRequestException)
        {
            throw new TrackingInputException("identity_unavailable",
                "Identity could not be reached for account verification.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TrackingInputException("identity_unavailable",
                "Identity account verification timed out.");
        }
        catch (JsonException)
        {
            throw new TrackingInputException("identity_contract_invalid",
                "Identity returned malformed profile information.");
        }
    }
}
