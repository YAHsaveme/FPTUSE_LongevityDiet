# Task 3 - Structured Logging, Correlation, Metrics & Tracing

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w6-t3-observability`

## Mục tiêu
Có thể truy vết một business action qua REST -> SQL/Outbox -> Redis -> Worker và REST -> gRPC.

## Structured logging
Standard fields:
- CorrelationId;
- RequestId/TraceId;
- UserId khi an toàn;
- EventId;
- Service;
- Operation;
- duration;
- outcome.

Không log:
- password;
- raw refresh token;
- JWT;
- unnecessary sensitive answers.

## Correlation
- Accept/generate correlation ID.
- Propagate qua gRPC metadata/context.
- Persist EventId/CorrelationId trong Outbox.
- Worker log cùng correlation.

## Metrics
Tối thiểu:
- request duration/error count;
- gRPC call duration/error;
- pending outbox;
- worker processed/failed;
- Redis pending/DLQ;
- DB operation timing hoặc dashboard query timing.

## Tracing
Nếu dùng OpenTelemetry:
- HTTP server/client;
- gRPC;
- custom spans cho business operations quan trọng.
- Không over-instrument low-value loops.

## Testing/Verification
- one E2E action tìm được cùng correlation.
- no secret in logs.
- metric increments.
- failed event visible.
- trace survives async boundary qua stored correlation.

## Definition of Done
Team có thể lấy một CorrelationId và lần theo được request tới gRPC hoặc Worker side effect mà không grep mơ hồ theo text log.
