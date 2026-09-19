import { readFile, writeFile } from 'node:fs/promises';
const snippets = {};
for (const name of ['native', 'sysone']) {
  snippets[name] = (
    await readFile(new URL(`../examples/compare/${name}.ts`, import.meta.url), 'utf8')
  ).trim();
}
await writeFile(
  new URL('../site/src/comparison.json', import.meta.url),
  JSON.stringify(snippets, null, 2) + '\n',
);
