import assert from 'node:assert/strict';
import test from 'node:test';
import { classifier, createSysone, predicate, rubric } from '../src/index.js';
import { typesafe } from '../src/providers/typesafe.js';
import { vercel } from '../src/providers/vercel.js';

test('TypeSafe translates boolean and preserves native confidence/version', async () => {
  let captured: Record<string, unknown> = {};
  const mockFetch: typeof fetch = async (url, options) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer test-only');
    captured = JSON.parse(String(options?.body));
    return Response.json({
      model: 'jev-1.13.0',
      answers: {
        reply: { type: 'noul', noul: 0.9 },
        team: {
          type: 'choice',
          choice: 'support',
          confidence: 0.7,
          probabilities: { support: 0.9, other: 0.1 },
        },
        urgency: { type: 'score', score: 1.2, probabilities: { 0: 0.1, 1: 0.6, 2: 0.3 } },
      },
      usage: { input_tokens: 99, output_tokens: 12 },
    });
  };
  const sys = createSysone({
    model: 'jev-1.13.0',
    provider: typesafe({ apiKey: 'test-only', fetch: mockFetch }),
  });
  const result = await sys.evaluate('Help', {
    reply: predicate('Needs a reply?'),
    team: classifier({ support: 'Help', other: 'Other' }),
    urgency: rubric('Urgency', ['low', 'medium', 'high']),
  });
  assert.equal((captured.questions as Record<string, { type: string }>).reply?.type, 'noul');
  assert.equal(result.answers.reply.probability, 0.9);
  assert.equal(result.answers.team.confidence, 0.7);
  assert.equal(result.metadata.resolvedModel, 'jev-1.13.0');
  assert.equal(result.metadata.usage?.inputTokens, 99);
});
test('TypeSafe tolerates declared rounding and does not renormalize it', async () => {
  const sys = createSysone({
    model: 'jev-latest',
    provider: typesafe({
      apiKey: 'test-only',
      fetch: async () =>
        Response.json({
          answers: {
            c: { type: 'choice', choice: 'a', probabilities: { a: 0.34, b: 0.34, c: 0.33 } },
          },
        }),
    }),
  });
  assert.equal(
    (await sys.evaluate('text', { c: classifier({ a: 'a', b: 'b', c: 'c' }) })).answers.c
      .probabilities?.a,
    0.34,
  );
});
test('TypeSafe errors never expose provider bodies or credentials', async () => {
  const sys = createSysone({
    model: 'jev-latest',
    provider: typesafe({
      apiKey: 'do-not-leak',
      fetch: async () => new Response('do-not-leak', { status: 401 }),
    }),
  });
  await assert.rejects(
    sys.check('text', predicate('test')),
    (error) =>
      error instanceof Error &&
      error.message.includes('401') &&
      !JSON.stringify(error).includes('do-not-leak'),
  );
});
test('Vercel preserves namespaced evidence without interpreting it as a universal confidence', async () => {
  let calls = 0;
  const provider = vercel({
    apiKey: 'test-only',
    fetch: async (url, options) => {
      calls++;
      assert.match(String(url), /evaluation-model$/);
      assert.equal(new Headers(options?.headers).get('ai-model-id'), 'typesafe-ai/jev');
      return Response.json({
        answers: { kind: { type: 'choice', choice: 'a', probabilities: { a: 0.9, b: 0.1 } } },
        warnings: [],
        rounding: { probabilityDecimals: 2 },
        usage: { inputTokens: 10, outputTokens: 0 },
        providerMetadata: { typesafe: { confidence: { kind: 0.7 } } },
      });
    },
  });
  const result = await createSysone({ provider, model: 'typesafe-ai/jev' }).evaluate('text', {
    kind: classifier({ a: 'one', b: 'two' }),
  });
  assert.equal(result.answers.kind.confidence, undefined);
  assert.deepEqual(result.metadata.providerMetadata, { typesafe: { confidence: { kind: 0.7 } } });
  assert.equal(result.metadata.resolvedModel, undefined);
  assert.equal(calls, 1);
});
test('Vercel does not silently retry paid requests', async () => {
  let calls = 0;
  const provider = vercel({
    apiKey: 'test-only',
    fetch: async () => {
      calls++;
      return new Response('failure', { status: 500 });
    },
  });
  await assert.rejects(
    createSysone({ provider, model: 'typesafe-ai/jev' }).check('text', predicate('test')),
  );
  assert.equal(calls, 1);
});

test('one Vercel provider serves concurrent models without leaking selection or metadata', async () => {
  // These model IDs are fixtures, not claims about the live Gateway catalog.
  const models = ['test-lab/first', 'other-lab/second'];
  const seen: string[] = [];
  const provider = vercel({
    apiKey: 'shared-credential',
    fetch: async (_url, options) => {
      const headers = new Headers(options?.headers);
      const model = headers.get('ai-model-id')!;
      seen.push(model);
      assert.equal(headers.get('authorization'), 'Bearer shared-credential');
      if (model === models[0]) await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({
        answers: { result: { type: 'boolean', probability: model === models[0] ? 0.9 : 0.1 } },
        warnings: [],
        providerMetadata: { [model]: { metric: model === models[0] ? 'entropy' : 'margin' } },
      });
    },
  });
  const results = await Promise.all(
    models.map((model) =>
      createSysone({ provider, model }).check('Same text', predicate('Same question?')),
    ),
  );
  assert.deepEqual(seen.sort(), [...models].sort());
  assert.deepEqual(
    results.map((result) => result.decision),
    ['yes', 'no'],
  );
  for (const [index, result] of results.entries()) {
    assert.equal(result.metadata.provider, 'vercel');
    assert.equal(result.metadata.requestedModel, models[index]);
    assert.equal(result.metadata.resolvedModel, undefined);
    assert.deepEqual(Object.keys(result.metadata.providerMetadata!), [models[index]]);
  }
});

test('TypeSafe receives each explicitly selected model through one provider', async () => {
  const seen: string[] = [];
  const provider = typesafe({
    apiKey: 'test-only',
    fetch: async (_url, options) => {
      const request = JSON.parse(String(options?.body));
      seen.push(request.model);
      return Response.json({
        model: request.model,
        answers: { result: { type: 'noul', noul: 0.9 } },
      });
    },
  });
  for (const model of ['jev-latest', 'jev-1.13.0']) {
    const result = await createSysone({ provider, model }).check('text', predicate('Reply?'));
    assert.equal(result.metadata.requestedModel, model);
    assert.equal(result.metadata.provider, 'typesafe');
  }
  assert.deepEqual(seen, ['jev-latest', 'jev-1.13.0']);
});

test('Vercel native HTTP sends the evaluation contract without SDK headers or model defaults', async () => {
  const provider = vercel({
    apiKey: 'fixture-key',
    fetch: async (url, options) => {
      assert.equal(url, 'https://ai-gateway.vercel.sh/v4/ai/evaluation-model');
      const headers = new Headers(options?.headers);
      assert.equal(headers.get('ai-model-id'), 'fixture-lab/evaluator');
      assert.equal(headers.get('ai-gateway-protocol-version'), '0.0.1');
      assert.equal(headers.get('ai-evaluation-model-specification-version'), '4');
      assert.equal(headers.get('ai-gateway-auth-method'), 'api-key');
      assert.equal(headers.get('authorization'), 'Bearer fixture-key');
      assert.equal(headers.has('user-agent'), false);
      assert.deepEqual(JSON.parse(String(options?.body)), {
        state: 'Hello',
        questions: { result: { type: 'boolean', instructions: 'Greeting?' } },
      });
      return Response.json(
        {
          answers: { result: { type: 'boolean', probability: 0.9 } },
          usage: { inputTokens: 9, outputTokens: 0 },
        },
        { headers: { 'x-request-id': 'fixture-request' } },
      );
    },
  });
  const result = await createSysone({ provider, model: 'fixture-lab/evaluator' }).check(
    'Hello',
    predicate('Greeting?'),
  );
  assert.equal(result.metadata.requestId, 'fixture-request');
  assert.equal(result.metadata.usage?.inputTokens, 9);
});

test('native Vercel parsing rejects malformed evidence and metadata without exposing bodies', async () => {
  const valid = { result: { type: 'boolean', probability: 0.9 } };
  for (const body of [
    { answers: { result: { type: 'boolean', probability: 2 } } },
    { answers: {} },
    { answers: valid, rounding: [] },
    { answers: valid, rounding: { probabilityDecimals: '2' } },
    { answers: valid, usage: { inputTokens: -1 } },
    { answers: valid, providerMetadata: { vendor: 42 } },
  ]) {
    const sys = createSysone({
      provider: vercel({ apiKey: 'never-echo', fetch: async () => Response.json(body) }),
      model: 'fixture',
    });
    await assert.rejects(sys.check('text', predicate('Test?')), { code: 'INVALID_RESPONSE' });
  }
  for (const response of [
    new Response('never-echo', { status: 403 }),
    new Response('never-echo'),
  ]) {
    const sys = createSysone({
      provider: vercel({ apiKey: 'never-echo', fetch: async () => response }),
      model: 'fixture',
    });
    await assert.rejects(
      sys.check('text', predicate('Test?')),
      (error) => error instanceof Error && !JSON.stringify(error).includes('never-echo'),
    );
  }
});

test('native Vercel transport preserves abort reasons during fetch and JSON reading', async () => {
  for (const stage of ['fetch', 'body']) {
    const controller = new AbortController();
    const reason = new Error('caller cancellation');
    const provider = vercel({
      apiKey: 'fixture-only',
      fetch: async (_url, options) => {
        assert.equal(options?.signal, controller.signal);
        if (stage === 'fetch') {
          controller.abort(reason);
          throw reason;
        }
        const response = new Response('{}');
        response.json = async () => {
          controller.abort(reason);
          throw reason;
        };
        return response;
      },
    });
    await assert.rejects(
      provider.evaluate(
        { model: 'fixture', state: 'text', questions: { result: predicate('Test?') } },
        { signal: controller.signal },
      ),
      (error) => error === reason,
    );
  }
});
