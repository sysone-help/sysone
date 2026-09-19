import * as React from 'react';
import { readFile, writeFile } from 'node:fs/promises';
import { renderToString } from 'react-dom/server';
import { App } from '../site/src/App.js';

const filename = new URL('../site/dist/index.html', import.meta.url);
const html = await readFile(filename, 'utf8');
const rendered = renderToString(<App />);
await writeFile(
  filename,
  html.replace('<div id="root"></div>', `<div id="root">${rendered}</div>`),
);
