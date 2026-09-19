# Vercel evaluation transport

Sysone 0.3 calls the Gateway directly with native `fetch`. It does not install or embed the AI SDK. Provider and model selection remain independent.

The wire contract was checked against the official [`gateway-evaluation-model.ts`](https://github.com/vercel/ai/blob/main/packages/gateway/src/gateway-evaluation-model.ts) and [`gateway-provider.ts`](https://github.com/vercel/ai/blob/main/packages/gateway/src/gateway-provider.ts), and the locally installed `@ai-sdk/gateway` 4.0.85 source before that dependency was removed. Live validation is recorded in release notes.

- Endpoint: `POST https://ai-gateway.vercel.sh/v4/ai/evaluation-model`.
- Bearer authentication: explicit `apiKey`, otherwise `AI_GATEWAY_API_KEY`.
- Headers: `ai-gateway-protocol-version: 0.0.1`, `ai-gateway-auth-method: api-key`, `ai-evaluation-model-specification-version: 4`, and `ai-model-id` containing the caller's chosen model.
- JSON body: `{ state, questions }`. Boolean questions use `boolean`, not the native TypeSafe `noul` spelling.
- Responses preserve answer evidence, declared rounding, token usage and namespaced `providerMetadata`. The wire contract does not provide a distinct resolved model version, so none is invented.
- Cancellation reaches the native fetch and body-reading operation. There are no automatic retries, fallbacks or telemetry calls.
- HTTP/network errors are sanitized `PROVIDER_ERROR`s. Invalid JSON, evidence or metadata uses `INVALID_RESPONSE`; neither exposes provider bodies or credentials.

This is an experimental evaluation protocol, not the OpenAI-compatible chat endpoint. Sysone maintains its small transport directly and must track protocol changes. API-key authentication is supported; automatic Vercel OIDC authentication is outside this adapter's interface.

Contract tests cover request headers/body, multiple models sharing one provider, rounding, malformed evidence/metadata, HTTP errors, cancellation and credential redaction. The normal-install smoke runs all three provider entry points with fixtures in an empty project containing only Sysone. The build refuses third-party code in its dependency graph, and size checks enforce the public gzip budget.
