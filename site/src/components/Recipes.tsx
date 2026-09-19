import * as React from 'react';
import { useState } from 'react';
import { Code } from './Code';
import snippets from '../recipes.json';
const recipes = {
  route: {
    label: 'Route a request',
    note: 'Two independent questions in one request. First decide whether to reply, then use a typed team label. Network failures throw; they do not become review decisions.',
  },
  filter: {
    label: 'Filter RAG context',
    note: 'Keep useful passages and uncertain ones separately. Original IDs and order survive. One request per item, with bounded concurrency.',
  },
  rank: {
    label: 'Rank passages',
    note: 'Describe useful levels instead of asking for an arbitrary score. Score each passage against the same question; sort highest first. One request per item.',
  },
};
export function Recipes() {
  const [selected, setSelected] = useState<keyof typeof recipes>('route');
  return (
    <section id="recipes" className="recipes section-anchor">
      <div className="section-top">
        <div>
          <span className="eyebrow">PASTE INTO YOUR APP</span>
          <h2>Small recipes, useful results</h2>
        </div>
        <a href="https://github.com/sysone-help/sysone/tree/main/examples/recipes">Source ↗</a>
      </div>
      <div className="provider-toggle" aria-label="Recipe">
        {Object.entries(recipes).map(([key, recipe]) => (
          <button
            key={key}
            aria-pressed={selected === key}
            onClick={() => setSelected(key as keyof typeof recipes)}
          >
            {recipe.label}
          </button>
        ))}
      </div>
      <p>{recipes[selected].note}</p>
      <Code label={`${selected}.ts · AI_GATEWAY_API_KEY on your server`}>{snippets[selected]}</Code>
      <p className="doc-note">
        Import and call the exported function in your app. Client and definitions are reusable.
        These recipes use the library's 30-second per-request timeout. Collections stop scheduling
        after a failure; already running requests may finish.
      </p>
    </section>
  );
}
