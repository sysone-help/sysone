export const releaseUrl = 'https://github.com/sysone-help/sysone/releases/tag/v0.2.0';
export const packageUrl =
  'https://github.com/sysone-help/sysone/releases/download/v0.2.0/sysone-0.2.0.tgz';
// Switch after the registry confirms the first publication.
export const npmPublished = false;
export const installCommand = `npm install ${npmPublished ? 'sysone' : packageUrl}`;
