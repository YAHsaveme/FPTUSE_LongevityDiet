using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace LongevityDiet.Recommendation.Grpc.Ownership;

/// <summary>
/// Identity is the sole source of active-account state. Recommendation uses the
/// authorized profile API and never sees Users SQL or another owner's DB.
/// </summary>
public sealed class RecommendationActorVerifier(
    IHttpContextAccessor accessor, IHttpClientFactory clients)
{
    public async Task<Guid> VerifyAsync(CancellationToken ct)
    {
        var http = accessor.HttpContext ??
            throw new RecommendationOwnerException(StatusCodes.Status401Unauthorized,
                "missing_request_context");
        if (!Guid.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ||
            userId == Guid.Empty)
            throw new RecommendationOwnerException(StatusCodes.Status401Unauthorized,
                "invalid_actor");
        var bearer = http.Request.Headers.Authorization.ToString();
        if (!AuthenticationHeaderValue.TryParse(bearer, out var auth) ||
            !string.Equals(auth.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(auth.Parameter))
            throw new RecommendationOwnerException(StatusCodes.Status401Unauthorized,
                "missing_bearer");
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/profile");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth.Parameter);
        try
        {
            using var response = await clients.CreateClient("identity")
                .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            if (response.StatusCode is HttpStatusCode.NotFound or
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new RecommendationOwnerException(StatusCodes.Status403Forbidden,
                    "inactive_identity");
            if (!response.IsSuccessStatusCode)
                throw new RecommendationOwnerException(StatusCodes.Status503ServiceUnavailable,
                    "identity_unavailable");
            await using var body = await response.Content.ReadAsStreamAsync(ct);
            using var profile = await System.Text.Json.JsonDocument.ParseAsync(body, cancellationToken: ct);
            if (!profile.RootElement.TryGetProperty("userId", out var id) ||
                !Guid.TryParse(id.GetString(), out var actual) || actual != userId)
                throw new RecommendationOwnerException(StatusCodes.Status502BadGateway,
                    "identity_contract_invalid");
            return userId;
        }
        catch (RecommendationOwnerException) { throw; }
        catch (HttpRequestException)
        {
            throw new RecommendationOwnerException(StatusCodes.Status503ServiceUnavailable,
                "identity_unavailable");
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new RecommendationOwnerException(StatusCodes.Status503ServiceUnavailable,
                "identity_timeout");
        }
        catch (System.Text.Json.JsonException)
        {
            throw new RecommendationOwnerException(StatusCodes.Status502BadGateway,
                "identity_contract_invalid");
        }
    }
}

public sealed class RecommendationOwnerException(int httpStatus, string code) : Exception(code)
{
    public int HttpStatus { get; } = httpStatus;
    public string Code { get; } = code;
}
