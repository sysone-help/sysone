import { SysoneError } from '../errors.js';
import type { EvaluationModel } from '../types.js';
import { systemOne } from './system-one.js';

export interface TypeSafeOptions {
  readonly apiKey?: string;
  readonly fetch?: typeof globalThis.fetch;
}

/** Access Jev through TypeSafe's native System One endpoint. */
export function typesafe(modelId = 'jev-latest', options: TypeSafeOptions = {}): EvaluationModel {
  return {
    provider: 'typesafe',
    modelId,
    async evaluate(request, call) {
      const apiKey =
        options.apiKey ??
        (typeof process !== 'undefined' ? process.env.TYPESAFE_API_KEY : undefined);
      if (!apiKey)
        throw new SysoneError(
          'Set TYPESAFE_API_KEY or pass apiKey to typesafe().',
          'CONFIGURATION',
        );
      return systemOne(modelId, {
        baseURL: 'https://api.typesafe.ai/v1',
        provider: 'typesafe',
        apiKey,
        fetch: options.fetch,
        rounding: { probabilityDecimals: 2, scoreDecimals: 2 },
      }).evaluate(request, call);
    },
  };
}
