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

## 5. Start from a developer task

Added six selectable, editable scenarios: message triage, team routing, urgency, RAG relevance, agent capability routing and source-grounded answer evaluation. Reset restores the selected scenario. Switching scenarios cancels stale requests. Generated predicate code now uses the shorter question-string API.

Validation: site typecheck and build. Examples are prompts to experiment with, not claims of task-level accuracy. The shared endpoint still fixes provider/model and bounds input.

## 6. Catch editing mistakes before running

The editor now checks category counts, duplicate/long labels, descriptions and rubric levels before enabling Run. Invalid inputs display specific guidance instead of copyable broken code. Valid code links straight to installation. Limits describe this shared playground; library limits remain broader.

Validation: tests cover all six presets, malformed criteria and colons inside descriptions. The server retains its own independent validation. Site compilation checks conditional rendering.

## 7. Connect evidence to ordinary control flow

Predicate code now includes a runnable three-branch `switch`; the result highlights the branch selected by the current threshold. Moving the threshold reuses the response with no extra request. Rubric distributions display the user's level descriptions and actual scale instead of an unrelated hardcoded 1.6 example.

Validation: build/typecheck; existing boundary tests cover the same decision rule. Visual/interaction checks are included in the final browser pass. The model does not execute the action.

## 8. Show the work saved beyond a single call

Added typed, reusable recipes for routing with two questions in one call, partitioning RAG context while preserving uncertain items and original IDs, and ranking passages against a descriptive rubric. The site renders the repository files directly through generated snippets. Each recipe states its request count and concurrency behavior. No new runtime dependency or API surface was needed.

Validation: repository typecheck now includes examples and tests; recipe tests verify batched routing, review behavior and original-object preservation. Existing rank tests cover ordering and equal-score stability.

## 9. Evaluate alternatives and clarify API selection

Used hosted Jev to compare three API approaches on ceremony, explicit control/evidence, and reuse, plus three headings on clarity. It selected the string-question API in all three API questions and the existing factual heading. Kept that heading, made the supporting sentence concrete, and added an operation chooser to the README and reference. Explicitly explained that `check` returns an object: testing its truthiness is not a yes/no decision.

Evidence: [full prompts, responses and model metadata](../research/developer-proposals.json). Jev assigned selected-candidate probabilities of .89, .73 and .90 for the API and .82 for the existing heading. These are subjective model judgments, not usability scores or independent user research. Candidate order was not randomized. Implementation decisions also rely on type checks, parity tests and preserving uncertainty.

Validation: site typecheck. The API remains five execution methods and three reusable definition factories; no `if`/`switch` wrappers or silent action execution were added.
