using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace LongevityDiet.Gateway;

/// <summary>
/// Health for the independent ADR-005 target sidecar; ordinary Gateway's
/// current-api /gateway/ready semantics are deliberately unchanged.
/// </summary>
public sealed class TargetOwnersReadyCheck(HttpClient client) : IHealthCheck
{
    private static readonly (string Name, string Address)[] Owners =
    [
        ("identity", "http://identity:8081/ready"),
        ("catalog", "http://catalog:8082/ready"),
        ("planning", "http://planning:8083/ready"),
        ("tracking", "http://tracking-api:8084/ready"),
        ("recommendation", "http://recommendation-owner:8087/ready"),
        ("worker-ops", "http://worker-ops:8086/ready")
    ];

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        async Task<string?> ProbeAsync((string Name, string Address) target)
        {
            try
            {
                using var response = await client.GetAsync(target.Address,
                    HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                return response.IsSuccessStatusCode ? null : target.Name;
            }
            catch (Exception exception) when (exception is HttpRequestException
                or TaskCanceledException)
            {
                return target.Name;
            }
        }

        var status = await Task.WhenAll(Owners.Select(ProbeAsync));
        var missing = status.Where(name => name is not null).ToArray();
        return missing.Length == 0
            ? HealthCheckResult.Healthy("All six ADR-005 target service APIs ready.")
            : HealthCheckResult.Unhealthy(
                "Unready target services: " + string.Join(", ", missing));
    }
}
