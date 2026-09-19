import type { IncomingHttpHeaders } from 'node:http';

export interface ApiRequest {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
}
export interface ApiResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
}
