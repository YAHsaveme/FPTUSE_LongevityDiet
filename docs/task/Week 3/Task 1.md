# Task 1 - Recommendation Ranking v2 & Explainability

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w3-t1-ranking-v2`

## Mục tiêu
Nâng Recommendation gRPC Service từ baseline ranking thành engine có score breakdown, reason code và policy version rõ ràng.

## Ranking pipeline
1. Validate request.
2. Apply hard constraints.
3. Normalize candidate features.
4. Apply versioned weight configuration.
5. Calculate score components.
6. Stable sort.
7. Return accepted + rejected candidates cùng reason codes.

## Hard constraints
- allergen;
- explicit user exclusion;
- inactive recipe/food;
- unsupported rule state;
- safety flag liên quan.

Hard constraint không bao giờ bị override bởi preference hoặc feedback.

## Soft signals
Có thể gồm:
- plant-forward alignment;
- legumes/whole grains;
- cuisine preference;
- meal-time fit;
- recent repetition penalty;
- user feedback;
- plan balance.

Mọi signal phải có config/version, không magic number rải rác.

## gRPC contract
Response nên có:
- CandidateId;
- TotalScore;
- ScoreComponents;
- ReasonCodes;
- PolicyVersion;
- RejectedReason khi bị filter.

## API/UI
- API expose recommendation result theo DTO sạch.
- UI hiển thị "Vì sao gợi ý này?" từ reason code.
- Không hiển thị raw internal weights nếu không cần.

## Testing
- hard constraint precedence;
- tie-break stability;
- same input/version -> same output;
- score component sum;
- version switching;
- malformed request;
- empty candidate set;
- performance với candidate set thực tế.

## Deliverables
- Versioned ranking configuration.
- Updated proto + service.
- API mapping.
- Explainable UI.
- Unit/integration/performance tests.

## Definition of Done
Recommendation có thể giải thích bằng deterministic reason codes và kết quả tái lập được theo policy version.
