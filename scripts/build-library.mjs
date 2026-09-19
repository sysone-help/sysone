import { build } from 'esbuild';
import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../packages/sysone/', import.meta.url));
await rm(new URL('../packages/sysone/dist/', import.meta.url), { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url)),
    '-p',
    'tsconfig.build.json',
    '--emitDeclarationOnly',
  ],
  { cwd: root, stdio: 'inherit' },
);
const result = await build({
  absWorkingDir: root,
  entryPoints: [
    'src/index.ts',
    'src/providers/typesafe.ts',
    'src/providers/vercel.ts',
    'src/providers/system-one.ts',
  ],
  outbase: 'src',
  outdir: 'dist',
  chunkNames: 'shared/[hash]',
  bundle: true,
  splitting: true,
  minify: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  metafile: true,
});
for (const path of Object.keys(result.metafile.inputs)) {
  if (!path.startsWith('src/')) throw new Error(`Unexpected bundled dependency: ${path}`);
}
for (const output of Object.values(result.metafile.outputs)) {
  if (output.imports.some((item) => item.external))
    throw new Error('Published runtime must not import external modules.');
}
