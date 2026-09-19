import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../api/evaluate.js';

async function request(
  method: string,
  body: unknown,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  let status = 200;
  let result: unknown;
  const response = {
    setHeader() {},
    status(value: number) {
      status = value;
      return response;
    },
    json(value: unknown) {
      result = value;
      return response;
    },
  };
  await handler({ method, body, headers }, response);
  return { status, result };
}

test('playground rejects methods and cross-site browser calls before inference', async () => {
  assert.equal((await request('GET', {})).status, 405);
  assert.equal((await request('POST', {}, { 'content-type': 'text/plain' })).status, 415);
  assert.equal(
    (
      await request(
        'POST',
        {},
        { 'content-type': 'application/json', origin: 'https://unrelated.example' },
      )
    ).status,
    403,
  );
});
test('playground validates size, question types and criteria without paid calls', async () => {
  const original = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'local-fixture-only';
  try {
    const base = { mode: 'predicate', state: 'Message', instructions: 'Question?' };
    assert.equal((await request('POST', { ...base, state: 'x'.repeat(6001) })).status, 400);
    assert.equal((await request('POST', { ...base, instructions: 'x'.repeat(501) })).status, 400);
    assert.equal((await request('POST', { ...base, mode: 'chat' })).status, 400);
    assert.equal(
      (await request('POST', { ...base, mode: 'rubric', criteria: ['only'] })).status,
      400,
    );
    assert.equal(
      (
        await request('POST', {
          ...base,
          mode: 'classifier',
          criteria: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i, 'Description'])),
        })
      ).status,
      400,
    );
    assert.equal((await request('POST', { ...base, extra: 'x'.repeat(13000) })).status, 413);
    assert.equal((await request('POST', '{')).status, 400);
  } finally {
    if (original === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = original;
  }
});
