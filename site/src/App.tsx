import * as React from 'react';
import { useEffect, useState } from 'react';
import { Playground } from './components/Playground';
import { Recipes } from './components/Recipes';
import { Reference } from './components/Reference';
import { releaseUrl } from './release';
import size from '../../packages/sysone/size.json';
const repo = 'https://github.com/sysone-help/sysone';

export function App({ page = 'home' }: { page?: 'home' | 'docs' }) {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (page !== 'home') return;
    const moveLegacyLink = () => {
      const id = window.location.hash.slice(1);
      if (
        [
          'docs',
          'installation',
          'size',
          'choose',
          'definitions',
          'collections',
          'providers',
          'models',
          'behavior',
          'recipes',
        ].includes(id)
      ) {
        window.location.replace(`/docs#${id}`);
      }
    };
    moveLegacyLink();
    window.addEventListener('hashchange', moveLegacyLink);
    return () => window.removeEventListener('hashchange', moveLegacyLink);
  }, [page]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`site-header${page === 'home' ? ' home-header' : ''}`}>
        <a className="brand" href="/" aria-label="Sysone home">
          <span className="brand-mark" aria-hidden="true">
            s₁
          </span>
          sysone
        </a>
        <nav aria-label="Main navigation">
          {page === 'docs' && <a href="/">Playground</a>}
          <a href="/docs" aria-current={page === 'docs' ? 'page' : undefined}>
            Docs
          </a>
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
      <main id="main" className={page === 'home' ? 'home-page' : 'docs-page'}>
        {page === 'home' ? (
          <>
            <div className="project-description">
              <h1>Turn text into decisions.</h1>
              <p>
                A tiny TypeScript library for AI checks, categories and scores.
                <br />
                Try an example. Change the text. See what happens.
              </p>
            </div>
            <Playground />
            <p className="library-footprint">
              <a href="/docs#size">
                Zero dependencies · {(size.bundles.all.gzipBytes / 1000).toFixed(1)} kB gzip
              </a>
              <span>MIT · Open source</span>
            </p>
          </>
        ) : (
          <>
            <Reference />
            <Recipes />
          </>
        )}
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
      <footer className={page === 'home' ? 'home-footer' : undefined}>
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
