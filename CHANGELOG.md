# Changelog

## 0.3.0

- Remove all runtime, optional and peer dependencies. Vercel now uses native fetch against the Gateway evaluation protocol; `ai` and `@ai-sdk/gateway` are no longer required. The provider/model configuration from 0.2 is unchanged.
- Share the HTTP transport, retain cancellation and sanitized errors, and validate Gateway responses locally. Malformed Gateway evidence now consistently throws `INVALID_RESPONSE` instead of an AI SDK `PROVIDER_ERROR`.
- Publish compact ESM with separate provider entry points, shared code and TypeScript declarations. No third-party runtime code is bundled.
- Add reproducible bundle measurements, an enforced 4,000-byte min+gzip budget for core plus all providers, and a normal-install check proving the package brings no external dependencies.
- Document the footprint in the README and website, with exact scope and measurement commands.

## 0.2.0

Breaking API correction: provider connection and model selection are separate.

- Configure clients with `createSysone({ provider: vercel(), model: 'typesafe-ai/jev' })`. Models are explicit IDs in the provider's catalog, with no implicit Jev default.
- `vercel(options)`, `typesafe(options)` and `systemOne(options)` return reusable `EvaluationProvider` instances. Every request carries its own model ID; concurrent clients can share a provider.
- Custom providers expose `id` and handle `{ model, state, questions }`. The old model-bound `EvaluationModel` contract is replaced. The generic transport option `provider` becomes `id`.
- Preserve namespaced Gateway metadata under `metadata.providerMetadata`. Remove the TypeSafe-only confidence projection into Gateway answers; native System One confidence is unchanged.
- Update the playground, examples, migration guide and package checks. Test concurrent multi-model routing and explicit configuration without live catalog assumptions.

## 0.1.1

- Add experimental `systemOne(modelId, { baseURL })` for compatible HTTP servers, with optional authentication, cancellation and unchanged provider evidence.
- Document independent OpenJev implementations and open evaluation weights, including compatibility and confidence differences. GPU inference has not been validated by Sysone.
- Rework the website around an editable playground, copyable TypeScript, API reference and model options. Add light/dark themes and keyboard execution.
- Use project attribution in package metadata, documentation and licenses.

## 0.1.0

Initial release.

- Immutable `predicate`, `classifier` and `rubric` definitions.
- Typed `evaluate` and three-way `check` with explicit uncertainty.
- `filter`, `partition` and rubric-based `rank`, preserving original items and bounded concurrency.
- TypeSafe native and Vercel AI Gateway adapters, with optional AI SDK peers.
- Per-request timeouts, cancellation, validated evidence and sanitized provider errors.
- Educational playground and documentation at sysone.help.
