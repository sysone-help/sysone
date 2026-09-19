import * as React from 'react';
import { useEffect, useState } from 'react';
import { Playground } from './components/Playground';
import { Reference } from './components/Reference';
import { releaseUrl } from './release';
import size from '../../packages/sysone/size.json';
const repo = 'https://github.com/sysone-help/sysone';

export function App() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Sysone home">
          <span className="brand-mark" aria-hidden="true">
            s₁
          </span>
          sysone<span className="version">0.4.0</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#playground">Playground</a>
          <a href="#docs">API</a>
          <a href="#models">Models</a>
          <a href={repo}>GitHub ↗</a>
          <button
            className="theme-button"
            aria-label={`Theme: ${theme}. Change theme.`}
            onClick={() =>
              setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system')
            }
          >
            {theme === 'system' ? '◐' : theme === 'dark' ? '◑' : '○'}
          </button>
        </nav>
      </header>
      <main id="main">
        <div className="project-description">
          <h1>Evaluation models, in TypeScript.</h1>
          <p>
            Define a condition, a set of labels, or a rubric. Inspect the evidence before using it
            in code.
          </p>
          <p className="library-footprint">
            <strong>Zero dependencies.</strong> {(size.bundles.all.gzipBytes / 1000).toFixed(1)} kB
            min+gzip, including all providers. <a href="#size">See the numbers ↗</a>
          </p>
        </div>
        <Playground />
        <Reference />
        <details id="privacy" className="privacy section-anchor">
          <summary>Playground data &amp; limits</summary>
          <p>
            The public playground runs Jev through Vercel AI Gateway using a server-side key. Text
            is sent to Vercel and TypeSafe. The app does not persist input or results;
            infrastructure and provider retention policies apply. Requests are limited to 6,000
            input characters, one question, and 20 requests/minute/IP. This is an independent
            project.
          </p>
          <p>
            <a href="https://vercel.com/legal/privacy-policy">Vercel privacy</a> ·{' '}
            <a href="https://typesafe.ai/legal/privacy-policy">TypeSafe privacy</a>
          </p>
        </details>
      </main>
      <footer>
        <span>sysone / MIT</span>
        <div>
          <a href={releaseUrl}>Releases</a>
          <a href={`${repo}/issues`}>Issues</a>
          <a href={`${repo}/blob/main/LICENSE`}>License</a>
          <a href="#privacy">Data policy</a>
        </div>
      </footer>
    </>
  );
}
