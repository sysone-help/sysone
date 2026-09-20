import * as React from 'react';
import { readFile, writeFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { App } from '../site/src/App.js';

const root = new URL('../site/dist/', import.meta.url);
const template = await readFile(new URL('index.html', root), 'utf8');
for (const page of ['home', 'docs'] as const) {
  const rendered = renderToString(<App page={page} />);
  let html = template.replace('<div id="root"></div>', `<div id="root">${rendered}</div>`);
  if (page === 'docs') {
    html = html
      .replace(
        '<title>Sysone — Jev by TypeSafe, in TypeScript</title>',
        '<title>Sysone — API documentation</title>',
      )
      .replace(
        'rel="canonical" href="https://sysone.help"',
        'rel="canonical" href="https://sysone.help/docs"',
      )
      .replace(
        'property="og:url" content="https://sysone.help"',
        'property="og:url" content="https://sysone.help/docs"',
      );
  }
  await writeFile(new URL(page === 'home' ? 'index.html' : 'docs.html', root), html);
}
