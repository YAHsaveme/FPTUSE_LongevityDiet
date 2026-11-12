using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LongevityDiet.Worker.Ops;

// A separate DbContext within the Worker-owned LongevityWorkerDb.
// Never joins or FK-references Identity, Catalog, Planning, Tracking or Recommendation SQL.
public sealed class WorkerOpsDbContext(DbContextOptions<WorkerOpsDbContext> options)
    : DbContext(options)
{
    public DbSet<WorkerReceivedEvent> ReceivedEvents => Set<WorkerReceivedEvent>();
    public DbSet<WorkerRejectedEvent> DeadLetters => Set<WorkerRejectedEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var receipts = modelBuilder.Entity<WorkerReceivedEvent>();
        receipts.ToTable("WorkerReceivedEvents");
        receipts.HasKey(x => new { x.Source, x.EventId });
        receipts.Property(x => x.Source).HasMaxLength(40).IsRequired();
        receipts.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        receipts.Property(x => x.RedisStreamId).HasMaxLength(60).IsRequired();
        receipts.HasIndex(x => x.ReceivedAtUtc);
        receipts.HasIndex(x => new { x.Source, x.EventType });

        var deadLetters = modelBuilder.Entity<WorkerRejectedEvent>();
        deadLetters.ToTable("WorkerEventDeadLetters");
        deadLetters.HasKey(x => x.Id);
        deadLetters.Property(x => x.Source).HasMaxLength(40).IsRequired();
        deadLetters.Property(x => x.RedisStreamId).HasMaxLength(60).IsRequired();
        deadLetters.Property(x => x.EventType).HasMaxLength(100).IsRequired();
        deadLetters.Property(x => x.ReasonCode).HasMaxLength(80).IsRequired();
        deadLetters.HasIndex(x => new { x.Source, x.RedisStreamId }).IsUnique();
        deadLetters.HasIndex(x => new { x.IsResolved, x.RejectedAtUtc });
    }
}

public sealed class WorkerReceivedEvent
{
    public string Source { get; set; } = string.Empty;
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string RedisStreamId { get; set; } = string.Empty;
    public DateTime ReceivedAtUtc { get; set; }
}

public sealed class WorkerRejectedEvent
{
    public long Id { get; set; }
    public string Source { get; set; } = string.Empty;
    public string RedisStreamId { get; set; } = string.Empty;
    public string EventType { get; set; } = "unknown";
    public string ReasonCode { get; set; } = string.Empty;
    public DateTime RejectedAtUtc { get; set; }
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
}

public sealed class WorkerOpsDesignTimeFactory : IDesignTimeDbContextFactory<WorkerOpsDbContext>
{
    public WorkerOpsDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Worker")
            ?? "Server=localhost;Database=LongevityWorkerDb;Trusted_Connection=True;TrustServerCertificate=True";
        return new WorkerOpsDbContext(
            new DbContextOptionsBuilder<WorkerOpsDbContext>()
                .UseSqlServer(connection).Options);
    }
}
