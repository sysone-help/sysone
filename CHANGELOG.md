# Changelog

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
