# Ten iterations toward less work for developers

Objective: make useful Jev behavior easier to try, understand and copy, while keeping Sysone small and dependency-free. These are implementation/review cycles, not model-quality benchmarks. Each numbered entry records the problem, change and check. September 2026.

## 1. Establish an honest native baseline

Added executable `examples/compare/{native,sysone}.ts`. Both call the same TypeSafe endpoint/model with identical state and question, enforce a 30-second timeout, reject HTTP failures and invalid probabilities, and return the same three-way decision at 80%. Transport injection exists on both sides for reproducible testing. Sysone additionally validates the complete result and preserves metadata internally; the comparison returns only their common output.

Validation: comparison tests cover seven probabilities including both decision boundaries, request equality, HTTP errors and malformed probabilities. Native HTTP already has zero dependencies. The official SDK also offers typed questions; Sysone's differentiators must be decision policy, collections, provider separation and footprint, not a claim that typing is unique.

Sources: [HTTP API](https://docs.typesafe.ai/api), [official JavaScript SDK](https://docs.typesafe.ai/sdk/javascript). These fixtures verify the documented contract, not live TypeSafe service availability.

## 2. Remove ceremony from a single question

`check`, `filter` and `partition` now accept a plain question string as well as a reusable `predicate`. No new method or implicit model/provider was added. Reusable definitions still support explicit yes/no criteria. Updated the executable comparison to use the shorthand.

Validation: tested direct decisions, collections, empty questions rejected before requests, existing threshold/validation regressions and identical native requests. The full bundle must continue to fit the existing 4,000-byte gzip budget.

## 3. Put the comparison on the site

Added side-by-side native HTTP and Sysone examples, sourced at build time from the actual tested files. Explicitly describes the common behavior and the extra validation Sysone performs. Acknowledges that native fetch has zero dependencies and that the official SDK already has inferred types. No invented speed/cost win or padded SDK-size comparison.

Validation: site build and prerender, with both implementations included in static HTML. Source generation avoids an independently maintained marketing snippet.

## 4. Make the first successful run obvious

Moved the README's measurement table below the runnable example. Added direct links to try, install and compare. The site quickstart defaults to the same provider as the playground, names a runnable `demo.mjs` file, prints the result and includes its run command. Removed duplicate, not-yet-available npm installation commands from the package guide. Documented plain questions alongside reusable definitions.

Validation: site TypeScript compilation; examples use ESM JavaScript syntax that can run directly without installing a TS runner. Provider credentials remain server-side and separate from model IDs.
