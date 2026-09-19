# Sysone

**Typed decisions for TypeScript.** Ask a question, inspect the evidence, keep control of what happens next.

[Playground & docs](https://sysone.help) · [Library reference](packages/sysone/README.md) · [Contributing](CONTRIBUTING.md)

```ts
import { createSysone, predicate } from 'sysone';
import { typesafe } from 'sysone/providers/typesafe';

const sys = createSysone({ model: typesafe() });
const needsReply = predicate('Does this message need a reply?');

const result = await sys.check('Can you send the proposal?', needsReply);
// { decision: 'yes' | 'no' | 'uncertain', probability, metadata }
```

`predicate`, `classifier` and `rubric` define reusable questions. `check`, `evaluate`, `filter`, `partition` and `rank` execute them. Definitions are pure data; requests are explicit, cancellable, and never retried automatically.

The first model integration is [Jev](https://docs.typesafe.ai), through TypeSafe and Vercel AI Gateway. The library is designed around evaluation models, independently of the provider. This is an independent project, not an official TypeSafe or Vercel SDK.

## Install

```sh
npm install sysone
```

Node.js 22+ and ESM. Set `TYPESAFE_API_KEY` on your server. The Vercel adapter additionally needs the pinned optional peers `ai@7.0.105` and `@ai-sdk/gateway@4.0.85` and `AI_GATEWAY_API_KEY`. See the [complete library reference](packages/sysone/README.md).

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

First public release: `0.1.0`. Cloudflare and OpenRouter adapters are possible future integrations; they are not advertised as implemented. No benchmark or universal calibration claim is made. Test your application rules against representative data.

MIT © Sysone contributors.
