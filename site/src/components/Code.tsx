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
        <code>
          {label === 'Terminal'
            ? children
            : children
                .split(
                  /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\b(?:import|from|const|let|await|if|else|return|async|function|true|false|undefined|type|interface|new)\b|\b\d+(?:\.\d+)?\b)/g,
                )
                .map((part, index) => {
                  const kind = part.startsWith('//')
                    ? 'comment'
                    : /^['"]/.test(part)
                      ? 'string'
                      : /^\d/.test(part)
                        ? 'number'
                        : /^(import|from|const|let|await|if|else|return|async|function|true|false|undefined|type|interface|new)$/.test(
                              part,
                            )
                          ? 'keyword'
                          : null;
                  return kind ? (
                    <span key={index} className={`token-${kind}`}>
                      {part}
                    </span>
                  ) : (
                    part
                  );
                })}
        </code>
      </pre>
    </div>
  );
}
