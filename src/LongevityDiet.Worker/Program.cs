var builder = Host.CreateApplicationBuilder(args);

// Week 1 - Task 4 adds the real outbox publisher, Redis Streams consumer,
// idempotency handling, retry/dead-letter flow, and scheduled job processors.

var host = builder.Build();
host.Run();
