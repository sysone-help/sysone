export const releaseUrl = 'https://github.com/sysone-help/sysone/releases/tag/v0.5.1';
export const packageUrl =
  'https://github.com/sysone-help/sysone/releases/download/v0.5.1/sysone-help-0.5.1.tgz';
// Switch after the registry confirms the first publication.
export const npmPublished = false;
export const installCommand = `npm install ${npmPublished ? 'sysone-help' : packageUrl}`;
