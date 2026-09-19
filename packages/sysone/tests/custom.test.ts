import assert from 'node:assert/strict';
import test from 'node:test';
import { classifier, createSysone, predicate, rubric } from '../src/index.js';
import { customProvider } from '../src/providers/custom.js';

test('System One preserves OpenJev evidence and translates all three question types', async () => {
  const provider = customProvider({
    baseURL: 'http://127.0.0.1:8080/v1/',
    id: 'openjev-local',
    fetch: async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:8080/v1/systemone');
      assert.equal(new Headers(options?.headers).has('authorization'), false);
      assert.deepEqual(JSON.parse(String(options?.body)), {
        model: 'openjev-latest',
        state: { text: 'Help' },
        questions: {
          reply: { type: 'noul', instructions: 'Needs reply?' },
          team: { type: 'choice', instructions: 'Team?', criteria: { a: 'A', b: 'B' } },
          urgency: { type: 'score', instructions: 'Urgency?', criteria: ['low', 'high'] },
        },
      });
      return Response.json(
        {
          model: 'openjev-0.1',
          answers: {
            reply: { type: 'noul', noul: 0.923456789 },
            team: {
              type: 'choice',
              choice: 'a',
              probabilities: { a: 0.75, b: 0.25 },
              confidence: 0.18872187554086717,
            },
            urgency: {
              type: 'score',
              score: 0.123456789,
              probabilities: { 0: 0.876543211, 1: 0.123456789 },
            },
          },
          usage: { input_tokens: 123, output_tokens: 0 },
        },
        { headers: { 'x-request-id': 'req_test' } },
      );
    },
  });
  const result = await createSysone({ provider, model: 'openjev-latest' }).evaluate(
    { text: 'Help' },
    {
      reply: predicate('Needs reply?'),
      team: classifier({ a: 'A', b: 'B' }, 'Team?'),
      urgency: rubric('Urgency?', ['low', 'high']),
    },
  );
  assert.equal(result.answers.reply.probability, 0.923456789);
  assert.equal(result.answers.team.confidence, 0.18872187554086717);
  assert.equal(result.answers.urgency.confidence, undefined);
  assert.deepEqual(result.metadata, {
    provider: 'openjev-local',
    requestedModel: 'openjev-latest',
    resolvedModel: 'openjev-0.1',
    requestId: 'req_test',
    usage: { inputTokens: 123, outputTokens: 0 },
  });
});

test('System One supports explicit auth, custom headers and the caller abort signal', async () => {
  const controller = new AbortController();
  const provider = customProvider({
    baseURL: 'https://example.test/v1',
    apiKey: 'fixture-only',
    headers: { 'x-origin-secret': 'fixture-origin' },
    fetch: async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer fixture-only');
      assert.equal(new Headers(options?.headers).get('x-origin-secret'), 'fixture-origin');
      assert.equal(options?.signal, controller.signal);
      controller.abort();
      throw new Error('transport detail with fixture-only');
    },
  });
  await assert.rejects(
    provider.evaluate(
      { model: 'local-model', state: 'text', questions: { result: predicate('Test?') } },
      { signal: controller.signal },
    ),
    { name: 'AbortError' },
  );
});

test('System One does not assume TypeSafe rounding or repair malformed evidence', async () => {
  const sys = createSysone({
    model: 'local-model',
    provider: customProvider({
      baseURL: 'http://localhost:8080/v1',
      fetch: async () =>
        Response.json({
          answers: {
            team: { type: 'choice', choice: 'a', probabilities: { a: 0.34, b: 0.34, c: 0.33 } },
          },
        }),
    }),
  });
  await assert.rejects(sys.evaluate('text', { team: classifier({ a: 'A', b: 'B', c: 'C' }) }), {
    code: 'INVALID_RESPONSE',
  });
});

test('System One rejects missing answers and redacts server errors', async () => {
  for (const response of [
    Response.json({ answers: {} }),
    new Response('secret-provider-body', { status: 500 }),
  ]) {
    const sys = createSysone({
      model: 'local-model',
      provider: customProvider({
        baseURL: 'http://localhost/v1',
        fetch: async () => response,
      }),
    });
    await assert.rejects(
      sys.check('text', predicate('Test?')),
      (error) => error instanceof Error && !JSON.stringify(error).includes('secret-provider-body'),
    );
  }
});

test('System One rejects malformed or credential-bearing base URLs without echoing them', () => {
  for (const baseURL of [
    'file:///tmp/api',
    'https://user:secret@example.test',
    'https://example.test?key=secret',
    'not-a-url',
  ]) {
    assert.throws(
      () => customProvider({ baseURL }),
      (error) => error instanceof Error && !error.message.includes('secret'),
    );
  }
});

test('one compatible endpoint forwards each model ID independently', async () => {
  const seen: string[] = [];
  const provider = customProvider({
    baseURL: 'http://localhost:8080/v1',
    id: 'local',
    fetch: async (_url, options) => {
      const request = JSON.parse(String(options?.body));
      seen.push(request.model);
      return Response.json({ answers: { result: { type: 'noul', noul: 0.8 } } });
    },
  });
  for (const model of ['fixture-a', 'fixture-b']) {
    const result = await createSysone({ provider, model }).check('text', predicate('Reply?'));
    assert.equal(result.metadata.provider, 'local');
    assert.equal(result.metadata.requestedModel, model);
  }
  assert.deepEqual(seen, ['fixture-a', 'fixture-b']);
});
