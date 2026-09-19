import assert from 'node:assert/strict';
import { build, version as esbuildVersion } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageURL = new URL('../packages/sysone/package.json', import.meta.url);
const reportURL = new URL('../packages/sysone/size.json', import.meta.url);
const pkg = JSON.parse(await readFile(packageURL, 'utf8'));
for (const field of [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundledDependencies',
]) {
  assert.equal(Object.keys(pkg[field] ?? {}).length, 0, `The library must have no ${field}.`);
}
const cases = {
  core: { providers: [], budget: 2800 },
  typesafe: { providers: ['typesafe'], budget: 3800 },
  vercel: { providers: ['vercel'], budget: 3500 },
  systemOne: { providers: ['system-one'], budget: 3700 },
  all: { providers: ['typesafe', 'vercel', 'system-one'], budget: 4000 },
};
const bundles = {};
for (const [name, { providers, budget }] of Object.entries(cases)) {
  const result = await build({
    stdin: {
      contents: [
        'export * from "./packages/sysone/dist/index.js";',
        ...providers.map(
          (provider) => `export * from "./packages/sysone/dist/providers/${provider}.js";`,
        ),
      ].join('\n'),
      resolveDir: root,
    },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    write: false,
    metafile: true,
    logOverride: { 'ignored-bare-import': 'silent' },
  });
  assert.ok(
    Object.keys(result.metafile.inputs).every((path) => !path.includes('node_modules')),
    'No third-party code may be bundled.',
  );
  assert.ok(
    Object.values(result.metafile.outputs).every((output) => output.imports.length === 0),
    'The bundle must be self-contained.',
  );
  const code = result.outputFiles[0].contents;
  bundles[name] = { minifiedBytes: code.length, gzipBytes: gzipSync(code, { level: 9 }).length };
  assert.ok(bundles[name].gzipBytes <= budget, `${name} exceeded its ${budget}-byte gzip budget.`);
}
const report = { version: pkg.version, esbuild: esbuildVersion, gzipLevel: 9, bundles };
const sizeBlock = [
  '<!-- size:start -->',
  `**Zero dependencies. ${(bundles.all.gzipBytes / 1000).toFixed(1)} kB min+gzip, including all providers.**`,
  '',
  '| Included JavaScript | Minified | Minified + gzip |',
  '| --- | ---: | ---: |',
  ...Object.entries(bundles).map(
    ([name, size]) =>
      `| ${{ core: 'Core', typesafe: 'Core + TypeSafe', vercel: 'Core + Vercel', systemOne: 'Core + System One HTTP', all: 'Core + all providers' }[name]} | ${size.minifiedBytes.toLocaleString('en-US')} B | ${size.gzipBytes.toLocaleString('en-US')} B |`,
  ),
  '',
  `Measured on ${pkg.version} with all core exports retained, esbuild ${esbuildVersion}, ESM/ES2022 and gzip level 9. Bundle sizes exclude types/docs and are not the package download size. No third-party runtime code is bundled.`,
  '',
  '[Reproduce the measurement](https://github.com/sysone-help/sysone/blob/main/scripts/package-size.mjs): `npm run build && npm run size`. CI enforces a 4,000-byte gzip budget for the complete bundle. Build/test tools belong to the private workspace, not your installation.',
  '<!-- size:end -->',
].join('\n');
if (process.argv.includes('--write')) {
  await writeFile(reportURL, JSON.stringify(report, null, 2) + '\n');
  for (const file of ['README.md', 'packages/sysone/README.md']) {
    const url = new URL('../' + file, import.meta.url);
    const content = await readFile(url, 'utf8');
    assert.ok(content.includes('<!-- size:start -->'), 'Missing README size marker.');
    await writeFile(
      url,
      content.replace(/<!-- size:start -->[\s\S]*?<!-- size:end -->/, sizeBlock),
    );
  }
} else
  assert.deepEqual(
    JSON.parse(await readFile(reportURL, 'utf8')),
    report,
    'Size report is stale; run npm run size:write.',
  );
if (!process.argv.includes('--write')) {
  for (const file of ['README.md', 'packages/sysone/README.md']) {
    const content = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    const block = content.match(/<!-- size:start -->[\s\S]*?<!-- size:end -->/)?.[0];
    assert.equal(
      block?.replace(/\s/g, '').replace(/-{3,}/g, '---'),
      sizeBlock.replace(/\s/g, '').replace(/-{3,}/g, '---'),
      `${file} size claims are stale; run npm run size:write.`,
    );
  }
}
console.table(bundles);
console.log(
  'Every case includes all core exports. Sizes are minified ESM and gzip bytes, excluding types/docs.',
);
