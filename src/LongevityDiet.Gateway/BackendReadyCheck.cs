using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace LongevityDiet.Gateway;

public sealed class BackendReadyCheck(HttpClient httpClient) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await httpClient.GetAsync("ready", cancellationToken);
            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy("Upstream API ready.")
                : HealthCheckResult.Unhealthy($"Upstream API returned {(int)response.StatusCode}.");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return HealthCheckResult.Unhealthy("Upstream API unavailable.");
        }
    }
}
