import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

const root = document.getElementById('root')!;
const app = (
  <React.StrictMode>
    <App page={/^\/docs(?:\.html|\/)?$/.test(window.location.pathname) ? 'docs' : 'home'} />
  </React.StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
