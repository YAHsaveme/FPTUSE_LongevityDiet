using System.Data.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace LongevityDiet.Worker.Ops;

/// <summary>
/// Read-only real WorkerDb reminder-dispatch history; this is NOT a fabricated
/// queue. The table is written exclusively by ReminderWorkerEngine.
/// </summary>
public static class WorkerJobEndpoints
{
    public static void MapWorkerJobs(this RouteGroupBuilder admin)
    {
        admin.MapGet("/jobs", async (WorkerOpsDbContext db,
            int page = 1, int pageSize = 25, CancellationToken ct = default) =>
        {
            if (page is < 1 or > 100000 || pageSize is < 1 or > 100)
                return Results.BadRequest(new { error = "invalid_pagination" });

            var offset = ((long)page - 1L) * pageSize;
            try
            {
                await db.Database.OpenConnectionAsync(ct);
                await using var cmd = db.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = """
                    SELECT [Id], [UserId], [Category], [DueAtUtc], [CreatedAtUtc]
                    FROM [dbo].[ReminderDispatchRecords]
                    ORDER BY [CreatedAtUtc] DESC, [Id]
                    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;
                    """;
                cmd.Parameters.Add(new SqlParameter("@skip", System.Data.SqlDbType.BigInt)
                {
                    Value = offset
                });
                cmd.Parameters.Add(new SqlParameter("@take", System.Data.SqlDbType.Int)
                {
                    Value = pageSize
                });
                var items = new List<object>();
                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                {
                    items.Add(new
                    {
                        id = reader.GetGuid(0), userId = reader.GetGuid(1),
                        category = reader.GetString(2),
                        dueAtUtc = reader.GetDateTime(3),
                        createdAtUtc = reader.GetDateTime(4),
                        state = "dispatch_recorded"
                    });
                }
                return Results.Ok(new { page, pageSize, items });
            }
            catch (DbException)
            {
                // If the reminder worker has not migrated WorkerDb yet, do
                // not claim a zero-job queue or read a different database.
                return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "worker_dispatch_store_unavailable");
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        });
    }
}
