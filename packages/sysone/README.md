# Sysone

**Typed decisions for TypeScript.**

Ask questions in plain language. Get answers your code can use.

[Interactive playground](https://sysone.help/#playground) · [Documentation](https://sysone.help/#docs) · [GitHub](https://github.com/sysone-help/sysone)

```ts
import { createSysone } from 'sysone';
import { vercel } from 'sysone/providers/vercel';

const sys = createSysone({ provider: vercel(), model: 'typesafe-ai/jev' });
const result = await sys.check(
  'Could you send the updated proposal?',
  'Does this message need a reply?',
);

if (result.decision === 'yes') {
  // Your next step.
}
// result.decision: 'yes' | 'no' | 'uncertain'
// result.probability: P(yes), from 0 to 1
```

Sysone provides predicates, classifiers, rubrics and collection operations for evaluation models. Use [Jev](https://docs.typesafe.ai) through TypeSafe or Vercel AI Gateway, or a compatible self-hosted server through the experimental custom HTTP provider. Definitions are immutable data. Execution is explicit and asynchronous. Sysone never runs the action being evaluated.

Independent, MIT-licensed, and not affiliated with TypeSafe or Vercel.

## Install

The initial npm publication is being prepared. Until the registry listing is available, install the [GitHub release package](https://github.com/sysone-help/sysone/releases/tag/v0.5.0):

```sh
npm install https://github.com/sysone-help/sysone/releases/download/v0.5.0/sysone-0.5.0.tgz
```

Node.js 22+ and ESM. The library has zero runtime, optional or peer dependencies. All providers use native fetch. Save the first example as `demo.mjs`, set `AI_GATEWAY_API_KEY` in your server environment, then run `node demo.mjs`.

The examples default to Jev through Vercel AI Gateway. [Check current pricing](https://vercel.com/ai-gateway/models/jev); its free promotion ends September 25, 2026. To use TypeSafe directly, set `TYPESAFE_API_KEY` and replace the client configuration:

```ts
import { createSysone } from 'sysone';
import { typesafe } from 'sysone/providers/typesafe';

const sys = createSysone({ provider: typesafe(), model: 'jev-latest' });
// Reads TYPESAFE_API_KEY from the server environment.
```

No additional packages are needed for Vercel, TypeSafe or compatible HTTP servers. Provider entry points are separate and the package supports tree shaking. Never put a provider secret in client-side application code.

`check`, `filter` and `partition` also accept a question string directly. Use `predicate()` when reusing a question or defining explicit yes/no criteria.

## Define questions

```ts
import { predicate, classifier, rubric } from 'sysone';

const needsReply = predicate('Does this message need a reply?');

const team = classifier({
  billing: 'Payments, invoices and refunds',
  support: 'Bugs, outages and technical help',
  other: 'Anything outside the listed categories',
});

const urgency = rubric('How urgent is this message?', [
  'Routine: no time pressure',
  'Soon: time-sensitive but not blocking',
  'Immediate: active outage or severe disruption',
]);
```

Definitions make no network calls and can be reused with any compatible client.

| Definition   | Arguments                                             | Evidence                                                                       |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `predicate`  | Instructions; optional `{ true, false }` descriptions | Probability of yes                                                             |
| `classifier` | 2–255 labels with descriptions; optional instructions | Selected label; optional distribution and provider confidence                  |
| `rubric`     | Instructions; 2–10 ordered level descriptions         | Expected zero-based level index; optional distribution and provider confidence |

Classifier categories are mutually exclusive. Include an `other` category when appropriate. Rubric scores may be fractional: on three levels, `1.7` is between the second and third levels. It is not a 0–100 score.

## Evaluate

```ts
const { answers, metadata } = await sys.evaluate(message, {
  needsReply,
  team,
  urgency,
});

answers.needsReply.probability; // number
answers.team.choice; // 'billing' | 'support' | 'other'
answers.urgency.score; // number, from 0 to 2 for this rubric
metadata.requestedModel;
```

One shared input, multiple independent questions, one request. A question does not see another question's answer. `evaluate` returns raw evidence; it does not apply a decision threshold.

Inputs can be text, JSON objects, or JSON arrays. Dates, undefined, non-finite numbers, circular structures, and class instances must be converted before evaluation. Jev is text-based; Sysone does not fetch URLs or process attachments for you.

## Check with a threshold

```ts
const result = await sys.check(message, needsReply, {
  minProbability: 0.85,
});

switch (result.decision) {
  case 'yes':
    break; // P(yes) >= 0.85
  case 'no':
    break; // P(yes) <= 0.15
  case 'uncertain':
    break; // Between the thresholds
}
```

The default threshold is `0.8`. Valid thresholds are greater than `0.5` and at most `1`. A probability is model evidence, not a guarantee. Evaluate your rules on representative examples before relying on them. `confidence` is a separate provider metric and is never manufactured from a selected label's probability.

## Collections

```ts
const { yes, no, uncertain } = await sys.partition(messages, needsReply, {
  select: (message) => message.body,
  minProbability: 0.85,
  concurrency: 4,
});

const actionable = await sys.filter(messages, needsReply, {
  select: (message) => message.body,
});

const ranked = await sys.rank(messages, urgency, {
  select: (message) => message.body,
});
// [{ item, score, answer, metadata }] — highest score first
```

- `partition` preserves the original items and their order in three groups.
- `filter` returns only the `yes` group. Use `partition` when you need uncertain items too.
- `rank` scores each item independently against the same rubric. Equal scores preserve input order.
- Collections make **one request per item**, with concurrency `4` by default (configurable from `1` to `100`).
- Input and questions are validated before any collection requests start. An empty input returns an empty result.
- A failed request rejects the collection. Already running requests may finish and incur usage; partial results are not returned.

## Providers and models

A **provider** configures how to connect: credentials, transport and endpoint. A **model** selects what runs through that provider. Neither implies the other. There is no default model.

```ts
import { createSysone } from 'sysone';
import { vercel } from 'sysone/providers/vercel';

const gateway = vercel({ apiKey: process.env.AI_GATEWAY_API_KEY });
const sys = createSysone({
  provider: gateway,
  model: 'typesafe-ai/jev',
});
```

Reuse `gateway` in other clients with different model IDs from its evaluation catalog. Each request carries its own model ID; the provider is not bound to Jev or a single lab. Model IDs belong to a provider's catalog: Sysone does not translate aliases across providers or advertise unavailable models. An unsupported ID fails at the provider, without silent fallback.

For TypeSafe's native endpoint, select the model separately too:

```ts
import { typesafe } from 'sysone/providers/typesafe';

const sys = createSysone({
  provider: typesafe(), // Reads TYPESAFE_API_KEY.
  model: 'jev-1.13.0',
});
```

Both factories accept optional `apiKey` and `fetch`. `vercel()` reads `AI_GATEWAY_API_KEY` when credentials are not supplied explicitly. No request is made until an operation executes. There is no automatic provider selection, retry or fallback.

Results distinguish `metadata.provider`, `requestedModel`, and `resolvedModel` when reported. An echoed Gateway alias is not treated as a resolved version. Namespaced Gateway extensions are preserved in `metadata.providerMetadata`, without interpreting every model as TypeSafe. For example, TypeSafe's Gateway confidence remains in the `typesafe` namespace; it is no longer copied into `answer.confidence`. Native System One confidence remains attached to native answers when present. Confidence is always provider/model-specific, never a universal calibration measure.

### Compatible servers and open models

```ts
import { createSysone, predicate } from 'sysone';
import { customProvider } from 'sysone/providers/custom';

const local = customProvider({
  baseURL: 'http://127.0.0.1:8080/v1',
  id: 'local', // Optional transport identity in result metadata.
  // apiKey: process.env.OPENJEV_API_KEY, // If your server requires it.
});

const sys = createSysone({ provider: local, model: 'openjev-latest' });
await sys.check('Can you help?', predicate('Needs a reply?'));
```

Start your server separately. `customProvider` appends `/systemone` to `baseURL`, translates boolean questions to `noul`, and preserves model evidence. It accepts optional `apiKey`, `headers`, `fetch`, and a metadata `id` identifying the endpoint. It never reads a cloud credential from the environment. `rounding` may declare precision documented by a server; it does not round values or change the request. Without it, full precision is expected.

The custom provider uses the System One HTTP protocol; it does not execute model weights or automatically adapt arbitrary APIs. An open model served through Vercel still uses `vercel()`. For a different wire protocol, implement `EvaluationProvider`.

The experimental transport is tested with contract fixtures from [razorback16/OpenJev](https://github.com/razorback16/openjev), an independent server over DiffusionGemma. **We have not run its GPU backend or established quality equivalence with Jev.** OpenJev supports up to 128 choice labels (versus the library's 255 ceiling). Its confidence is one minus normalized entropy, and its probability estimates depend on top-k log probabilities. Thresholds are not portable across models. The server code is Apache-2.0; model terms apply separately.

Other open evaluation models include [Bespoke Nimble 9B](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B) and [Kotoba Open-Jev DeBERTa](https://huggingface.co/com-kotobalabs/open-jev-deberta-v3-large). Both publish evaluation weights, but need a serving layer and a custom provider adapter; neither is an implemented Sysone integration. No official open Jev weights were found in our September 19, 2026 review. [Research and source links](https://github.com/sysone-help/sysone/blob/main/research/open-evaluation-models.md).

### Custom providers

Cloudflare and OpenRouter also offer Jev access; Sysone adapters for those routes are not yet included. Custom transports implement `EvaluationProvider`, independently of the model selection:

```ts
import type { EvaluationProvider } from 'sysone';

const provider: EvaluationProvider = {
  id: 'my-endpoint',
  async evaluate(request, options) {
    // request contains { model, state, questions }.
    // Respect options?.signal; preserve model identity and question IDs.
    return myEvaluationBackend(request, options);
  },
};

const sys = createSysone({ provider, model: 'my-evaluation-model' });
```

Custom providers must support the requested question types and honor cancellation. The client validates answer types, selected labels, score ranges and available probability distributions. It preserves provider rounding instead of silently renormalizing probabilities. Do not use generated language-model guesses as if they were measured evaluation probabilities.

## Migrating from 0.3

The generic endpoint factory is now named `customProvider`, describing the connection rather than its wire protocol:

```ts
// 0.3
import { systemOne } from 'sysone/providers/system-one';

// 0.4
import { customProvider } from 'sysone/providers/custom';
```

Replace `systemOne(options)` with `customProvider(options)`. The default metadata provider ID changes from `system-one` to `custom`; an explicit `id` is unchanged. Request/response formats and model selection are unchanged. System One remains the supported HTTP protocol, not a provider identity.

## Migrating from 0.1

Version 0.2 separates model selection from provider construction:

```ts
// 0.1
createSysone({ model: vercel('typesafe-ai/jev', { apiKey }) });

// 0.2
createSysone({ provider: vercel({ apiKey }), model: 'typesafe-ai/jev' });
```

Apply the same change to `typesafe` and the then-named `systemOne`. Custom implementations now expose `EvaluationProvider.id` and accept `request.model`, rather than binding an `EvaluationModel.modelId`. The custom transport's optional label is now `id`, replacing the old `provider` option. Gateway confidence remains namespaced in `metadata.providerMetadata`; migrate consumers of the former TypeSafe-specific `answer.confidence` projection accordingly.

## Timeouts, cancellation and errors

```ts
const sys = createSysone({ provider: typesafe(), model: 'jev-latest', timeoutMs: 15_000 });
const controller = new AbortController();

await sys.check(message, needsReply, { signal: controller.signal });
// controller.abort() cancels an in-flight request.
```

The default timeout is 30 seconds per request. Provided adapters honor the combined timeout and caller signal. Timeout and cancellation throw; network errors **never** become an uncertain decision. Provider HTTP/transport errors and invalid evidence use `SysoneError` with `code`:

- `INVALID_INPUT`
- `INVALID_RESPONSE`
- `CONFIGURATION`
- `PROVIDER_ERROR`

Provider error bodies, headers, credentials and raw requests are not included in errors. Cancellation and timeout use their native abort reasons. Malformed provider responses use `INVALID_RESPONSE`. The Vercel adapter calls the experimental Gateway evaluation protocol directly; see [transport details](https://github.com/sysone-help/sysone/blob/main/docs/vercel-transport.md).

## Size and dependencies

<!-- size:start -->

**Zero dependencies. 3.9 kB min+gzip, including all providers.**

| Included JavaScript  | Minified | Minified + gzip |
| -------------------- | -------: | --------------: |
| Core                 |  7,586 B |         2,720 B |
| Core + TypeSafe      | 10,268 B |         3,662 B |
| Core + Vercel        |  9,052 B |         3,268 B |
| Core + custom HTTP   |  9,904 B |         3,526 B |
| Core + all providers | 11,255 B |         3,914 B |

Measured on 0.5.0 with all core exports retained, esbuild 0.28.2, ESM/ES2022 and gzip level 9 (zlib 1.3.1.zlib-ng). Gzip sizes can vary slightly between compression versions. Bundle sizes exclude types/docs and are not the package download size. No third-party runtime code is bundled.

[Reproduce the measurement](https://github.com/sysone-help/sysone/blob/main/scripts/package-size.mjs): `npm run build && npm run size`. CI enforces a 4,000-byte gzip budget for the complete bundle. Build/test tools belong to the private workspace, not your installation.
<!-- size:end -->

## Playground and project

[sysone.help](https://sysone.help) offers live examples, a threshold explorer, copyable code and introductory documentation. The shared playground sends text through Vercel to TypeSafe. It has bounded inputs and an infrastructure rate limit, and availability depends on the shared budget. No sign-up is required.

Sysone is a library, not a subscription service. The public API is pre-1.0; breaking changes will be called out in release notes.

[Contributing](https://github.com/sysone-help/sysone/blob/main/CONTRIBUTING.md) · [Security](https://github.com/sysone-help/sysone/blob/main/SECURITY.md) · [MIT license](https://github.com/sysone-help/sysone/blob/main/LICENSE)
