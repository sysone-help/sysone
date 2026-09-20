import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'sysone-package-'));
try {
  const pkg = JSON.parse(
    await readFile(new URL('../packages/sysone/package.json', import.meta.url)),
  );
  execFileSync('npm', ['pack', '--workspace', pkg.name, '--pack-destination', directory], {
    stdio: 'pipe',
  });
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  // A normal install must bring in only sysone, without special omit/legacy-peer flags.
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      join(directory, `${pkg.name.replace(/^@/, '').replace('/', '-')}-${pkg.version}.tgz`),
    ],
    { cwd: directory, stdio: 'pipe' },
  );
  const lock = JSON.parse(await readFile(join(directory, 'package-lock.json'), 'utf8'));
  assert.deepEqual(Object.keys(lock.packages).sort(), ['', `node_modules/${pkg.name}`]);
  const installed = JSON.parse(
    await readFile(join(directory, `node_modules/${pkg.name}/package.json`), 'utf8'),
  );
  for (const field of [
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'bundledDependencies',
  ])
    assert.equal(Object.keys(installed[field] ?? {}).length, 0);
  await writeFile(
    join(directory, 'consumer.mjs'),
    `
import assert from 'node:assert/strict';
import { createSysone, predicate, SysoneError } from 'sysone-help';
import { typesafe } from 'sysone-help/providers/typesafe';
import { vercel } from 'sysone-help/providers/vercel';
import { customProvider } from 'sysone-help/providers/custom';
const nativeFetch = async () => Response.json({ answers: { result: { type: 'noul', noul: 0.9 } } });
const providers = [
  typesafe({ apiKey: 'fixture-only', fetch: nativeFetch }),
  customProvider({ baseURL: 'http://localhost:8080/v1', fetch: nativeFetch }),
  vercel({ apiKey: 'fixture-only', fetch: async () => Response.json({ answers: { result: { type: 'boolean', probability: 0.9 } } }) }),
];
for (const provider of providers) {
  const result = await createSysone({ provider, model: 'fixture-model' }).check('Hello', predicate('Greeting?'));
  assert.equal(result.decision, 'yes');
}
const failing = vercel({ apiKey: 'fixture-only', fetch: async () => new Response('failure', { status: 500 }) });
await assert.rejects(createSysone({ provider: failing, model: 'fixture' }).check('Hi', predicate('Greeting?')), SysoneError);
`,
  );
  execFileSync(process.execPath, [join(directory, 'consumer.mjs')], { stdio: 'pipe' });
  console.log(
    'Normal install contains only sysone. All three providers work with zero external packages.',
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
