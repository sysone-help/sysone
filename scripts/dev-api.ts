import { createServer } from 'node:http';
import handler from '../api/evaluate.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

createServer(async (req, res) => {
  if (req.url !== '/api/evaluate') { res.writeHead(404).end(); return; }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 20_000) { res.writeHead(413).end(); return; }
  }
  const request = Object.assign(req, { body });
  const response = Object.assign(res, {
    status(code: number) { res.statusCode = code; return response; },
    json(value: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return response; },
  });
  await handler(request as VercelRequest, response as unknown as VercelResponse);
}).listen(3101, '127.0.0.1', () => { process.stdout.write('Playground API: http://127.0.0.1:3101\n'); });
