# Sysone

**Typed decisions for TypeScript.** Ask a question, inspect the evidence, keep control of what happens next.

[Playground & docs](https://sysone.help) · [Library reference](packages/sysone/README.md) · [Contributing](CONTRIBUTING.md)

```ts
import { createSysone } from 'sysone';
import { typesafe } from 'sysone/providers/typesafe';

const sys = createSysone({ provider: typesafe(), model: 'jev-latest' });
const result = await sys.check('Can you send the proposal?', 'Does this message need a reply?');
// { decision: 'yes' | 'no' | 'uncertain', probability, metadata }
```

**Try it without setup:** [run Jev in the playground](https://sysone.help/#playground). No sign-up. To use it in your app, [install the library](#install) and set your provider key.

## Why add a library?

Native fetch is already dependency-free. Sysone adds decisions with an uncertain state, validated responses and collection operations without a provider SDK. The [native vs Sysone comparison](https://sysone.help/#comparison) uses [executable examples](examples/compare) with matching request/decision tests. The [official TypeSafe SDK](https://docs.typesafe.ai/sdk/javascript) also supports typed questions; use it when its broader native API suits your application.

`predicate`, `classifier` and `rubric` define reusable questions. `check`, `evaluate`, `filter`, `partition` and `rank` execute them. Definitions are pure data; requests are explicit, cancellable, and never retried automatically.

Use [Jev](https://docs.typesafe.ai) through TypeSafe or Vercel AI Gateway, or connect the experimental `customProvider()` adapter to a compatible self-hosted server such as [OpenJev](https://github.com/razorback16/openjev). The library is designed around evaluation models, independently of the provider. This is an independent project, not an official TypeSafe or Vercel SDK.

The provider owns the connection; the model is an explicit ID in that provider's catalog. Reuse one provider with several models:

```ts
import { vercel } from 'sysone/providers/vercel';

const gateway = vercel();
const sys = createSysone({ provider: gateway, model: 'typesafe-ai/jev' });
// Another client can reuse gateway with another available evaluation model ID.
```

## Choose an operation

| Need                                     | Use                             | Requests     |
| ---------------------------------------- | ------------------------------- | ------------ |
| Yes / no / uncertain                     | `check(text, "Question?")`      | One          |
| Several questions, one input             | `evaluate(input, questions)`    | One          |
| Keep yes items and review uncertain ones | `partition(items, "Question?")` | One per item |
| Keep only yes items                      | `filter(items, "Question?")`    | One per item |
| Sort against a descriptive scale         | `rank(items, rubric)`           | One per item |

`check` returns an object: read `result.decision`, not the truthiness of the result itself. Network errors throw; they never become `uncertain`.

[Executable routing and RAG recipes](examples/recipes) · [Try the recipes on the site](https://sysone.help/#recipes).

## Install

The first npm publication is awaiting maintainer authentication. The same package is available as a GitHub release asset:

```sh
npm install https://github.com/sysone-help/sysone/releases/download/v0.5.0/sysone-0.5.0.tgz
```

Once published to the registry:

```sh
npm install sysone
```

Node.js 22+ and ESM. Set `TYPESAFE_API_KEY` on your server. The Vercel adapter uses `AI_GATEWAY_API_KEY` and native fetch; no additional packages are needed. See the [complete library reference](packages/sysone/README.md).

See [open evaluation models and compatibility](research/open-evaluation-models.md) for OpenJev, Bespoke Nimble and Kotoba. The HTTP adapter is contract-tested; open model GPU inference has not been tested by this project.

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

## Repository

| Directory           | Purpose                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `packages/sysone`   | Published library, declarations, adapter and contract tests                    |
| `site`              | Educational website and interactive playground                                 |
| `api`               | Shared playground endpoint; fixed model, bounded input, server-side credential |
| `.github/workflows` | Continuous integration and release automation                                  |

```sh
npm ci
npm run check
npm run dev
```

The site uses Vite. The development proxy expects the API at `127.0.0.1:3101`; `npm run dev:api` runs the local endpoint. Configure your own `AI_GATEWAY_API_KEY` in the API process. No credentials are needed for tests or builds.

The hosted endpoint is limited to 6,000 input characters, one question per request, and 20 requests/minute/IP using Vercel Firewall. The repository does not contain the production credential. The spending limit belongs to the configured provider account. Website source and examples do not intentionally persist submitted text.

## Development status

Current release: `0.5.0`. Cloudflare and OpenRouter adapters are possible future integrations; they are not advertised as implemented. No benchmark or universal calibration claim is made. Test your application rules against representative data.

MIT © Sysone contributors.
