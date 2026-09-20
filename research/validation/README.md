# Open models: real inference checks

Tested September 19, 2026 with Sysone 0.5.0. These are small integration checks using actual model answers, not a benchmark or evidence of parity with Jev. The shared sysone.help playground still uses Jev through Vercel.

| Model                    | What actually ran                                                                                       | Result                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kotoba Open-Jev DeBERTa  | Downloaded weights, CPU inference, local Python → System One HTTP bridge → `customProvider()` → Sysone  | All six operations executed. Six English/Portuguese inputs; boolean and category checks passed. Scores and explicit boolean criteria exposed weaknesses. |
| Bespoke Nimble 9B        | Live Hugging Face Gradio demo → an experimental provider in the validation script → Sysone `evaluate()` | Two inputs × three answer types passed. Further calls hit the public ZeroGPU quota. The native System One service returned HTTP 503.                     |
| OpenJev / DiffusionGemma | Source inspection, hardware check and hosted login attempt                                              | **Inference not confirmed.** Local GPU has 8 GB; upstream requires at least 24 GB. Codiv's social sign-in returned HTTP 500.                             |

## Evidence and limitations

[Kotoba raw requests/results](kotoba-results.json), [Nimble raw requests/results](nimble-space-results.json), [Nimble native endpoint health](nimble-systemone-health.json).

The records include elapsed client time, exact prompts, probabilities and failures. `ok: true` means the operation returned a valid result; semantic expectations are recorded separately under `checks`. A round-to-nearest rubric check is only a rough smoke criterion: a score is an expected ordinal index, not a predicted class. Boolean smoke checks use 0.5; Sysone's operational `check()` threshold remains 0.8.

**Kotoba:** six inputs covered refund requests, explicit non-refund outages and optional sales enquiries, in English and Portuguese. All six boolean comparisons and all six category comparisons passed. Expected scores rounded to the intended level in four of six inputs. The optional enquiries received scores around 0.76 and 0.92, despite level 0 being most probable. Broad distributions matter.

Reordering category labels kept the winning `billing` label, but changed its probability from about 0.81 to 0.63. Supplying explicit true/false descriptions returned `uncertain` (P(true) ≈ 0.37) for an obvious refund request. That path is a **quality limitation**, not a confirmed reliable predicate. The bridge represents explicit criteria as two described choice options because the model's native `noul` helper only accepts fixed `no`/`yes` labels.

`partition()` preserved an uncertain item; `filter()` selected the explicit refund request; `rank()` ordered outage, duplicate charge, optional enquiry. There were 17 successful HTTP requests plus one HTTP 400 for oversized state. Three-question calls took roughly 0.4 seconds locally after loading, with CPU inference and eight PyTorch threads. This is not a comparison with hosted GPU latency.

The bridge rejects state over 256 tokenizer tokens before the upstream collator can silently truncate it; the combined state/questions/options limit is 512 tokens. It preserves supplied label keys, ordinal probability indices and the model's distributions without rounding or renormalizing. Duplicate option descriptions are rejected. It is a local validation server, with no authentication, production concurrency or deployment support.

**Nimble:** the two completed inputs were the English refund request and the outage that explicitly rejects a refund. All six smoke expectations passed. Client times were 3,916 ms and 682 ms; these include queue/network time, not just GPU work. A separate preliminary request also succeeded, but is not counted as another unique test input. The subsequent quota errors are preserved; the script now skips remaining cases after a quota error. Portuguese, collection operations and deployment of Nimble's native server remain **untested**.

[Nimble's current source](https://github.com/bespokelabsai/nimble/tree/d2387fc0b32d1173bfc995395c076a25a2a107c9/nimble/serving) already provides System One HTTP serving. It should use `customProvider()` when deployed, but that transport path was **not validated with real inference** here. Its public Modal `/health` and `/v1/models` returned 503, including a later health recheck. A working Gradio demo does not establish availability of the native endpoint.

**OpenJev:** its [documented hardware requirement](https://github.com/razorback16/openjev/tree/91d5005effcf8cc0ecccaa9538ceabbb130fef59) exceeds the local RTX 4060 Ti's 8 GB. [Codiv](https://codiv.ai) advertises hosted access, but the tested login flow stalled; browser resource timing recorded HTTP 500 for `/api/auth/sign-in/social`. No authenticated inference request was possible. This does not prove the model is broken; it leaves the integration unconfirmed.

## Reproduce Kotoba locally

Run these commands from the repository root. Python dependencies are for the separate model process; **the TS package gains no runtime dependencies**. Allow roughly 2 GB for model weights plus the Python environment. `uv` downloads Python 3.12 if needed.

```sh
npm ci
npm run build -w @sysone-help/sysone
uv venv --python 3.12 /tmp/sysone-kotoba-venv
uv pip install --python /tmp/sysone-kotoba-venv/bin/python torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install --python /tmp/sysone-kotoba-venv/bin/python transformers==4.57.6 huggingface-hub==0.36.2 safetensors==0.8.0 numpy==2.5.3 sentencepiece==0.2.2 protobuf==7.36.2
/tmp/sysone-kotoba-venv/bin/python -c 'from huggingface_hub import snapshot_download; snapshot_download("com-kotobalabs/open-jev-deberta-v3-large", revision="19bf9a64815add579fbf6c907bef584d9277a8e4", local_dir="/tmp/sysone-kotoba-model")'
/tmp/sysone-kotoba-venv/bin/python research/validation/kotoba-server.py --model-dir /tmp/sysone-kotoba-model
```

In another terminal, from the repository root:

```sh
node research/validation/run-open-models.mjs kotoba
```

The loader uses the model bundle's Python code. For this run, its `open_jev.py`, `encoder.py` and `schema.py` matched the reviewed [upstream revision](https://github.com/kotoba-lang/typed-decisions/tree/bc5d9b5bdca6c03cbc5e6c42cf6c48051b7f5ca7) byte for byte. Transformers 4.57.6 emitted a Mistral-regex warning for this local DeBERTa bundle; inspection found its detection also matches this saved version. We left the published tokenizer unchanged rather than applying a Mistral-specific transformation to DeBERTa.

Use the same server from your application:

```ts
import { createSysone } from '@sysone-help/sysone';
import { customProvider } from '@sysone-help/sysone/providers/custom';

const sys = createSysone({
  provider: customProvider({ baseURL: 'http://127.0.0.1:8086/v1' }),
  model: 'com-kotobalabs/open-jev-deberta-v3-large',
});

await sys.check('Please refund the duplicate charge.', 'Does the customer request a refund?');
```

## Reproduce hosted checks

```sh
node research/validation/run-open-models.mjs nimble-space
```

This calls the public demo and consumes its quota. It does not install Gradio or add a provider to the published library. The demo has one fixed model; `nimble-latest` in the record is a test alias, not a hosted model selector. Inspected Space revision: [`d5b293fd53504b7e9020e128fe85e2070540721a`](https://huggingface.co/spaces/hugging-apps/bespoke-nimble-9b-demo/tree/d5b293fd53504b7e9020e128fe85e2070540721a). Base revision: `Qwen/Qwen3.5-9B@c202236235762e1c871ad0ccb60c8ee5ba337b9a`. Nimble adapter revision observed before testing: `594dfdcfb6f94e3d0c0db7535180d3c71689169a`; the hosted app loads its adapter from `main`, so this is not a server-attested immutable deployment.

To test your own System One server, set `BASE_URL`, `MODEL` and optionally `OPEN_MODEL_API_KEY` in your environment, then run:

```sh
node research/validation/run-open-models.mjs systemone
```

The script writes `*-results.json` beside itself. It never records authorization headers. The current library build validates returned answer types, label identities, ranges, probability sums and score/distribution consistency. Passing these checks says nothing about model calibration on your workload.
