import * as React from 'react';
import { useState } from 'react';

export function Code({ children, label = 'TypeScript' }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <div className="code">
      <div className="code-toolbar">
        <span>{label}</span>
        <button onClick={copy}>
          {copied ? 'Copied ✓' : copyError ? 'Select code to copy' : 'Copy code'}
        </button>
      </div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}
