import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './ui/theme.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';

// Without an update handler the new version simply waits for the next opening.
if (import.meta.env.PROD) registerSW();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
