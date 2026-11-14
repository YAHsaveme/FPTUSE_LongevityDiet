namespace LongevityDiet.Services.Planning;

/// <summary>
/// Serializes create/rollover/archive operations for one member across scoped
/// MealPlanningService instances hosted in the same API process. Without this,
/// concurrent GET-driven ensure-current and explicit generation can both read
/// "no active plan", independently insert active rows, and leave an orphaned
/// active plan after the member archives the one shown in the UI.
///
/// This is an in-process safety guard for the single API Docker Desktop demo.
/// A multi-replica deployment additionally requires a distributed transaction
/// or a DB-enforced uniqueness/serialization strategy.
/// </summary>
internal static class MealPlanMutationGate
{
    private sealed class Gate : IDisposable
    {
        internal readonly SemaphoreSlim Semaphore = new(1, 1);
        internal int References;
        public void Dispose() => Semaphore.Dispose();
    }

    private static readonly object Sync = new();
    private static readonly Dictionary<Guid, Gate> Gates = [];

    internal static async Task<IDisposable> AcquireAsync(
        Guid userId, CancellationToken cancellationToken)
    {
        Gate gate;
        lock (Sync)
        {
            if (!Gates.TryGetValue(userId, out gate!))
            {
                gate = new Gate();
                Gates.Add(userId, gate);
            }

            gate.References++;
        }

        try
        {
            await gate.Semaphore.WaitAsync(cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            Release(userId, gate, ownsSemaphore: false);
            throw;
        }

        return new Lease(userId, gate);
    }

    private static void Release(Guid userId, Gate gate, bool ownsSemaphore)
    {
        lock (Sync)
        {
            if (ownsSemaphore)
                gate.Semaphore.Release();

            gate.References--;
            if (gate.References == 0)
            {
                Gates.Remove(userId);
                gate.Dispose();
            }
        }
    }

    private sealed class Lease(Guid userId, Gate gate) : IDisposable
    {
        private int _disposed;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _disposed, 1) == 0)
                Release(userId, gate, ownsSemaphore: true);
        }
    }
}
