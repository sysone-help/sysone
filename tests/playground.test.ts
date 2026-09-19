import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCriteria, scenarios } from '../site/src/examples.js';

test('all supplied scenarios fit the hosted playground contract', () => {
  for (const scenario of scenarios) {
    assert.ok(scenario.input.length > 0 && scenario.input.length <= 6000);
    assert.ok(scenario.instructions.length > 0 && scenario.instructions.length <= 500);
    if (scenario.mode !== 'predicate') assert.ok(parseCriteria(scenario.mode, scenario.criteria));
  }
});
test('criteria editor rejects requests the hosted endpoint cannot accept', () => {
  for (const value of [
    'a: one',
    'a: one\na: two',
    'a: one\nb:',
    `${'x'.repeat(41)}: one\nb: two`,
    'a: one\nb: ' + 'x'.repeat(301),
  ])
    assert.throws(() => parseCriteria('classifier', value));
  for (const value of ['', 'Only one', 'a\nb\nc\nd\ne\nf', 'a\n' + 'x'.repeat(301)])
    assert.throws(() => parseCriteria('rubric', value));
  assert.deepEqual(parseCriteria('classifier', 'a: link: https://example.org\nb: other'), {
    a: 'link: https://example.org',
    b: 'other',
  });
});
