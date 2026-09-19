import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'sysone-package-'));
try {
  const pkg = JSON.parse(
    await readFile(new URL('../packages/sysone/package.json', import.meta.url)),
  );
  execFileSync('npm', ['pack', '--workspace', 'sysone', '--pack-destination', directory], {
    stdio: 'pipe',
  });
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--omit=optional',
      join(directory, `sysone-${pkg.version}.tgz`),
    ],
    { cwd: directory, stdio: 'pipe' },
  );
  const root = join(directory, 'node_modules/sysone/dist/');
  const { createSysone, predicate } = await import(pathToFileURL(join(root, 'index.js')));
  const { typesafe } = await import(pathToFileURL(join(root, 'providers/typesafe.js')));
  const sys = createSysone({
    model: typesafe('jev-latest', {
      apiKey: 'local-fixture-only',
      fetch: async () =>
        Response.json({ model: 'jev-1.13.0', answers: { result: { type: 'noul', noul: 0.95 } } }),
    }),
  });
  assert.equal((await sys.check('Hello', predicate('Greeting?'))).decision, 'yes');
  await assert.rejects(access(join(directory, 'node_modules/ai')));
  await assert.rejects(access(join(directory, 'node_modules/@ai-sdk/gateway')));
  process.stdout.write('Packed consumer smoke passed; optional AI SDK peers were not installed.\n');
} finally {
  await rm(directory, { recursive: true, force: true });
}
