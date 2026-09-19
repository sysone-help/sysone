import assert from 'node:assert/strict';
import test from 'node:test';
import { classifier, createSysone, predicate, rubric, SysoneError } from '../src/index.js';
import type { Answer, EvaluationProvider, EvaluationRequest } from '../src/index.js';

const question = predicate('Does this need a reply?');
function fixture(answer: Answer | ((request: EvaluationRequest) => Answer)): EvaluationProvider {
  return {
    id: 'fixture',
    async evaluate(request) {
      return {
        answers: Object.fromEntries(
          Object.keys(request.questions).map((id) => [
            id,
            typeof answer === 'function' ? answer(request) : answer,
          ]),
        ),
        metadata: { provider: 'fixture', requestedModel: request.model },
      };
    },
  };
}

test('check keeps uncertainty and handles both threshold boundaries', async () => {
  for (const [p, decision] of [
    [0.85, 'yes'],
    [0.15, 'no'],
    [0.5, 'uncertain'],
    [0.849, 'uncertain'],
  ] as const) {
    const sys = createSysone({
      model: 'test',
      provider: fixture({ type: 'boolean', probability: p }),
    });
    assert.equal((await sys.check('email', question, { minProbability: 0.85 })).decision, decision);
  }
});
test('invalid policy makes no request, including empty collections', async () => {
  const provider = fixture({ type: 'boolean', probability: 0.9 });
  provider.evaluate = async () => {
    assert.fail('must validate first');
  };
  const sys = createSysone({ provider, model: 'test' });
  await assert.rejects(sys.check('email', question, { minProbability: 0.5 }), /minProbability/);
  await assert.rejects(sys.partition([], question, { minProbability: NaN }), /minProbability/);
  await assert.rejects(sys.filter([], question, { concurrency: 0 }), /concurrency/);
});
test('partition preserves identities and order; filter includes only yes', async () => {
  const items = [
    { id: 1, text: '0.9' },
    { id: 2, text: '0.1' },
    { id: 3, text: '0.5' },
    { id: 4, text: '0.99' },
  ];
  const sys = createSysone({
    model: 'test',
    provider: fixture((r) => ({ type: 'boolean', probability: Number(r.state) })),
  });
  const result = await sys.partition(items, question, { select: (x) => x.text });
  assert.deepEqual(result, { yes: [items[0], items[3]], no: [items[1]], uncertain: [items[2]] });
  assert.equal(result.yes[0], items[0]);
  assert.deepEqual(await sys.filter(items, question, { select: (x) => x.text }), result.yes);
});
test('collections prevalidate every item before spending on inference', async () => {
  let calls = 0;
  const provider = fixture({ type: 'boolean', probability: 0.9 });
  const original = provider.evaluate;
  provider.evaluate = async (...args) => {
    calls++;
    return original(...args);
  };
  const sys = createSysone({ provider, model: 'test' });
  await assert.rejects(sys.filter(['ok', new Date()], question), /dates/);
  assert.equal(calls, 0);
});
test('bounded concurrency and no mutation', async () => {
  let active = 0,
    maximum = 0;
  const provider = fixture({ type: 'boolean', probability: 1 });
  const original = provider.evaluate;
  provider.evaluate = async (...args) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return original(...args);
  };
  const input = Object.freeze(['a', 'b', 'c', 'd', 'e']);
  await createSysone({ provider, model: 'test' }).filter(input, question, { concurrency: 2 });
  assert.equal(maximum, 2);
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e']);
});
test('rank uses an explicit rubric and is stable for equal scores', async () => {
  const sys = createSysone({
    model: 'test',
    provider: fixture((r) => ({ type: 'score', score: Number(r.state) })),
  });
  const ranked = await sys.rank(
    [
      { id: 'a', score: '1' },
      { id: 'b', score: '2' },
      { id: 'c', score: '1' },
    ],
    rubric('Urgency', ['low', 'medium', 'high']),
    { select: (x) => x.score },
  );
  assert.deepEqual(
    ranked.map((x) => x.item.id),
    ['b', 'a', 'c'],
  );
});
test('rejects malformed evidence, missing answers and invalid distributions', async () => {
  const cases: Answer[] = [
    { type: 'boolean', probability: NaN },
    { type: 'boolean', probability: 1.1 },
    { type: 'choice', choice: 'wrong' },
  ];
  for (const answer of cases)
    await assert.rejects(
      createSysone({ model: 'test', provider: fixture(answer) }).check('input', question),
      SysoneError,
    );
  const choice = classifier({ a: 'one', b: 'two' });
  for (const answer of [
    { type: 'choice', choice: 'a', probabilities: { a: 0.1, b: 0.9 } },
    { type: 'choice', choice: 'a', probabilities: { a: 0.8, b: 0.8 } },
  ] satisfies Answer[])
    await assert.rejects(
      createSysone({ model: 'test', provider: fixture(answer) }).evaluate('input', { choice }),
      /evidence/,
    );
  const empty: EvaluationProvider = {
    ...fixture({ type: 'boolean', probability: 1 }),
    async evaluate() {
      return { answers: {}, metadata: { provider: 'fixture', requestedModel: 'test' } };
    },
  };
  await assert.rejects(
    createSysone({ provider: empty, model: 'test' }).check('input', question),
    /exactly/,
  );
});
test('confidence and missing evidence are never fabricated', async () => {
  const sys = createSysone({ model: 'test', provider: fixture({ type: 'choice', choice: 'a' }) });
  const result = await sys.evaluate('input', { kind: classifier({ a: 'one', b: 'two' }) });
  assert.equal(result.answers.kind.confidence, undefined);
  assert.equal(result.answers.kind.probabilities, undefined);
});

test('rejects scores inconsistent with their probability distribution', async () => {
  const sys = createSysone({
    model: 'test',
    provider: fixture({ type: 'score', score: 1.8, probabilities: { 0: 1, 1: 0, 2: 0 } }),
  });
  await assert.rejects(
    sys.evaluate('input', { score: rubric('Quality', ['low', 'medium', 'high']) }),
    /evidence/,
  );
});
test('aborted calls do not reach the provider', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    createSysone({ model: 'test', provider: fixture({ type: 'boolean', probability: 1 }) }).check(
      'input',
      question,
      {
        signal: controller.signal,
      },
    ),
    { name: 'AbortError' },
  );
});
test('definitions are immutable and reject ambiguous criteria', () => {
  const choices = { a: 'first', b: 'second' };
  const definition = classifier(choices);
  choices.a = 'changed';
  assert.equal(definition.criteria.a, 'first');
  assert.ok(Object.isFrozen(definition.criteria));
  assert.throws(() => classifier({ only: 'one' }), /2–255/);
  assert.throws(() => rubric('quality', ['one']), /2–10/);
  assert.throws(() => predicate(' '), /non-empty/);
});
test('network failure is not uncertainty', async () => {
  const provider = fixture({ type: 'boolean', probability: 1 });
  provider.evaluate = async () => {
    throw new Error('unavailable');
  };
  await assert.rejects(
    createSysone({ provider, model: 'test' }).check('input', question),
    /unavailable/,
  );
});

test('client requires an explicit nonempty model before making requests', () => {
  const provider = fixture({ type: 'boolean', probability: 1 });
  provider.evaluate = async () => assert.fail('invalid configuration must not make requests');
  for (const model of ['', '   '])
    assert.throws(() => createSysone({ provider, model }), { code: 'CONFIGURATION' });
  assert.throws(() => Reflect.apply(createSysone, undefined, [{ provider }]), {
    code: 'CONFIGURATION',
  });
  assert.throws(() => Reflect.apply(createSysone, undefined, [{ model: 'test' }]), {
    code: 'CONFIGURATION',
  });
});
