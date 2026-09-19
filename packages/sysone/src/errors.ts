export class SysoneError extends Error {
  override readonly name = 'SysoneError';
  constructor(message: string, readonly code: 'INVALID_INPUT' | 'INVALID_RESPONSE' | 'CONFIGURATION' | 'PROVIDER_ERROR', options?: ErrorOptions) {
    super(message, options);
  }
}
