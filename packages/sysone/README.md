# Sysone

**Typed decisions for TypeScript.**

Ask questions in plain language. Get answers your code can use.

[Interactive playground](https://sysone.help/#playground) · [Documentation](https://sysone.help/#docs) · [GitHub](https://github.com/sysone-help/sysone)

```ts
import { createSysone, predicate } from 'sysone';
import { typesafe } from 'sysone/providers/typesafe';

const sys = createSysone({ model: typesafe() });
const needsReply = predicate('Does this message need a reply?');

const result = await sys.check('Could you send the updated proposal?', needsReply);

if (result.decision === 'yes') {
  // Your next step.
}
// result.decision: 'yes' | 'no' | 'uncertain'
// result.probability: P(yes), from 0 to 1
```

Sysone provides predicates, classifiers, rubrics and collection operations for evaluation models. Use [Jev](https://docs.typesafe.ai) through TypeSafe or Vercel AI Gateway, or a compatible self-hosted server through the experimental System One adapter. Definitions are immutable data. Execution is explicit and asynchronous. Sysone never runs the action being evaluated.

Independent, MIT-licensed, and not affiliated with TypeSafe or Vercel.

## Install

The initial npm publication is being prepared. Until the registry listing is available, install the [GitHub release package](https://github.com/sysone-help/sysone/releases/tag/v0.1.1):

```sh
npm install https://github.com/sysone-help/sysone/releases/download/v0.1.1/sysone-0.1.1.tgz
```

After npm publication, the equivalent registry command is:

Node.js 22+ and ESM. The core and direct TypeSafe adapter have no runtime dependencies.

```sh
npm install sysone
```

Set `TYPESAFE_API_KEY` in your server environment. To use your Vercel AI Gateway account instead:

```sh
npm install sysone ai@7.0.105 @ai-sdk/gateway@4.0.85
```

```ts
import { createSysone } from 'sysone';
import { vercel } from 'sysone/providers/vercel';

const sys = createSysone({ model: vercel() });
// Reads AI_GATEWAY_API_KEY from the server environment.
```

The AI SDK peers are optional and pinned because the evaluation API is experimental. Importing the core or TypeSafe adapter does not import the AI SDK. Never put a provider secret in client-side application code.

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

## Providers

```ts
import { typesafe } from 'sysone/providers/typesafe';
import { vercel } from 'sysone/providers/vercel';

typesafe(); // jev-latest; TYPESAFE_API_KEY
typesafe('jev-1.13.0'); // Fixed native version
vercel(); // typesafe-ai/jev; AI_GATEWAY_API_KEY

typesafe('jev-latest', { apiKey: process.env.TYPESAFE_API_KEY });
vercel('typesafe-ai/jev', { apiKey: process.env.AI_GATEWAY_API_KEY });
```

Both accept an optional `fetch` implementation for testing or transport instrumentation. There is no automatic provider selection, retry, or fallback.

Results include the provider, requested model, resolved model when the provider reports a distinct version, request ID when available, token usage, and rounding information. Absent metadata remains absent. The Vercel adapter does not treat an echoed alias as a resolved model version. Provider-specific billing metadata is not normalized in this release.

### Compatible servers and open models

```ts
import { createSysone, predicate } from 'sysone';
import { systemOne } from 'sysone/providers/system-one';

const sys = createSysone({
  model: systemOne('openjev-latest', {
    baseURL: 'http://127.0.0.1:8080/v1',
    provider: 'openjev',
    // apiKey: process.env.OPENJEV_API_KEY, // If your server requires it.
  }),
});

await sys.check('Can you help?', predicate('Needs a reply?'));
```

Start your server separately. `systemOne` appends `/systemone` to `baseURL`, translates boolean questions to `noul`, and preserves model evidence. It accepts optional `apiKey`, `headers`, `fetch`, and a metadata `provider` name. It never reads a cloud credential from the environment. `rounding` may declare precision documented by a server; it does not round values or change the request. Without it, full precision is expected.

The experimental transport is tested with contract fixtures from [razorback16/OpenJev](https://github.com/razorback16/openjev), an independent server over DiffusionGemma. **We have not run its GPU backend or established quality equivalence with Jev.** OpenJev supports up to 128 choice labels (versus the library's 255 ceiling). Its confidence is one minus normalized entropy, and its probability estimates depend on top-k log probabilities. Thresholds are not portable across models. The server code is Apache-2.0; model terms apply separately.

Other open evaluation models include [Bespoke Nimble 9B](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B) and [Kotoba Open-Jev DeBERTa](https://huggingface.co/com-kotobalabs/open-jev-deberta-v3-large). Both publish evaluation weights, but need a serving layer and a custom adapter; neither is an implemented Sysone integration. No official open Jev weights were found in our September 19, 2026 review. [Research and source links](https://github.com/sysone-help/sysone/blob/main/research/open-evaluation-models.md).

### Custom adapters

Cloudflare and OpenRouter also offer Jev access; Sysone adapters for those routes are not yet included. Other evaluation models can implement the exported `EvaluationModel` interface:

```ts
import type { EvaluationModel } from 'sysone';

const model: EvaluationModel = {
  provider: 'my-provider',
  modelId: 'my-evaluation-model',
  async evaluate(request, options) {
    // Respect options?.signal; translate your provider's response.
    // Return { answers, metadata }, preserving the requested question IDs.
    return myEvaluationBackend(request, options);
  },
};
```

Custom adapters must support the requested question types and honor cancellation. The client validates answer types, selected labels, score ranges and available probability distributions. It preserves provider rounding instead of silently renormalizing probabilities. Do not use generated language-model guesses as if they were measured evaluation probabilities.

## Timeouts, cancellation and errors

```ts
const sys = createSysone({ model: typesafe(), timeoutMs: 15_000 });
const controller = new AbortController();

await sys.check(message, needsReply, { signal: controller.signal });
// controller.abort() cancels an in-flight request.
```

The default timeout is 30 seconds per request. Provided adapters honor the combined timeout and caller signal. Timeout and cancellation throw; network errors **never** become an uncertain decision. Provider HTTP/transport errors and invalid evidence use `SysoneError` with `code`:

- `INVALID_INPUT`
- `INVALID_RESPONSE`
- `CONFIGURATION`
- `PROVIDER_ERROR`

Provider error bodies, headers, credentials and raw requests are not included in errors. Cancellation and timeout use their native abort reasons. The experimental AI SDK may reject a malformed Gateway response before Sysone can validate it; this is surfaced as `PROVIDER_ERROR`.

## Playground and project

[sysone.help](https://sysone.help) offers live examples, a threshold explorer, copyable code and introductory documentation. The shared playground sends text through Vercel to TypeSafe. It has bounded inputs and an infrastructure rate limit, and availability depends on the shared budget. No sign-up is required.

Sysone is a library, not a subscription service. The public API is pre-1.0; breaking changes will be called out in release notes.

[Contributing](https://github.com/sysone-help/sysone/blob/main/CONTRIBUTING.md) · [Security](https://github.com/sysone-help/sysone/blob/main/SECURITY.md) · [MIT license](https://github.com/sysone-help/sysone/blob/main/LICENSE)
