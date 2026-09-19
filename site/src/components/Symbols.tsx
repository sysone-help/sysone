import * as React from 'react';
export function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M10 10h12M10 16h8M10 22h12"
        stroke="var(--paper)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="23" cy="16" r="1.5" fill="#d6ffaf" />
    </svg>
  );
}
export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
