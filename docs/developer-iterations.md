# Ten iterations toward less work for developers

Objective: make useful Jev behavior easier to try, understand and copy, while keeping Sysone small and dependency-free. These are implementation/review cycles, not model-quality benchmarks. Each numbered entry records the problem, change and check. September 2026.

## 1. Establish an honest native baseline

Added executable `examples/compare/{native,sysone}.ts`. Both call the same TypeSafe endpoint/model with identical state and question, enforce a 30-second timeout, reject HTTP failures and invalid probabilities, and return the same three-way decision at 80%. Transport injection exists on both sides for reproducible testing. Sysone additionally validates the complete result and preserves metadata internally; the comparison returns only their common output.

Validation: comparison tests cover seven probabilities including both decision boundaries, request equality, HTTP errors and malformed probabilities. Native HTTP already has zero dependencies. The official SDK also offers typed questions; Sysone's differentiators must be decision policy, collections, provider separation and footprint, not a claim that typing is unique.

Sources: [HTTP API](https://docs.typesafe.ai/api), [official JavaScript SDK](https://docs.typesafe.ai/sdk/javascript). These fixtures verify the documented contract, not live TypeSafe service availability.

## 2. Remove ceremony from a single question

`check`, `filter` and `partition` now accept a plain question string as well as a reusable `predicate`. No new method or implicit model/provider was added. Reusable definitions still support explicit yes/no criteria. Updated the executable comparison to use the shorthand.

Validation: tested direct decisions, collections, empty questions rejected before requests, existing threshold/validation regressions and identical native requests. The full bundle must continue to fit the existing 4,000-byte gzip budget.
